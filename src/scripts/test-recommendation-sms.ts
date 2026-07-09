import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { sendSMS } from "../lib/mnotify";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never) as unknown as {
  recommendation: {
    create: (a: { data: Record<string, unknown> }) => Promise<unknown>;
  };
  $disconnect: () => Promise<void>;
};

const phone = process.argv[2] ?? "0592538659";

const items = [
  { cropType: "Tomatoes", pricePerUnit: 2.5, unit: "kg", distKm: 3, farmName: "Alhassan Farm", farmerPhone: "0241234567" },
  { cropType: "Yam", pricePerUnit: 5, unit: "kg", distKm: 8, farmName: "Fuseini Farms", farmerPhone: "0551234567" },
];

const messageText = items
  .map((i) => `${i.cropType} GHS${i.pricePerUnit}/${i.unit} (${i.distKm}km) — ${i.farmName}, call ${i.farmerPhone}`)
  .join("; ");

const fullMessage = `Hi there! Fresh produce near you: ${messageText}. Order on lorgric.com! Reply STOP to opt out.`;

async function main() {
  console.log(`Sending test recommendation SMS to ${phone}…`);
  console.log("Message:", fullMessage);

  const result = await sendSMS({ to: phone, message: fullMessage });
  console.log("mNotify response:", result);

  await prisma.recommendation.create({
    data: { userId: null, phone, message: fullMessage, listings: items },
  });

  console.log("Recommendation saved to database ✓");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
