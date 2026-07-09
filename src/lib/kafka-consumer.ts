import { createConsumer, ensureTopics, TOPICS, type AnalyticsEvent } from "@/lib/kafka";
import { generateAndSendRecommendations } from "@/lib/recommendations";

const RECO_COOLDOWN_MS = 60 * 60 * 1000;
const lastRecoSent = new Map<string, number>();
let running = false;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function startEventConsumer(): Promise<void> {
  if (running) return;
  running = true;

  // Ensure topic exists before subscribing
  await ensureTopics();
  // Brief pause so Kafka can elect a group coordinator for the fresh topic
  await sleep(3000);

  const consumer = createConsumer("lorgric-recommendations");

  // Restart consumer automatically if it crashes
  consumer.on(consumer.events.CRASH, ({ payload: { error } }) => {
    console.error("[Kafka] Consumer crashed:", error.message, "— restarting in 5s");
    running = false;
    setTimeout(() => startEventConsumer().catch(console.error), 5000);
  });

  await consumer.connect();
  await consumer.subscribe({ topic: TOPICS.EVENTS, fromBeginning: false });
  console.log("[Kafka] Consumer active → group: lorgric-recommendations, topic:", TOPICS.EVENTS);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;
      try {
        const event = JSON.parse(message.value.toString()) as AnalyticsEvent;

        if (!event.userId) return;
        const triggerTypes: string[] = ["location_update", "product_view", "farmer_view"];
        if (!triggerTypes.includes(event.type)) return;

        const now = Date.now();
        if ((lastRecoSent.get(event.userId) ?? 0) + RECO_COOLDOWN_MS > now) return;
        lastRecoSent.set(event.userId, now);

        const lat = event.type === "location_update" ? (event.data.lat as number | undefined) : undefined;
        const lon = event.type === "location_update" ? (event.data.lon as number | undefined) : undefined;

        console.log("[Kafka] Triggering AI recommendation for user:", event.userId);
        await generateAndSendRecommendations({ userId: event.userId, lat, lon });
      } catch (err) {
        console.error("[Kafka] Message processing error:", err);
      }
    },
  });
}
