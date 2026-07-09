import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never) as unknown as {
  user: {
    findUnique: (a: unknown) => Promise<{ id: string; name: string; role: string } | null>;
    update: (a: unknown) => Promise<{ id: string; name: string; role: string }>;
  };
  $disconnect: () => Promise<void>;
};

async function main() {
  const phone = process.argv[2];
  if (!phone) {
    console.error("Usage: npm run make-admin -- <phone>");
    console.error("Example: npm run make-admin -- 0244000000");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, name: true, role: true } });
  if (!user) {
    console.error(`No user found with phone ${phone}`);
    process.exit(1);
  }
  if (user.role === "ADMIN") {
    console.log(`${user.name} (${phone}) is already an admin.`);
    await prisma.$disconnect();
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
    select: { id: true, name: true, role: true },
  });
  console.log(`✔ ${updated.name} (${phone}) is now an admin. They must log out and back in for it to take effect.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
