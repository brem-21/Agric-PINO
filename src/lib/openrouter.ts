import OpenAI from "openai";

// OpenRouter uses the OpenAI SDK but with a different base URL.
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
        "X-Title": "Lorgric Northern Ghana",
      },
    });
  }
  return client;
}

export interface RecommendationContext {
  buyerName: string;
  buyerRegion: string;
  purchaseHistory: {
    cropType: string;
    quantity: number;
    unit: string;
    farmerLocation: string;
  }[];
  availableListings: {
    cropType: string;
    farmerName: string;
    location: string;
    pricePerUnit: number;
    unit: string;
    quantity: number;
    distanceKm?: number;
  }[];
}

export async function generateRecommendation(ctx: RecommendationContext): Promise<string> {
  const historyText =
    ctx.purchaseHistory.length > 0
      ? ctx.purchaseHistory
          .map((p) => `${p.cropType} (${p.quantity}${p.unit}) from ${p.farmerLocation}`)
          .join(", ")
      : "No previous purchases";

  const listingsText = ctx.availableListings
    .slice(0, 8)
    .map(
      (l) =>
        `${l.cropType} — GHS ${l.pricePerUnit}/${l.unit} by ${l.farmerName} in ${l.location}${l.distanceKm ? ` (${l.distanceKm}km away)` : ""}`
    )
    .join("\n");

  const completion = await getClient().chat.completions.create({
    model: "anthropic/claude-haiku-4-5",
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You are Lorgric's assistant for Ghana's Northern Savannah Zone. Write short, friendly SMS recommendations in plain English (max 300 characters). Be specific about produce and savings. No markdown. Sign off as Lorgric.",
      },
      {
        role: "user",
        content: `Buyer: ${ctx.buyerName} (${ctx.buyerRegion})
Previous purchases: ${historyText}

Available nearby produce:
${listingsText}

Write a personalized SMS recommendation highlighting 2-3 relevant items. Keep it under 300 characters and include a call to action.`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "Fresh produce available near you on Lorgric!";
}

export async function generateFarmerInsight(params: {
  farmerName: string;
  cropType: string;
  region: string;
  currentPrice: number;
  ordersCount: number;
  weather: string;
}): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: "anthropic/claude-haiku-4-5",
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "You are an agricultural market advisor for Northern Ghana. Give brief, actionable advice in 2-3 sentences. No markdown.",
      },
      {
        role: "user",
        content: `Farmer: ${params.farmerName}, growing ${params.cropType} in ${params.region}.
Current listing price: GHS ${params.currentPrice}/unit.
Orders this month: ${params.ordersCount}.
Weather: ${params.weather}.
Give a brief market insight and pricing recommendation.`,
      },
    ],
  });

  return (
    completion.choices[0]?.message?.content ??
    "Market conditions look good. Maintain your current pricing."
  );
}
