// One-off: replaces placeholder picsum.photos images on existing ProduceListing
// rows with real, verified photos matching the actual crop.
import { config } from "dotenv";

async function main() {
  config({ path: ".env.local" });
  const { prisma } = await import("../lib/prisma");

  const CROP_IMAGES: Record<string, string> = {
    "Tomatoes": "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80",
    "Yams": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Yam_at_monday_market_kaduna_state_01.jpg/960px-Yam_at_monday_market_kaduna_state_01.jpg",
  };

  let listingsUpdated = 0;
  for (const [cropType, url] of Object.entries(CROP_IMAGES)) {
    const res = await prisma.produceListing.updateMany({
      where: { cropType },
      data: { images: [url] },
    });
    listingsUpdated += res.count;
    console.log(`[Images] ProduceListing "${cropType}": ${res.count} rows updated`);
  }

  console.log(`[Images] Done — ${listingsUpdated} listings updated`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Images] failed:", err);
  process.exit(1);
});
