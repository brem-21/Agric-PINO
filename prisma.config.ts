import { defineConfig } from "prisma/config";
import { config } from "dotenv";

// Load .env.local for Prisma CLI commands (migrate, push, seed)
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
