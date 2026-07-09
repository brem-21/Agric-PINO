// Standalone runner for the Kafka consumer — used outside Next.js (e.g. Docker sidecar).
// Inside Next.js, the consumer starts automatically via src/instrumentation.ts.
import { config } from "dotenv";
config({ path: ".env.local" });

import { startEventConsumer } from "../lib/kafka-consumer";

console.log("[Consumer] Starting standalone Kafka consumer…");
startEventConsumer().catch((err) => {
  console.error("[Consumer] Fatal:", err);
  process.exit(1);
});
