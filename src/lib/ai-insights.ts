import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { computeLossPercentage } from "@/lib/post-harvest-loss";

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

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type InsightSubjectType = "FACILITY_PRACTICES" | "FARMER_LOSS_TIPS" | "FACILITY_RECOMMENDATION";

async function readCache(subjectType: InsightSubjectType, subjectId: string) {
  const row = await prisma.aiInsight.findUnique({ where: { subjectType_subjectId: { subjectType, subjectId } } });
  if (!row) return null;
  const isStale = Date.now() - row.generatedAt.getTime() > STALE_AFTER_MS;
  return { content: row.content, generatedAt: row.generatedAt, isStale };
}

async function writeCache(subjectType: InsightSubjectType, subjectId: string, content: string) {
  await prisma.aiInsight.upsert({
    where: { subjectType_subjectId: { subjectType, subjectId } },
    create: { subjectType, subjectId, content },
    update: { content, generatedAt: new Date() },
  });
}

export async function getOrGenerateFacilityPractices(
  facilityId: string,
  opts?: { force?: boolean }
): Promise<{ content: string; generatedAt: Date }> {
  if (!opts?.force) {
    const cached = await readCache("FACILITY_PRACTICES", facilityId);
    if (cached && !cached.isStale) return cached;
  }

  const facility = await prisma.storageFacilityProfile.findUnique({
    where: { id: facilityId },
    select: { name: true, storageTypes: true, acceptedCategories: true },
  });
  if (!facility) throw new Error("Facility not found");

  const inventoryCrops = await prisma.produceListing.findMany({
    where: { storageFacilityId: facilityId, status: "ACTIVE" },
    select: { cropType: true },
    distinct: ["cropType"],
    take: 15,
  });
  const crops = inventoryCrops.map((l) => l.cropType);

  const completion = await getClient().chat.completions.create({
    model: "anthropic/claude-haiku-4-5",
    max_tokens: 350,
    messages: [
      {
        role: "system",
        content:
          "You are a post-harvest storage specialist advising small storage facilities in Ghana's Northern Savannah Zone. Give brief, practical, low-cost best practices. Use short bullet points (plain text, use '-' not markdown '*'). No preamble.",
      },
      {
        role: "user",
        content: `Facility: ${facility.name}
Storage types available: ${facility.storageTypes.join(", ") || "unspecified"}
Accepted produce categories: ${facility.acceptedCategories.join(", ") || "unspecified"}
Crops currently in storage: ${crops.join(", ") || "none currently"}

Give 4-5 specific, actionable storage best practices for this facility to reduce post-harvest loss for the crops it's currently holding.`,
      },
    ],
  });

  const content =
    completion.choices[0]?.message?.content ??
    "Keep produce dry, well-ventilated, and off the ground. Rotate stock on a first-in-first-out basis and inspect regularly for spoilage.";

  await writeCache("FACILITY_PRACTICES", facilityId, content);
  return { content, generatedAt: new Date() };
}

export async function getOrGenerateFarmerLossTips(
  farmerId: string,
  opts?: { facilityId?: string; force?: boolean }
): Promise<{ content: string; generatedAt: Date }> {
  const subjectId = opts?.facilityId ? `${opts.facilityId}:${farmerId}` : farmerId;

  if (!opts?.force) {
    const cached = await readCache("FARMER_LOSS_TIPS", subjectId);
    if (cached && !cached.isStale) return cached;
  }

  const [farmer, listings] = await Promise.all([
    prisma.user.findUnique({ where: { id: farmerId }, select: { name: true } }),
    prisma.produceListing.findMany({
      where: { farmerId, ...(opts?.facilityId && { storageFacilityId: opts.facilityId }) },
      select: {
        cropType: true,
        category: true,
        quantity: true,
        pricePerUnit: true,
        expiryDate: true,
        createdAt: true,
        status: true,
        orders: { select: { quantity: true } },
      },
    }),
  ]);
  if (!farmer) throw new Error("Farmer not found");

  const lossPercentage = computeLossPercentage(listings);
  const expiredUnsold = listings
    .filter((l) => l.expiryDate && l.expiryDate < new Date() && l.quantity > 0)
    .map((l) => `${l.cropType} (${l.quantity} unsold at expiry)`);
  const cropMix = [...new Set(listings.map((l) => l.cropType))];

  const completion = await getClient().chat.completions.create({
    model: "anthropic/claude-haiku-4-5",
    max_tokens: 250,
    messages: [
      {
        role: "system",
        content:
          "You are an agricultural extension advisor for smallholder farmers in Northern Ghana. Give brief, encouraging, actionable advice in 2-3 sentences. No markdown.",
      },
      {
        role: "user",
        content: `Farmer: ${farmer.name}
Crops grown: ${cropMix.join(", ") || "none yet"}
Post-harvest loss so far: ${lossPercentage === null ? "no data yet" : `${lossPercentage.toFixed(1)}%`}
Produce that expired unsold: ${expiredUnsold.join(", ") || "none"}

Give a short, specific tip to help this farmer reduce post-harvest loss.`,
      },
    ],
  });

  const content =
    completion.choices[0]?.message?.content ??
    "Sell your produce closer to harvest time and consider storage facilities for crops with a longer shelf life.";

  await writeCache("FARMER_LOSS_TIPS", subjectId, content);
  return { content, generatedAt: new Date() };
}

export interface FacilityRecommendation {
  facilityId: string | null;
  facilityName: string | null;
  reason: string;
  generatedAt: Date;
}

export async function getOrGenerateFacilityRecommendation(
  farmerId: string,
  opts?: { force?: boolean }
): Promise<FacilityRecommendation> {
  if (!opts?.force) {
    const cached = await readCache("FACILITY_RECOMMENDATION", farmerId);
    if (cached && !cached.isStale) {
      return { ...(JSON.parse(cached.content) as Omit<FacilityRecommendation, "generatedAt">), generatedAt: cached.generatedAt };
    }
  }

  const [farmer, activeListings, facilities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: farmerId },
      select: { name: true, region: true, district: true, farmerProfile: { select: { location: true } } },
    }),
    prisma.produceListing.findMany({
      where: { farmerId, status: "ACTIVE" },
      select: { cropType: true, category: true },
      distinct: ["cropType"],
    }),
    prisma.storageFacilityProfile.findMany({
      where: { approvalStatus: "APPROVED" },
      select: {
        id: true, name: true, description: true, location: true,
        storageTypes: true, acceptedCategories: true, equipment: true, capacityTonnes: true,
      },
      take: 20,
    }),
  ]);
  if (!farmer) throw new Error("Farmer not found");

  if (facilities.length === 0) {
    const empty = { facilityId: null, facilityName: null, reason: "No approved storage facilities are available yet." };
    await writeCache("FACILITY_RECOMMENDATION", farmerId, JSON.stringify(empty));
    return { ...empty, generatedAt: new Date() };
  }

  const cropMix = [...new Set(activeListings.map((l) => l.cropType))];
  const categoryMix = [...new Set(activeListings.map((l) => l.category))];

  const facilitiesSummary = facilities.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    description: f.description ?? "No description provided",
    storageTypes: f.storageTypes,
    acceptsAllCropTypes: f.acceptedCategories.length >= 6,
    acceptedCategories: f.acceptedCategories,
    equipment: f.equipment,
    capacityTonnes: f.capacityTonnes,
  }));

  const completion = await getClient().chat.completions.create({
    model: "anthropic/claude-haiku-4-5",
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a storage-matching advisor for smallholder farmers in Northern Ghana. Recommend the single best storage facility for a farmer from a list of candidates, weighing whether the facility accepts the farmer's specific crop types (or all crop types), its equipment/description, and location. Respond ONLY with valid JSON in this exact shape: {\"facilityId\": \"...\", \"reason\": \"2-3 sentence explanation\"}. If none of the candidates are a good fit, set facilityId to null and explain why in reason.",
      },
      {
        role: "user",
        content: `Farmer: ${farmer.name}, located in ${farmer.farmerProfile?.location ?? ([farmer.district, farmer.region].filter(Boolean).join(", ") || "Northern Ghana")}.
Crops currently grown: ${cropMix.join(", ") || "none listed yet"} (categories: ${categoryMix.join(", ") || "unknown"}).

Candidate storage facilities:
${JSON.stringify(facilitiesSummary, null, 2)}

Recommend the best facility for this farmer.`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: { facilityId?: string | null; reason?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }

  const matched = facilities.find((f) => f.id === parsed.facilityId) ?? null;
  const result = {
    facilityId: matched?.id ?? null,
    facilityName: matched?.name ?? null,
    reason: parsed.reason ?? "Unable to generate a recommendation right now.",
  };

  await writeCache("FACILITY_RECOMMENDATION", farmerId, JSON.stringify(result));
  return { ...result, generatedAt: new Date() };
}
