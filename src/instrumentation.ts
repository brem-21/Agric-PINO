export async function register() {
  // Only run in Node.js runtime — not Edge
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startEventConsumer } = await import("@/lib/kafka-consumer");
  // Fire-and-forget: register() must not block server startup
  startEventConsumer().catch((err) => {
    console.error("[Kafka] Consumer startup error:", err);
  });
}
