import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 12);
  const verifiedAt = new Date("2026-01-15");

  // Online/away thresholds
  const online = new Date(Date.now() - 60 * 1000);       // 1 min ago
  const online2 = new Date(Date.now() - 90 * 1000);      // 90s ago
  const away = new Date(Date.now() - 3.5 * 60 * 1000);   // 3.5 min ago
  const away2 = new Date(Date.now() - 4 * 60 * 1000);    // 4 min ago

  // ── Farmers ────────────────────────────────────────────────────────────────
  const farmer1 = await prisma.user.upsert({
    where: { phone: "0244000001" },
    update: {},
    create: {
      name: "Kofi Mensah",
      phone: "0244000001",
      password: hashedPassword,
      role: "FARMER",
      region: "Northern Region",
      district: "Tamale Metro",
      ghanaCardNumber: "GHA-123456789-0",
      ghanaCardName: "Kofi Asante Mensah",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt,
      farmerProfile: {
        create: {
          farmName: "Mensah Farms",
          farmSize: 4.5,
          description: "Family farm growing tomatoes and garden eggs since 1995",
          location: "Tamale, Northern Region",
          latitude: 9.4008,
          longitude: -0.8393,
          rating: 4.5,
          totalRatings: 24,
        },
      },
    },
  });

  const farmer2 = await prisma.user.upsert({
    where: { phone: "0244000002" },
    update: {},
    create: {
      name: "Amina Issahaku",
      phone: "0244000002",
      password: hashedPassword,
      role: "FARMER",
      region: "Upper East Region",
      district: "Bolgatanga Metro",
      ghanaCardNumber: "GHA-234567890-1",
      ghanaCardName: "Amina Fatima Issahaku",
      residenceLocation: "Bolgatanga, Upper East Region",
      isVerified: true,
      verifiedAt,
      farmerProfile: {
        create: {
          farmName: "Issahaku Vegetable Garden",
          farmSize: 2.0,
          description: "Specializing in okra, peppers and leafy greens",
          location: "Bolgatanga, Upper East Region",
          latitude: 10.7856,
          longitude: -0.8494,
          rating: 4.8,
          totalRatings: 31,
        },
      },
    },
  });

  const farmer3 = await prisma.user.upsert({
    where: { phone: "0244000003" },
    update: {},
    create: {
      name: "Yakubu Alhassan",
      phone: "0244000003",
      password: hashedPassword,
      role: "FARMER",
      region: "Upper West Region",
      district: "Wa Municipal",
      ghanaCardNumber: "GHA-345678901-2",
      ghanaCardName: "Yakubu Mohammed Alhassan",
      residenceLocation: "Wa, Upper West Region",
      isVerified: false,
      farmerProfile: {
        create: {
          farmName: "Alhassan Yam Farm",
          farmSize: 8.0,
          description: "Large-scale yam and sorghum production in Wa",
          location: "Wa, Upper West Region",
          latitude: 10.0608,
          longitude: -2.5012,
          rating: 4.2,
          totalRatings: 15,
        },
      },
    },
  });

  // ── Buyers ─────────────────────────────────────────────────────────────────
  const buyer1 = await prisma.user.upsert({
    where: { phone: "0244000010" },
    update: {},
    create: {
      name: "Grace Agyemang",
      phone: "0244000010",
      password: hashedPassword,
      role: "BUYER",
      region: "Northern Region",
      district: "Tamale Metro",
      ghanaCardNumber: "GHA-456789012-3",
      ghanaCardName: "Grace Akua Agyemang",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt,
      buyerProfile: {
        create: {
          businessName: "Grace Fresh Market",
          businessType: "RETAILER",
          description: "Fresh produce retailer at Tamale Central Market",
          rating: 4.3,
          totalRatings: 12,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { phone: "0244000011" },
    update: {},
    create: {
      name: "Ibrahim Kwesi",
      phone: "0244000011",
      password: hashedPassword,
      role: "BUYER",
      region: "Northern Region",
      district: "Tamale Metro",
      ghanaCardNumber: "GHA-567890123-4",
      ghanaCardName: "Ibrahim Kwesi Boateng",
      residenceLocation: "Tamale, Northern Region",
      isVerified: false,
      buyerProfile: {
        create: {
          businessName: "Northern Spice Restaurant",
          businessType: "RESTAURANT",
          description: "Traditional Ghanaian cuisine restaurant in Tamale",
          rating: 4.6,
          totalRatings: 8,
        },
      },
    },
  });

  // ── Riders (motorbikes) ────────────────────────────────────────────────────
  const logistics1 = await prisma.user.upsert({
    where: { phone: "0244000020" },
    update: { lastSeen: online2, latitude: 9.4035, longitude: -0.8393 },
    create: {
      name: "Abdul Razak",
      phone: "0244000020",
      password: hashedPassword,
      role: "LOGISTICS",
      region: "Northern Region",
      ghanaCardNumber: "GHA-678901234-5",
      ghanaCardName: "Abdul Razak Ibrahim",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt,
      lastSeen: online2,
      latitude: 9.4035,
      longitude: -0.8393,
      logisticsProfile: {
        create: {
          companyName: "Razak Fast Delivery",
          vehicleType: "MOTORBIKE",
          licensePlate: "NR-4521-23",
          coverageAreas: ["Northern Region", "Upper East Region", "Upper West Region"],
          isAvailable: true,
          rating: 4.7,
          totalRatings: 42,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { phone: "0244000021" },
    update: { lastSeen: away, latitude: 9.4120, longitude: -0.8215 },
    create: {
      name: "Fuseini Dauda",
      phone: "0244000021",
      password: hashedPassword,
      role: "LOGISTICS",
      region: "Northern Region",
      ghanaCardNumber: "GHA-789012345-6",
      ghanaCardName: "Fuseini Dauda Mohammed",
      residenceLocation: "Tamale, Northern Region",
      isVerified: false,
      lastSeen: away,
      latitude: 9.4120,
      longitude: -0.8215,
      logisticsProfile: {
        create: {
          companyName: "Fuseini Express",
          vehicleType: "MOTORBIKE",
          licensePlate: "NR-1102-24",
          coverageAreas: ["Northern Region"],
          isAvailable: true,
          rating: 4.2,
          totalRatings: 18,
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { phone: "0244000022" },
    update: { lastSeen: null, latitude: 9.3890, longitude: -0.8550 },
    create: {
      name: "Mariama Sumaila",
      phone: "0244000022",
      password: hashedPassword,
      role: "LOGISTICS",
      region: "Northern Region",
      ghanaCardNumber: "GHA-890123456-7",
      ghanaCardName: "Mariama Sumaila Seidu",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt,
      lastSeen: null,
      latitude: 9.3890,
      longitude: -0.8550,
      logisticsProfile: {
        create: {
          companyName: "Sumaila Riders",
          vehicleType: "MOTORBIKE",
          licensePlate: "NR-2287-22",
          coverageAreas: ["Northern Region", "Upper West Region"],
          isAvailable: true,
          rating: 4.9,
          totalRatings: 67,
        },
      },
    },
  });

  // 4th rider — clearly online, near Bolgatanga
  await prisma.user.upsert({
    where: { phone: "0244000023" },
    update: { lastSeen: online, latitude: 10.7890, longitude: -0.8460 },
    create: {
      name: "Shaibu Alidu",
      phone: "0244000023",
      password: hashedPassword,
      role: "LOGISTICS",
      region: "Upper East Region",
      ghanaCardNumber: "GHA-901234567-8",
      ghanaCardName: "Shaibu Alidu Baba",
      residenceLocation: "Bolgatanga, Upper East Region",
      isVerified: true,
      verifiedAt,
      lastSeen: online,
      latitude: 10.7890,
      longitude: -0.8460,
      logisticsProfile: {
        create: {
          companyName: "Shaibu Dispatch",
          vehicleType: "MOTORBIKE",
          licensePlate: "UER-5514-23",
          coverageAreas: ["Upper East Region", "Northern Region"],
          isAvailable: true,
          rating: 4.6,
          totalRatings: 29,
        },
      },
    },
  });

  // ── Listings ───────────────────────────────────────────────────────────────
  console.log("Creating listings...");

  // createMany's skipDuplicates only skips on a unique-constraint collision,
  // and ProduceListing has none covering (farmerId, cropType) — so without
  // this check, re-running the seed against a non-empty DB piles up fresh
  // copies of the same demo listings every time.
  const existingDemoListings = await prisma.produceListing.findMany({
    where: {
      OR: [
        { farmerId: farmer1.id, cropType: { in: ["Tomatoes", "Garden Eggs"] } },
        { farmerId: farmer2.id, cropType: { in: ["Okra", "Peppers"] } },
        { farmerId: farmer3.id, cropType: { in: ["Yams", "Sorghum"] } },
      ],
    },
    select: { farmerId: true, cropType: true },
  });
  const alreadySeededListing = new Set(
    existingDemoListings.map((l) => `${l.farmerId}:${l.cropType}`)
  );

  const demoListings: Prisma.ProduceListingCreateManyInput[] = [
      {
        farmerId: farmer1.id,
        cropType: "Tomatoes",
        category: "VEGETABLES",
        quantity: 500,
        unit: "kg",
        pricePerUnit: 12,
        currency: "GHS",
        description: "Fresh, ripe Roma tomatoes. Harvested this week. No pesticides.",
        images: [
          "https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80",

        ],
        harvestDate: new Date("2026-06-28"),
        expiryDate: new Date("2026-07-30"),
        location: "Tamale, Northern Region",
        latitude: 9.4008,
        longitude: -0.8393,
        status: "ACTIVE",
      },
      {
        farmerId: farmer1.id,
        cropType: "Garden Eggs",
        category: "VEGETABLES",
        quantity: 200,
        unit: "kg",
        pricePerUnit: 9,
        currency: "GHS",
        description: "White garden eggs, fresh from the farm",
        images: [
          "https://images.unsplash.com/photo-1690487966073-f2ba29a7eb7c?w=800&q=80",
        ],
        harvestDate: new Date("2026-06-30"),
        expiryDate: new Date("2026-07-30"),
        location: "Tamale, Northern Region",
        latitude: 9.4008,
        longitude: -0.8393,
        status: "ACTIVE",
      },
      {
        farmerId: farmer2.id,
        cropType: "Okra",
        category: "VEGETABLES",
        quantity: 300,
        unit: "kg",
        pricePerUnit: 10,
        currency: "GHS",
        description: "Tender young okra, perfect for soups and stews",
        images: [
          "https://images.unsplash.com/photo-1759860002366-0d8dd828742c?w=800&q=80",

        ],
        harvestDate: new Date("2026-07-01"),
        expiryDate: new Date("2026-07-30"),
        location: "Bolgatanga, Upper East Region",
        latitude: 10.7856,
        longitude: -0.8494,
        status: "ACTIVE",
      },
      {
        farmerId: farmer2.id,
        cropType: "Peppers",
        category: "VEGETABLES",
        quantity: 150,
        unit: "kg",
        pricePerUnit: 15,
        currency: "GHS",
        description: "Hot shito peppers and long green peppers available",
        images: [
          "https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=800&q=80",

        ],
        harvestDate: new Date("2026-06-29"),
        expiryDate: new Date("2026-07-30"),
        location: "Bolgatanga, Upper East Region",
        latitude: 10.7856,
        longitude: -0.8494,
        status: "ACTIVE",
      },
      {
        farmerId: farmer3.id,
        cropType: "Yams",
        category: "TUBERS",
        quantity: 2000,
        unit: "kg",
        pricePerUnit: 8,
        currency: "GHS",
        description: "Premium Pona yams from Wa. Bulk orders welcome.",
        images: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Yam_at_monday_market_kaduna_state_01.jpg/960px-Yam_at_monday_market_kaduna_state_01.jpg",

        ],
        harvestDate: new Date("2026-06-25"),
        expiryDate: new Date("2026-08-25"),
        location: "Wa, Upper West Region",
        latitude: 10.0608,
        longitude: -2.5012,
        status: "ACTIVE",
      },
      {
        farmerId: farmer3.id,
        cropType: "Sorghum",
        category: "GRAINS",
        quantity: 5000,
        unit: "kg",
        pricePerUnit: 3.5,
        currency: "GHS",
        description: "Dry season sorghum, excellent quality",
        images: [
          "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Guinea_corn_at_monday_market_kaduna_state_01.jpg/960px-Guinea_corn_at_monday_market_kaduna_state_01.jpg",
        ],
        harvestDate: new Date("2026-06-20"),
        expiryDate: new Date("2026-12-20"),
        location: "Wa, Upper West Region",
        latitude: 10.0608,
        longitude: -2.5012,
        status: "ACTIVE",
      },
  ];

  await prisma.produceListing.createMany({
    skipDuplicates: true,
    data: demoListings.filter(
      (l) => !alreadySeededListing.has(`${l.farmerId}:${l.cropType}`)
    ),
  });

  // Patch images on existing produce listings (createMany skipDuplicates won't update them)
  const listingImageMap: [string, string, string[]][] = [
    [farmer1.id, "Tomatoes", ["https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80"]],
    [farmer1.id, "Garden Eggs", ["https://images.unsplash.com/photo-1690487966073-f2ba29a7eb7c?w=800&q=80"]],
    [farmer2.id, "Okra", ["https://images.unsplash.com/photo-1759860002366-0d8dd828742c?w=800&q=80"]],
    [farmer2.id, "Peppers", ["https://images.unsplash.com/photo-1601648764658-cf37e8c89b70?w=800&q=80"]],
    [farmer3.id, "Yams", ["https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Yam_at_monday_market_kaduna_state_01.jpg/960px-Yam_at_monday_market_kaduna_state_01.jpg"]],
    [farmer3.id, "Sorghum", ["https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Guinea_corn_at_monday_market_kaduna_state_01.jpg/960px-Guinea_corn_at_monday_market_kaduna_state_01.jpg"]],
  ];
  for (const [farmerId, cropType, images] of listingImageMap) {
    await prisma.produceListing.updateMany({ where: { farmerId, cropType }, data: { images } });
  }

  void buyer1;
  void logistics1;

  // ── Vendor 1: AgroSupplies Ghana (Tamale) ─────────────────────────────────
  const vendor1 = await prisma.user.upsert({
    where: { phone: "0244000030" },
    update: {},
    create: {
      name: "Kwame Darko",
      phone: "0244000030",
      password: hashedPassword,
      role: "VENDOR",
      isVendor: true,
      region: "Northern",
      district: "Tamale Metropolitan",
      ghanaCardNumber: "GHA-900000030-0",
      ghanaCardName: "Kwame Darko",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt: new Date("2026-01-05"),
      latitude: 9.4075,
      longitude: -0.8533,
      lastSeen: away2,
      vendorProfile: {
        create: {
          shopName: "AgroSupplies Ghana",
          description: "Your one-stop shop for quality farm equipment and inputs in Northern Ghana",
          location: "Tamale, Northern Region",
          coverageAreas: ["Northern Region", "Upper East Region", "Upper West Region"],
          latitude: 9.4075,
          longitude: -0.8533,
          products: {
            create: [
              {
                name: "NPK 15-15-15 Fertilizer",
                category: "FERTILIZERS",
                description: "Balanced compound fertilizer suitable for all crops. 50kg bag.",
                price: 320,
                unit: "bag (50kg)",
                stock: 200,
                images: [
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/DAP_%28Diammonium_Phosphate%29_Granules_%283%29.jpg/960px-DAP_%28Diammonium_Phosphate%29_Granules_%283%29.jpg",
                ],
                isAvailable: true,
              },
              {
                name: "Hybrid Maize Seeds (OPV)",
                category: "SEEDS",
                description: "Open-pollinated high-yield maize variety adapted to savannah zone.",
                price: 85,
                unit: "kg",
                stock: 500,
                images: [
                  "https://images.unsplash.com/photo-1536510986879-cdc0659c3ea3?w=800&q=80",
                ],
                isAvailable: true,
              },
              {
                name: "Knapsack Hand Sprayer 16L",
                category: "TOOLS",
                description: "Durable manual sprayer for pesticide and herbicide application.",
                price: 180,
                unit: "unit",
                stock: 50,
                images: [
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Knapsack_sprayer.jpg/960px-Knapsack_sprayer.jpg",
                ],
                isAvailable: true,
              },
              {
                name: "Glyphosate Herbicide 1L",
                category: "PESTICIDES",
                description: "Non-selective systemic herbicide for weed control before planting.",
                price: 45,
                unit: "litre",
                stock: 300,
                images: [
                  "https://images.unsplash.com/photo-1749030417784-f8abf669dd41?w=800&q=80",
                ],
                isAvailable: true,
              },
              {
                name: "Petrol Water Pump 3-inch",
                category: "IRRIGATION",
                description: "High-flow petrol water pump for irrigation. Self-priming up to 8m.",
                price: 1200,
                unit: "unit",
                stock: 15,
                images: [
                  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Water_Pump_watering_cultivating_fields.JPG/960px-Water_Pump_watering_cultivating_fields.JPG",
                ],
                isAvailable: true,
              },
              {
                name: "Jab Planter (Manual Seed Dibbler)",
                category: "TOOLS",
                description: "Manual jab planter for quick and uniform seed placement.",
                price: 95,
                unit: "unit",
                stock: 80,
                images: [
                  "https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?w=800&q=80",
                ],
                isAvailable: true,
              },
            ],
          },
          vehicles: {
            create: [
              {
                vehicleType: "MINIBUS",
                licensePlate: "NR-7823-21",
                driverName: "Alidu Seidu",
                driverPhone: "0557000031",
                capacity: 1500,
                isAvailable: true,
                latitude: 9.4150,
                longitude: -0.8410,
                lastSeen: online2,
              },
              {
                vehicleType: "PICKUP_TRUCK",
                licensePlate: "NR-3341-23",
                driverName: "Issaka Mohammed",
                driverPhone: "0557000032",
                capacity: 800,
                isAvailable: true,
                latitude: 9.4022,
                longitude: -0.8601,
                lastSeen: away,
              },
            ],
          },
        },
      },
    },
  });

  // Refresh vehicle lastSeen on every run (upsert only creates, doesn't update nested)
  await prisma.vendorVehicle.updateMany({
    where: { licensePlate: "NR-7823-21" },
    data: { lastSeen: online2, latitude: 9.4150, longitude: -0.8410 },
  });
  await prisma.vendorVehicle.updateMany({
    where: { licensePlate: "NR-3341-23" },
    data: { lastSeen: away, latitude: 9.4022, longitude: -0.8601 },
  });

  // Patch product images for AgroSupplies Ghana
  const productImageMapV1: [string, string[]][] = [
    ["NPK 15-15-15 Fertilizer", ["https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/DAP_%28Diammonium_Phosphate%29_Granules_%283%29.jpg/960px-DAP_%28Diammonium_Phosphate%29_Granules_%283%29.jpg"]],
    ["Hybrid Maize Seeds (OPV)", ["https://images.unsplash.com/photo-1536510986879-cdc0659c3ea3?w=800&q=80"]],
    ["Knapsack Hand Sprayer 16L", ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Knapsack_sprayer.jpg/960px-Knapsack_sprayer.jpg"]],
    ["Glyphosate Herbicide 1L", ["https://images.unsplash.com/photo-1749030417784-f8abf669dd41?w=800&q=80"]],
    ["Petrol Water Pump 3-inch", ["https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Water_Pump_watering_cultivating_fields.JPG/960px-Water_Pump_watering_cultivating_fields.JPG"]],
    ["Jab Planter (Manual Seed Dibbler)", ["https://images.unsplash.com/photo-1642952273588-ed6fa28870ac?w=800&q=80"]],
  ];
  for (const [name, images] of productImageMapV1) {
    await prisma.vendorProduct.updateMany({ where: { name }, data: { images } });
  }

  void vendor1;

  // ── Vendor 2: Savannah Transport Co (Bolgatanga) ──────────────────────────
  const vendor2 = await prisma.user.upsert({
    where: { phone: "0244000031" },
    update: {},
    create: {
      name: "Abena Fordjour",
      phone: "0244000031",
      password: hashedPassword,
      role: "VENDOR",
      isVendor: true,
      region: "Upper East",
      district: "Bolgatanga Municipal",
      ghanaCardNumber: "GHA-900000031-1",
      ghanaCardName: "Abena Fordjour",
      residenceLocation: "Bolgatanga, Upper East Region",
      isVerified: true,
      verifiedAt: new Date("2026-02-10"),
      latitude: 10.7830,
      longitude: -0.8520,
      lastSeen: online,
      vendorProfile: {
        create: {
          shopName: "Savannah Transport Co",
          description: "Bulk produce transport serving all routes across the Northern Savannah Zone",
          location: "Bolgatanga, Upper East Region",
          coverageAreas: ["Upper East Region", "Northern Region", "Upper West Region"],
          latitude: 10.7830,
          longitude: -0.8520,
          products: {
            create: [
              {
                name: "Transport Insurance (Perishables)",
                category: "OTHER",
                description: "One-trip cargo insurance for perishable produce. Valid 24h.",
                price: 50,
                unit: "trip",
                stock: 999,
                images: [
                  "https://images.unsplash.com/photo-1506306460327-3164753b74c7?w=800&q=80",
                ],
                isAvailable: true,
              },
              {
                name: "Produce Crates (40L)",
                category: "TOOLS",
                description: "Reusable plastic crates for safe produce transport.",
                price: 25,
                unit: "crate",
                stock: 200,
                images: [
                  "https://images.unsplash.com/photo-1671528443118-fae6bf05e60d?w=800&q=80",
                ],
                isAvailable: true,
              },
            ],
          },
          vehicles: {
            create: [
              {
                vehicleType: "BUS",
                licensePlate: "UER-1190-20",
                driverName: "Kofi Asare",
                driverPhone: "0557000041",
                capacity: 4000,
                isAvailable: true,
                latitude: 10.7910,
                longitude: -0.8470,
                lastSeen: online,
              },
              {
                vehicleType: "VAN",
                licensePlate: "UER-2234-22",
                driverName: "Fatima Yakubu",
                driverPhone: "0557000042",
                capacity: 600,
                isAvailable: true,
                latitude: 10.7780,
                longitude: -0.8580,
                lastSeen: away2,
              },
              {
                vehicleType: "PICKUP_TRUCK",
                licensePlate: "UER-4401-24",
                driverName: "Baba Alhassan",
                driverPhone: "0557000043",
                capacity: 900,
                isAvailable: true,
                latitude: 10.7860,
                longitude: -0.8500,
                lastSeen: null, // offline for test variety
              },
            ],
          },
        },
      },
    },
  });

  // Refresh Savannah Transport Co vehicles on every run
  await prisma.vendorVehicle.updateMany({
    where: { licensePlate: "UER-1190-20" },
    data: { lastSeen: online, latitude: 10.7910, longitude: -0.8470 },
  });
  await prisma.vendorVehicle.updateMany({
    where: { licensePlate: "UER-2234-22" },
    data: { lastSeen: away2, latitude: 10.7780, longitude: -0.8580 },
  });
  await prisma.vendorVehicle.updateMany({
    where: { licensePlate: "UER-4401-24" },
    data: { lastSeen: null },
  });

  // Patch product images for Savannah Transport Co
  await prisma.vendorProduct.updateMany({ where: { name: "Transport Insurance (Perishables)" }, data: { images: ["https://images.unsplash.com/photo-1506306460327-3164753b74c7?w=800&q=80"] } });
  await prisma.vendorProduct.updateMany({ where: { name: "Produce Crates (40L)" }, data: { images: ["https://images.unsplash.com/photo-1671528443118-fae6bf05e60d?w=800&q=80"] } });

  void vendor2;

  // ── Admin user ────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { phone: "0244000099" },
    update: {},
    create: {
      name: "Lorgric Admin",
      phone: "0244000099",
      password: hashedPassword,
      role: "ADMIN",
      isVerified: true,
      verifiedAt,
      region: "Northern Region",
      district: "Tamale Metropolitan",
      ghanaCardNumber: "GHA-000000099-0",
      ghanaCardName: "Lorgric Admin",
    },
  });

  // Approve all existing seed listings so they show on marketplace
  await prisma.produceListing.updateMany({
    where: { approvalStatus: "PENDING" },
    data: { approvalStatus: "APPROVED" },
  });

  console.log(`
✅ Seed complete!

Demo accounts (password: password123):
  Farmer 1:   0244000001  (Kofi Mensah — verified ✓, Tamale)
  Farmer 2:   0244000002  (Amina Issahaku — verified ✓, Bolgatanga)
  Farmer 3:   0244000003  (Yakubu Alhassan, Wa)
  Buyer 1:    0244000010  (Grace Agyemang — verified ✓)
  Buyer 2:    0244000011  (Ibrahim Kwesi)
  Rider 1:    0244000020  (Abdul Razak — ONLINE, Tamale)
  Rider 2:    0244000021  (Fuseini Dauda — AWAY, Tamale)
  Rider 3:    0244000022  (Mariama Sumaila — OFFLINE, Tamale)
  Rider 4:    0244000023  (Shaibu Alidu — ONLINE, Bolgatanga)
  Vendor 1:   0244000030  (Kwame Darko — AgroSupplies Ghana, Tamale)
                           Vehicles: MINIBUS (online), PICKUP_TRUCK (away)
  Vendor 2:   0244000031  (Abena Fordjour — Savannah Transport Co, Bolgatanga)
                           Vehicles: BUS (online), VAN (away), PICKUP_TRUCK (offline)
  Admin:      0244000099  (Lorgric Admin)
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
