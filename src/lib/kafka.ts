import { Kafka, Producer, logLevel } from "kafkajs";

const BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:29092").split(",");

let kafka: Kafka | null = null;
let producer: Producer | null = null;

function getKafka(): Kafka {
  if (!kafka) {
    kafka = new Kafka({ clientId: "lorgric-app", brokers: BROKERS, logLevel: logLevel.WARN });
  }
  return kafka;
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = getKafka().producer();
    await producer.connect();
  }
  return producer;
}

export function createConsumer(groupId: string) {
  return getKafka().consumer({ groupId });
}

export const TOPICS = {
  EVENTS: "lorgric.events",
} as const;

export type EventType =
  | "page_view"
  | "click"
  | "scroll"
  | "product_view"
  | "farmer_view"
  | "equipment_view"
  | "location_update";

export interface AnalyticsEvent {
  sessionId: string;
  userId?: string;
  type: EventType;
  data: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

export async function ensureTopics(): Promise<void> {
  const admin = getKafka().admin();
  await admin.connect();
  try {
    const existing = await admin.listTopics();
    const toCreate = Object.values(TOPICS).filter((t) => !existing.includes(t));
    if (toCreate.length > 0) {
      await admin.createTopics({
        topics: toCreate.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })),
      });
      console.log("[Kafka] Created topics:", toCreate);
    }
  } finally {
    await admin.disconnect();
  }
}

export async function publishEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const p = await getProducer();
    await p.send({
      topic: TOPICS.EVENTS,
      messages: [{ key: event.sessionId, value: JSON.stringify(event) }],
    });
  } catch (err) {
    console.warn("[Kafka] publish failed (non-fatal):", (err as Error).message);
  }
}
