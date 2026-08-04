import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { config } from "dotenv";

config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as never);

// Mirrors src/lib/utils.ts's FACILITY_COMMISSION_RATE — duplicated rather than
// imported since this script runs standalone via tsx, outside Next's alias resolution.
const FACILITY_COMMISSION_RATE_SEED = 0.05;

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 12);
  const verifiedAt = new Date("2026-01-15");

  // Relative to the seed run, not a fixed calendar date — so re-running this
  // seed months from now doesn't leave every demo listing looking already
  // expired-and-unsold (which would show as a misleadingly ~100% post-harvest
  // loss on the farmer dashboard purely from stale seed dates, not real data).
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

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
          businessType: "WHOLESALER",
          description: "Buys in bulk from farmers and storage facilities for resale to Tamale-area retailers",
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

  const logistics2 = await prisma.user.upsert({
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

  // 5th rider — registered with a truck, for hauling larger consignments
  // (grain, yams) that a motorbike can't carry.
  await prisma.user.upsert({
    where: { phone: "0244000024" },
    update: { lastSeen: online, latitude: 9.4200, longitude: -0.8300 },
    create: {
      name: "Iddrisu Baba",
      phone: "0244000024",
      password: hashedPassword,
      role: "LOGISTICS",
      region: "Northern Region",
      ghanaCardNumber: "GHA-912345678-9",
      ghanaCardName: "Iddrisu Baba Yakubu",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt,
      lastSeen: online,
      latitude: 9.4200,
      longitude: -0.8300,
      logisticsProfile: {
        create: {
          companyName: "Baba Haulage",
          vehicleType: "TRUCK",
          licensePlate: "NR-7734-24",
          coverageAreas: ["Northern Region", "Upper East Region", "Upper West Region"],
          isAvailable: true,
          rating: 4.5,
          totalRatings: 9,
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
        harvestDate: daysAgo(6),
        expiryDate: daysFromNow(4),
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
        harvestDate: daysAgo(10),
        expiryDate: daysFromNow(20),
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
        harvestDate: daysAgo(8),
        expiryDate: daysFromNow(15),
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
        harvestDate: daysAgo(9),
        expiryDate: daysFromNow(2),
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
        harvestDate: daysAgo(40),
        expiryDate: daysFromNow(60),
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
        harvestDate: daysAgo(45),
        expiryDate: daysFromNow(180),
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

  // ── Storage Facility 1: Bolgatanga Cold Storage (Upper East Region) ──────
  // The flagship facility — cold-chain storage for the tomato/vegetable
  // corridor this platform is built around (see Anaba, 2018, Upper East
  // tomato value chain post-harvest loss study).
  const facility1 = await prisma.user.upsert({
    where: { phone: "0244000030" },
    update: {},
    create: {
      name: "Kwame Darko",
      phone: "0244000030",
      password: hashedPassword,
      role: "STORAGE_FACILITY",
      region: "Upper East Region",
      district: "Bolgatanga Municipal",
      ghanaCardNumber: "GHA-900000030-0",
      ghanaCardName: "Kwame Darko",
      residenceLocation: "Bolgatanga, Upper East Region",
      isVerified: true,
      verifiedAt: new Date("2026-01-05"),
      latitude: 10.7830,
      longitude: -0.8520,
      lastSeen: away2,
      storageFacilityProfile: {
        create: {
          name: "Bolgatanga Cold Storage",
          description: "Cold-chain storage for tomatoes and perishable vegetables serving the Upper East tomato corridor.",
          location: "Bolgatanga, Upper East Region",
          latitude: 10.7830,
          longitude: -0.8520,
          storageTypes: ["COLD_CHAIN"],
          capacityTonnes: 40,
          acceptedCategories: ["VEGETABLES", "FRUITS"],
          operatingHours: "Mon–Sat 7am–6pm",
          approvalStatus: "APPROVED",
          rating: 4.6,
          totalRatings: 19,
        },
      },
    },
  });

  // ── Storage Facility 2: Tamale Grain Reserve (Northern Region) ────────────
  // Hermetic/dry (PICS-bag style) storage for grains and legumes.
  const facility2 = await prisma.user.upsert({
    where: { phone: "0244000031" },
    update: {},
    create: {
      name: "Abena Fordjour",
      phone: "0244000031",
      password: hashedPassword,
      role: "STORAGE_FACILITY",
      region: "Northern Region",
      district: "Tamale Metropolitan",
      ghanaCardNumber: "GHA-900000031-1",
      ghanaCardName: "Abena Fordjour",
      residenceLocation: "Tamale, Northern Region",
      isVerified: true,
      verifiedAt: new Date("2026-02-10"),
      latitude: 9.4075,
      longitude: -0.8533,
      lastSeen: online,
      storageFacilityProfile: {
        create: {
          name: "Tamale Grain Reserve",
          description: "Hermetic dry storage (PICS-bag style) for grains and legumes across Northern Region.",
          location: "Tamale, Northern Region",
          latitude: 9.4075,
          longitude: -0.8533,
          storageTypes: ["HERMETIC_DRY"],
          capacityTonnes: 120,
          acceptedCategories: ["GRAINS", "LEGUMES", "TUBERS"],
          operatingHours: "Mon–Fri 8am–5pm",
          approvalStatus: "APPROVED",
          rating: 4.4,
          totalRatings: 11,
        },
      },
    },
  });

  const bolgatangaFacility = await prisma.storageFacilityProfile.findUniqueOrThrow({ where: { userId: facility1.id } });
  const tamaleFacility = await prisma.storageFacilityProfile.findUniqueOrThrow({ where: { userId: facility2.id } });

  // Demo booking 1: Amina's tomatoes already dropped off and auto-listed for
  // sale through Bolgatanga Cold Storage — the "storage facility in the loop"
  // flow this platform is built around, at the DROPPED_OFF end of the lifecycle.
  const existingDropoffBooking = await prisma.storageBooking.findFirst({
    where: { facilityId: bolgatangaFacility.id, farmerId: farmer2.id, cropType: "Tomatoes" },
  });
  if (!existingDropoffBooking) {
    const storedTomatoListing = await prisma.produceListing.create({
      data: {
        farmerId: farmer2.id,
        cropType: "Tomatoes",
        category: "VEGETABLES",
        quantity: 400,
        unit: "kg",
        pricePerUnit: 14,
        currency: "GHS",
        description: "Roma tomatoes held in cold storage at Bolgatanga Cold Storage — ready for bulk pickup.",
        images: ["https://images.unsplash.com/photo-1592841200221-a6898f307baa?w=800&q=80"],
        harvestDate: daysAgo(6),
        expiryDate: daysFromNow(14),
        location: bolgatangaFacility.location,
        latitude: bolgatangaFacility.latitude,
        longitude: bolgatangaFacility.longitude,
        status: "ACTIVE",
        approvalStatus: "APPROVED",
        storageFacilityId: bolgatangaFacility.id,
      },
    });

    await prisma.storageBooking.create({
      data: {
        facilityId: bolgatangaFacility.id,
        farmerId: farmer2.id,
        listingId: storedTomatoListing.id,
        cropType: "Tomatoes",
        category: "VEGETABLES",
        quantity: 400,
        unit: "kg",
        pricePerUnit: 14,
        scheduledDropoff: daysAgo(6),
        status: "DROPPED_OFF",
        confirmedAt: daysAgo(7),
        droppedOffAt: daysAgo(6),
      },
    });
  }

  // Demo booking 2: Yakubu's sorghum confirmed for drop-off at the grain
  // reserve but not yet delivered — the earlier, CONFIRMED stage of the pipeline.
  const existingConfirmedBooking = await prisma.storageBooking.findFirst({
    where: { facilityId: tamaleFacility.id, farmerId: farmer3.id, cropType: "Sorghum" },
  });
  if (!existingConfirmedBooking) {
    await prisma.storageBooking.create({
      data: {
        facilityId: tamaleFacility.id,
        farmerId: farmer3.id,
        cropType: "Sorghum",
        category: "GRAINS",
        quantity: 1000,
        unit: "kg",
        pricePerUnit: 3.5,
        scheduledDropoff: daysFromNow(3),
        status: "CONFIRMED",
        confirmedAt: daysAgo(2),
      },
    });
  }

  // ── Storage Facility 3: Wa Community Store (unverified) ──────────────────
  // Deliberately unverified with 10 DROPPED_OFF bookings, so it shows up in
  // the admin "Eligible, not yet applied" verification queue.
  const facility3 = await prisma.user.upsert({
    where: { phone: "0244000032" },
    update: {},
    create: {
      name: "Salifu Baako",
      phone: "0244000032",
      password: hashedPassword,
      role: "STORAGE_FACILITY",
      region: "Upper West Region",
      district: "Wa Municipal",
      ghanaCardNumber: "GHA-900000032-2",
      ghanaCardName: "Salifu Baako",
      residenceLocation: "Wa, Upper West Region",
      isVerified: false,
      latitude: 10.0580,
      longitude: -2.5040,
      storageFacilityProfile: {
        create: {
          name: "Wa Community Store",
          description: "Community-run dry storage for tubers and grains in Wa.",
          location: "Wa, Upper West Region",
          latitude: 10.0580,
          longitude: -2.5040,
          storageTypes: ["HERMETIC_DRY"],
          capacityTonnes: 25,
          acceptedCategories: ["TUBERS", "GRAINS"],
          operatingHours: "Mon–Sat 8am–5pm",
          approvalStatus: "APPROVED",
          rating: 0,
          totalRatings: 0,
        },
      },
    },
  });
  const waFacility = await prisma.storageFacilityProfile.findUniqueOrThrow({ where: { userId: facility3.id } });

  const waBookingCount = await prisma.storageBooking.count({
    where: { facilityId: waFacility.id, farmerId: farmer3.id, status: "DROPPED_OFF" },
  });
  for (let i = waBookingCount; i < 10; i++) {
    await prisma.storageBooking.create({
      data: {
        facilityId: waFacility.id,
        farmerId: farmer3.id,
        cropType: "Yams",
        category: "TUBERS",
        quantity: 50,
        unit: "kg",
        pricePerUnit: 8,
        scheduledDropoff: daysAgo(30 - i),
        status: "DROPPED_OFF",
        confirmedAt: daysAgo(31 - i),
        droppedOffAt: daysAgo(30 - i),
      },
    });
  }

  // Equipment — set via a direct update rather than the upsert's nested
  // `create` above, since `update: {}` on the outer user upsert means an
  // already-existing facility profile is otherwise never touched on reseed.
  await Promise.all([
    prisma.storageFacilityProfile.update({
      where: { id: bolgatangaFacility.id },
      data: { equipment: ["REFRIGERATORS", "BACKUP_GENERATOR"] },
    }),
    prisma.storageFacilityProfile.update({
      where: { id: tamaleFacility.id },
      data: { equipment: ["DRYERS", "DRYING_PANS", "WEIGHING_SCALES"] },
    }),
    prisma.storageFacilityProfile.update({
      where: { id: waFacility.id },
      data: { equipment: ["DRYING_PANS", "VENTILATION_FANS"] },
    }),
  ]);

  void facility1;
  void facility2;

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

  // ── Incident Team (Macho Men Association) ─────────────────────────────────
  // Kofi keeps his FARMER role — isIncidentTeam is an add-on capability, not
  // a role swap.
  await prisma.user.update({ where: { id: farmer1.id }, data: { isIncidentTeam: true } });

  // ── Verification-threshold demo data ──────────────────────────────────────
  // Yakubu (farmer3) and Ibrahim (buyer2) are both seeded unverified above —
  // give each of them 10 DELIVERED orders so they cross the threshold and
  // surface in admin's "Eligible, not yet applied" verification queue.
  console.log("Seeding verification-threshold activity...");

  const buyer2 = await prisma.user.findUniqueOrThrow({ where: { phone: "0244000011" } });
  const yamsListing = await prisma.produceListing.findFirstOrThrow({ where: { farmerId: farmer3.id, cropType: "Yams" } });
  const tomatoesListing = await prisma.produceListing.findFirstOrThrow({ where: { farmerId: farmer1.id, cropType: "Tomatoes" } });

  // ── Orders routed through a storage facility ──────────────────────────────
  // So Storage 1 (Kwame Darko) has something on /storage/orders demonstrating
  // the full "facility manages orders on the farmer's behalf" flow.
  console.log("Seeding orders routed through a storage facility...");

  const storedTomatoListing = await prisma.produceListing.findFirstOrThrow({
    where: { storageFacilityId: bolgatangaFacility.id, farmerId: farmer2.id, cropType: "Tomatoes" },
  });

  const facilityOrderCount = await prisma.order.count({ where: { storageFacilityId: bolgatangaFacility.id } });
  if (facilityOrderCount === 0) {
    // One fresh order awaiting the facility's confirmation...
    await prisma.order.create({
      data: {
        buyerId: buyer1.id,
        farmerId: farmer2.id,
        listingId: storedTomatoListing.id,
        quantity: 30,
        totalAmount: 30 * storedTomatoListing.pricePerUnit,
        status: "PENDING",
        paymentStatus: "UNPAID",
        fulfillmentType: "DELIVERY",
        storageFacilityId: bolgatangaFacility.id,
        facilityCommissionRate: FACILITY_COMMISSION_RATE_SEED,
        facilityCommissionAmount: 30 * storedTomatoListing.pricePerUnit * FACILITY_COMMISSION_RATE_SEED,
      },
    });
    // ...and one already paid, ready for the facility to arrange delivery.
    await prisma.order.create({
      data: {
        buyerId: buyer2.id,
        farmerId: farmer2.id,
        listingId: storedTomatoListing.id,
        quantity: 50,
        totalAmount: 50 * storedTomatoListing.pricePerUnit,
        status: "CONFIRMED",
        paymentStatus: "PAID",
        fulfillmentType: "DELIVERY",
        storageFacilityId: bolgatangaFacility.id,
        facilityCommissionRate: FACILITY_COMMISSION_RATE_SEED,
        facilityCommissionAmount: 50 * storedTomatoListing.pricePerUnit * FACILITY_COMMISSION_RATE_SEED,
        createdAt: daysAgo(2),
      },
    });
  }

  const farmer3DeliveredCount = await prisma.order.count({ where: { farmerId: farmer3.id, status: "DELIVERED" } });
  for (let i = farmer3DeliveredCount; i < 10; i++) {
    await prisma.order.create({
      data: {
        buyerId: buyer1.id,
        farmerId: farmer3.id,
        listingId: yamsListing.id,
        quantity: 20,
        totalAmount: 20 * yamsListing.pricePerUnit,
        status: "DELIVERED",
        paymentStatus: "PAID",
        createdAt: daysAgo(30 - i),
      },
    });
  }

  const buyer2DeliveredCount = await prisma.order.count({ where: { buyerId: buyer2.id, status: "DELIVERED" } });
  for (let i = buyer2DeliveredCount; i < 10; i++) {
    await prisma.order.create({
      data: {
        buyerId: buyer2.id,
        farmerId: farmer1.id,
        listingId: tomatoesListing.id,
        quantity: 10,
        totalAmount: 10 * tomatoesListing.pricePerUnit,
        status: "DELIVERED",
        paymentStatus: "PAID",
        createdAt: daysAgo(25 - i),
      },
    });
  }

  // Fuseini (logistics2) is seeded unverified above — give his profile 10
  // DELIVERED transport requests to cross the same threshold.
  const fuseiniProfile = await prisma.logisticsProfile.findUniqueOrThrow({ where: { userId: logistics2.id } });
  const fuseiniDeliveredCount = await prisma.transportRequest.count({ where: { providerId: fuseiniProfile.id, status: "DELIVERED" } });
  for (let i = fuseiniDeliveredCount; i < 10; i++) {
    await prisma.transportRequest.create({
      data: {
        requesterId: farmer1.id,
        providerId: fuseiniProfile.id,
        pickupLocation: "Tamale, Northern Region",
        pickupLat: 9.4008,
        pickupLong: -0.8393,
        deliveryLocation: "Tamale Central Market",
        deliveryLat: 9.4075,
        deliveryLong: -0.8533,
        scheduledDate: daysAgo(20 - i),
        estimatedCost: 30,
        actualCost: 30,
        status: "DELIVERED",
      },
    });
  }

  // ── Repeat-offender demo data ──────────────────────────────────────────────
  // Ibrahim (buyer2) is the target of 5 complaints from 5 different
  // reporters — enough to surface in the repeat-offenders table (threshold 5).
  console.log("Seeding repeat-offender complaint data...");

  const complaintReporters = [farmer1.id, farmer2.id, farmer3.id, buyer1.id, logistics1.id];
  const existingComplaintsAgainstBuyer2 = await prisma.complaint.count({ where: { targetUserId: buyer2.id } });
  for (let i = existingComplaintsAgainstBuyer2; i < complaintReporters.length; i++) {
    await prisma.complaint.create({
      data: {
        reporterId: complaintReporters[i],
        targetUserId: buyer2.id,
        subject: "Late payment for delivered produce",
        category: "PAYMENT_DISPUTE",
        description: "This buyer has repeatedly delayed payment after produce was delivered, well past the agreed timeline.",
        status: "OPEN",
        createdAt: daysAgo(15 - i),
      },
    });
  }

  // One complaint against Ibrahim gets assigned to Kofi (the seeded Macho), so
  // the "Assigned to Me" queue in the Incident Team portal isn't empty.
  const firstComplaintAgainstBuyer2 = await prisma.complaint.findFirst({
    where: { targetUserId: buyer2.id, assignedToId: null },
    orderBy: { createdAt: "asc" },
  });
  if (firstComplaintAgainstBuyer2) {
    await prisma.complaint.update({
      where: { id: firstComplaintAgainstBuyer2.id },
      data: { assignedToId: farmer1.id, status: "UNDER_REVIEW" },
    });
  }

  // ── A second Incident Team applicant (still PENDING) ──────────────────────
  // So admin's "Macho Applications" queue has something to review, distinct
  // from Kofi who's already approved.
  console.log("Seeding a pending Incident Team application...");

  const applicant = await prisma.user.upsert({
    where: { phone: "0244000040" },
    update: {},
    create: {
      name: "Salamatu Yahaya",
      phone: "0244000040",
      password: hashedPassword,
      role: "BUYER",
      region: "Northern Region",
      district: "Tamale Metro",
      ghanaCardNumber: "GHA-923456789-0",
      ghanaCardName: "Salamatu Yahaya",
      residenceLocation: "Tamale, Northern Region",
      isVerified: false,
      buyerProfile: {
        create: {
          businessName: "Salamatu's Provisions",
          businessType: "RETAILER",
          description: "Neighbourhood provisions shop in Tamale.",
        },
      },
    },
  });
  await prisma.incidentTeamRequest.upsert({
    where: { userId: applicant.id },
    update: {},
    create: {
      userId: applicant.id,
      reason: "I want to help keep the platform fair — I've seen a few disputes in my area that could use a mediator.",
      status: "PENDING",
    },
  });

  // ── A submitted-and-pending verification application ──────────────────────
  // Yakubu (farmer3) already crossed the 10-order threshold above; here he
  // actually submits, so admin's "Pending" tab (not just "Eligible") has data.
  console.log("Seeding a pending verification application...");

  await prisma.verificationRequest.upsert({
    where: { id: `seed-verification-${farmer3.id}` },
    update: {},
    create: {
      id: `seed-verification-${farmer3.id}`,
      userId: farmer3.id,
      role: "FARMER",
      ghanaCardNumber: "GHA-345678901-2",
      ghanaCardName: "Yakubu Mohammed Alhassan",
      residenceLocation: "Wa, Upper West Region",
      idPhotoFront: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?w=800&q=80",
      status: "PENDING",
    },
  });

  console.log(`
✅ Seed complete!

Demo accounts (password: password123):
  Farmer 1:   0244000001  (Kofi Mensah — verified ✓, Tamale — Incident Team member)
  Farmer 2:   0244000002  (Amina Issahaku — verified ✓, Bolgatanga)
  Farmer 3:   0244000003  (Yakubu Alhassan, Wa — verification eligible + PENDING request)
  Buyer 1:    0244000010  (Grace Agyemang — verified ✓, Wholesaler)
  Buyer 2:    0244000011  (Ibrahim Kwesi — verification eligible, 5x reported/flagged)
  Rider 1:    0244000020  (Abdul Razak — ONLINE, Tamale)
  Rider 2:    0244000021  (Fuseini Dauda — AWAY, Tamale — verification eligible)
  Rider 3:    0244000022  (Mariama Sumaila — OFFLINE, Tamale)
  Rider 4:    0244000023  (Shaibu Alidu — ONLINE, Bolgatanga)
  Rider 5:    0244000024  (Iddrisu Baba — ONLINE, Tamale — TRUCK)
  Storage 1:  0244000030  (Kwame Darko — Bolgatanga Cold Storage, Upper East)
                           Amina's tomatoes are already dropped off & listed here
  Storage 2:  0244000031  (Abena Fordjour — Tamale Grain Reserve, Northern)
                           Yakubu's sorghum has a CONFIRMED drop-off booking here
  Storage 3:  0244000032  (Salifu Baako — Wa Community Store — verification eligible)
  Buyer 3:    0244000040  (Salamatu Yahaya — PENDING Incident Team application)
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
