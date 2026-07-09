// One-off: replaces placeholder picsum.photos images on existing ProduceListing and
// VendorProduct rows with real, verified photos matching the actual crop/equipment.
import { config } from "dotenv";

async function main() {
  config({ path: ".env.local" });
  const { prisma } = await import("../lib/prisma");

  const CROP_IMAGES: Record<string, string> = {
    "Tomatoes": "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80",
    "Yams": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Yam_at_monday_market_kaduna_state_01.jpg/960px-Yam_at_monday_market_kaduna_state_01.jpg",
    "Peppers": "https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=800&q=80",
    "Okra": "https://images.unsplash.com/photo-1759860002366-0d8dd828742c?w=800&q=80",
    "Garden Eggs": "https://images.unsplash.com/photo-1690487966073-f2ba29a7eb7c?w=800&q=80",
    "Sorghum": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Guinea_corn_at_monday_market_kaduna_state_01.jpg/960px-Guinea_corn_at_monday_market_kaduna_state_01.jpg",
  };

  const EQUIPMENT_IMAGES: Record<string, string> = {
    "Hybrid Maize Seeds (OPV)": "https://images.unsplash.com/photo-1536510986879-cdc0659c3ea3?w=800&q=80",
    "NPK 15-15-15 Fertilizer": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/DAP_%28Diammonium_Phosphate%29_Granules_%283%29.jpg/960px-DAP_%28Diammonium_Phosphate%29_Granules_%283%29.jpg",
    "Glyphosate Herbicide 1L": "https://images.unsplash.com/photo-1749030417784-f8abf669dd41?w=800&q=80",
    "Jab Planter (Manual Seed Dibbler)": "https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?w=800&q=80",
    "Knapsack Hand Sprayer 16L": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Knapsack_sprayer.jpg/960px-Knapsack_sprayer.jpg",
    "Produce Crates (40L)": "https://images.unsplash.com/photo-1671528443118-fae6bf05e60d?w=800&q=80",
    "Petrol Water Pump 3-inch": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Water_Pump_watering_cultivating_fields.JPG/960px-Water_Pump_watering_cultivating_fields.JPG",
    "Transport Insurance (Perishables)": "https://images.unsplash.com/photo-1506306460327-3164753b74c7?w=800&q=80",
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

  let productsUpdated = 0;
  for (const [name, url] of Object.entries(EQUIPMENT_IMAGES)) {
    const res = await prisma.vendorProduct.updateMany({
      where: { name },
      data: { images: [url] },
    });
    productsUpdated += res.count;
    console.log(`[Images] VendorProduct "${name}": ${res.count} rows updated`);
  }

  console.log(`[Images] Done — ${listingsUpdated} listings, ${productsUpdated} vendor products updated`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[Images] failed:", err);
  process.exit(1);
});
