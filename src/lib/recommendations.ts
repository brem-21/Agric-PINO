import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { sendRecommendationSMS } from "@/lib/mnotify";

// Built lazily so importing this module (e.g. during `next build` page-data
// collection) never requires OPENROUTER_API_KEY — only actually calling it does.
let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY!,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "Lorgric",
      },
    });
  }
  return client;
}

async function buildUserContext(userId: string) {
  const [user, recentEvents, recentOrders] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        phone: true,
        latitude: true,
        longitude: true,
        role: true,
        region: true,
        district: true,
      },
    }),
    prisma.userEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        listing: { select: { cropType: true, pricePerUnit: true, unit: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { user, recentEvents, recentOrders };
}

async function getNearbyListings(lat: number, lon: number) {
  // Rough bounding box ±0.9° ≈ 100 km then filter precisely
  const listings = await prisma.produceListing.findMany({
    where: {
      status: "ACTIVE",
      approvalStatus: "APPROVED",
      latitude: { gte: lat - 0.9, lte: lat + 0.9 },
      longitude: { gte: lon - 0.9, lte: lon + 0.9 },
    },
    select: {
      id: true,
      cropType: true,
      category: true,
      pricePerUnit: true,
      unit: true,
      quantity: true,
      location: true,
      latitude: true,
      longitude: true,
      images: true,
      farmer: {
        select: {
          name: true,
          phone: true,
          farmerProfile: { select: { farmName: true, rating: true } },
        },
      },
    },
    take: 50,
  });

  // Haversine filter
  return listings
    .filter((l) => {
      if (!l.latitude || !l.longitude) return false;
      const R = 6371;
      const dLat = ((l.latitude - lat) * Math.PI) / 180;
      const dLon = ((l.longitude - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) * Math.cos((l.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return distKm <= 50;
    })
    .map((l) => {
      const R = 6371;
      const dLat = ((l.latitude! - lat) * Math.PI) / 180;
      const dLon = ((l.longitude! - lon) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat * Math.PI) / 180) * Math.cos((l.latitude! * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
      return { ...l, distKm: Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) };
    })
    .sort((a, b) => a.distKm - b.distKm);
}

// Used when the buyer has no known coordinates — GPT-4o still ranks by purchase
// history/behaviour, just without a distance signal.
async function getRecentListings(): Promise<Awaited<ReturnType<typeof getNearbyListings>>> {
  const listings = await prisma.produceListing.findMany({
    where: { status: "ACTIVE", approvalStatus: "APPROVED" },
    select: {
      id: true,
      cropType: true,
      category: true,
      pricePerUnit: true,
      unit: true,
      quantity: true,
      location: true,
      latitude: true,
      longitude: true,
      images: true,
      farmer: {
        select: {
          name: true,
          phone: true,
          farmerProfile: { select: { farmName: true, rating: true } },
        },
      },
    },
    orderBy: { sequence: "desc" },
    take: 30,
  });
  return listings.map((l) => ({ ...l, distKm: 0 }));
}

async function getAIRecommendations(
  user: Awaited<ReturnType<typeof buildUserContext>>["user"],
  recentEvents: Awaited<ReturnType<typeof buildUserContext>>["recentEvents"],
  recentOrders: Awaited<ReturnType<typeof buildUserContext>>["recentOrders"],
  nearbyListings: Awaited<ReturnType<typeof getNearbyListings>>
): Promise<{ listingIds: string[]; message: string }> {
  const eventSummary = recentEvents.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    const data = e.data as Record<string, unknown>;
    if (data.cropType) {
      const crop = String(data.cropType);
      acc[`viewed:${crop}`] = (acc[`viewed:${crop}`] ?? 0) + 1;
    }
    return acc;
  }, {});

  const locationEvents = recentEvents
    .filter((e) => e.type === "location_update")
    .slice(0, 3)
    .map((e) => {
      const d = e.data as Record<string, unknown>;
      return { lat: d.lat, lon: d.lon, ip: e.ip };
    });

  const purchaseHistory = recentOrders.map((o) => ({
    crop: o.listing.cropType,
    qty: o.quantity,
    unit: o.listing.unit,
    price: o.listing.pricePerUnit,
    location: o.listing.location,
  }));

  const listingsSummary = nearbyListings.slice(0, 15).map((l) => ({
    id: l.id,
    crop: l.cropType,
    category: l.category,
    price: `GHS${l.pricePerUnit}/${l.unit}`,
    qty: `${l.quantity}${l.unit} available`,
    distKm: l.distKm,
    farm: l.farmer.farmerProfile?.farmName ?? l.farmer.name,
    farmerPhone: l.farmer.phone,
    rating: l.farmer.farmerProfile?.rating ?? 0,
  }));

  const prompt = `You are a smart agricultural marketplace assistant for Lorgric, a farm-to-market platform in Ghana's Northern Savannah Zone.

USER PROFILE:
- Name: ${user?.name}
- Region: ${user?.region ?? "unknown"}, District: ${user?.district ?? "unknown"}
- Location: lat ${user?.latitude ?? "unknown"}, lon ${user?.longitude ?? "unknown"}

RECENT ACTIVITY (last 50 events):
${JSON.stringify(eventSummary, null, 2)}

RECENT GPS TRACES:
${JSON.stringify(locationEvents, null, 2)}

PURCHASE HISTORY (last 20 orders):
${JSON.stringify(purchaseHistory, null, 2)}

NEARBY AVAILABLE LISTINGS (within 50km):
${JSON.stringify(listingsSummary, null, 2)}

Based on this customer's purchase history, browsing behaviour, GPS location, and nearby availability, select the TOP 3 most relevant listings and write a short, friendly SMS recommendation in plain English (max 160 chars per listing line). Include the farmer's contact so the buyer can call directly.

Respond ONLY with valid JSON in this exact shape:
{
  "listingIds": ["id1", "id2", "id3"],
  "message": "the full SMS text to send"
}`;

  const response = await getClient().chat.completions.create({
    model: "openai/gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as { listingIds?: string[]; message?: string };
  return {
    listingIds: parsed.listingIds ?? [],
    message: parsed.message ?? "",
  };
}

export async function generateAndSendRecommendations(params: {
  userId: string;
  lat?: number;
  lon?: number;
  viewedCrops?: string[];
}): Promise<void> {
  const { userId, lat: paramLat, lon: paramLon } = params;

  const { user, recentEvents, recentOrders } = await buildUserContext(userId);
  if (!user || user.role !== "BUYER") return;

  const lat = paramLat ?? user.latitude;
  const lon = paramLon ?? user.longitude;
  if (!lat || !lon) return;

  const nearbyListings = await getNearbyListings(lat, lon);
  if (nearbyListings.length === 0) return;

  const { listingIds, message } = await getAIRecommendations(user, recentEvents, recentOrders, nearbyListings);
  if (!message) return;

  // Resolve selected listings for DB storage
  const selectedListings = listingIds
    .map((id) => nearbyListings.find((l) => l.id === id))
    .filter(Boolean)
    .map((l) => ({
      listingId: l!.id,
      cropType: l!.cropType,
      pricePerUnit: l!.pricePerUnit,
      unit: l!.unit,
      distKm: l!.distKm,
      farmName: l!.farmer.farmerProfile?.farmName ?? l!.farmer.name,
      farmerPhone: l!.farmer.phone,
    }));

  await sendRecommendationSMS({ phone: user.phone, buyerName: user.name, message });

  await prisma.recommendation.create({
    data: {
      userId,
      phone: user.phone,
      message: `Hi ${user.name}! ${message} Reply STOP to opt out.`,
      listings: selectedListings,
    },
  });
}

export interface WidgetRecommendation {
  id: string;
  cropType: string;
  category: string;
  pricePerUnit: number;
  unit: string;
  quantity: number;
  location: string;
  image: string | null;
  farmName: string;
  rating: number;
  distKm: number;
}

// Read-only, on-demand recommendations for the dashboard widget — same GPT-4o
// selection logic as the SMS campaign, but no SMS send and no Recommendation log
// entry (this can be called every time the widget mounts).
export async function getWidgetRecommendations(userId: string): Promise<WidgetRecommendation[]> {
  const { user, recentEvents, recentOrders } = await buildUserContext(userId);
  if (!user || user.role !== "BUYER") return [];

  const lat = user.latitude;
  const lon = user.longitude;
  let candidates = lat && lon ? await getNearbyListings(lat, lon) : [];
  // No listings within range (or no coordinates at all) — fall back to recent
  // active listings so the widget still has something to recommend.
  if (candidates.length === 0) candidates = await getRecentListings();
  if (candidates.length === 0) return [];

  const { listingIds } = await getAIRecommendations(user, recentEvents, recentOrders, candidates);
  const picked = listingIds
    .map((id) => candidates.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  // Fall back to the top candidates if the model returned nothing usable.
  const source = picked.length > 0 ? picked : candidates.slice(0, 6);

  return source.map((l) => ({
    id: l.id,
    cropType: l.cropType,
    category: l.category,
    pricePerUnit: l.pricePerUnit,
    unit: l.unit,
    quantity: l.quantity,
    location: l.location,
    image: l.images[0] ?? null,
    farmName: l.farmer.farmerProfile?.farmName ?? l.farmer.name,
    rating: l.farmer.farmerProfile?.rating ?? 0,
    distKm: l.distKm,
  }));
}

export async function sendTestRecommendationSMS(phone: string): Promise<{ ok: boolean; message: string }> {
  const testMessage = "Hi there! Fresh produce near you: Tomatoes GHS2.50/kg (3km) — Alhassan Farm, call 0241234567; Yam GHS5/kg (8km) — Fuseini Farms, call 0551234567. Order on lorgric.com!";

  const items = [
    { cropType: "Tomatoes", pricePerUnit: 2.5, unit: "kg", distKm: 3, farmName: "Alhassan Farm", farmerPhone: "0241234567" },
    { cropType: "Yam", pricePerUnit: 5, unit: "kg", distKm: 8, farmName: "Fuseini Farms", farmerPhone: "0551234567" },
  ];

  const result = await sendRecommendationSMS({
    phone,
    buyerName: "there",
    message: testMessage,
  });

  await prisma.recommendation.create({
    data: {
      userId: null,
      phone,
      message: `Hi there! ${testMessage} Reply STOP to opt out.`,
      listings: items,
    },
  });

  return { ok: result.status === "success", message: result.message };
}
