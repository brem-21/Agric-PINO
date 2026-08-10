import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NORTHERN_GHANA_REGIONS, haversineDistance } from "@/lib/utils";

// Farmers whose nearest APPROVED storage facility is farther than this are
// treated as effectively unreached — beyond a practical same-day round trip
// with perishable produce on Northern Ghana's feeder roads.
const STRANDED_KM = 50;

const UNSPECIFIED_REGION = "Unspecified Region";

type GapSeverity = "no_facility" | "high" | "moderate" | "low";

interface RegionDemand {
  region: string;
  farmerCount: number;
  locatedFarmerCount: number;
  unlocatedFarmerCount: number;
  strandedFarmerCount: number;
  approvedFacilityCount: number;
  approvedCapacityTonnes: number;
  facilitiesByType: { COLD_CHAIN: number; HERMETIC_DRY: number };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    rejected: number;
    droppedOff: number;
    rejectedValueGHS: number;
    pipelineValueGHS: number;
  };
  rejectionRate: number | null;
  topDistricts: { district: string; bookingCount: number; rejectedCount: number }[];
  sampleRejectionNotes: { cropType: string; quantity: number; unit: string; note: string }[];
  gapSeverity: GapSeverity;
}

// Aggregates the platform's own booking/facility/farmer data into the
// evidence base for pitching new storage capacity to an NGO, DFI, or bank —
// not an operations screen, a "here's where demand outruns supply" report.
// Three signals, one per region: bookings a facility had to turn away,
// farmers too far from any approved facility to realistically use one, and
// regions with no approved facility at all.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") ?? "", 10);
  const since = Number.isFinite(days) && days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;

  const [farmers, facilities, bookings] = await Promise.all([
    prisma.user.findMany({
      where: { role: "FARMER", isActive: true },
      select: {
        region: true,
        district: true,
        farmerProfile: { select: { latitude: true, longitude: true } },
      },
    }),
    prisma.storageFacilityProfile.findMany({
      where: { approvalStatus: "APPROVED" },
      select: {
        latitude: true,
        longitude: true,
        storageTypes: true,
        capacityTonnes: true,
        user: { select: { region: true } },
      },
    }),
    prisma.storageBooking.findMany({
      where: since ? { createdAt: { gte: since } } : undefined,
      select: {
        status: true,
        quantity: true,
        pricePerUnit: true,
        cropType: true,
        unit: true,
        facilityNotes: true,
        farmer: { select: { region: true, district: true } },
      },
    }),
  ]);

  const locatedFacilities = facilities.filter(
    (f) => f.latitude != null && f.longitude != null
  ) as (typeof facilities[number] & { latitude: number; longitude: number })[];

  function nearestFacilityKm(lat: number, lon: number): number | null {
    if (locatedFacilities.length === 0) return null;
    let min = Infinity;
    for (const f of locatedFacilities) {
      const d = haversineDistance(lat, lon, f.latitude, f.longitude);
      if (d < min) min = d;
    }
    return min;
  }

  const regionNames = [...NORTHERN_GHANA_REGIONS, UNSPECIFIED_REGION];

  const regions: RegionDemand[] = regionNames
    .map((region) => {
      const regionFarmers = farmers.filter((f) => (f.region ?? UNSPECIFIED_REGION) === region);
      const located = regionFarmers.filter(
        (f) => f.farmerProfile?.latitude != null && f.farmerProfile?.longitude != null
      );
      const strandedCount = located.filter((f) => {
        const km = nearestFacilityKm(f.farmerProfile!.latitude!, f.farmerProfile!.longitude!);
        return km === null || km > STRANDED_KM;
      }).length;

      const regionFacilities = facilities.filter((f) => (f.user.region ?? UNSPECIFIED_REGION) === region);
      const facilitiesByType = { COLD_CHAIN: 0, HERMETIC_DRY: 0 };
      let approvedCapacityTonnes = 0;
      for (const f of regionFacilities) {
        approvedCapacityTonnes += f.capacityTonnes ?? 0;
        if (f.storageTypes.includes("COLD_CHAIN")) facilitiesByType.COLD_CHAIN++;
        if (f.storageTypes.includes("HERMETIC_DRY")) facilitiesByType.HERMETIC_DRY++;
      }

      const regionBookings = bookings.filter((b) => (b.farmer.region ?? UNSPECIFIED_REGION) === region);
      const counts = {
        total: 0, pending: 0, confirmed: 0, rejected: 0, droppedOff: 0,
        rejectedValueGHS: 0, pipelineValueGHS: 0,
      };
      const districtMap = new Map<string, { bookingCount: number; rejectedCount: number }>();
      const sampleRejectionNotes: RegionDemand["sampleRejectionNotes"] = [];

      for (const b of regionBookings) {
        const value = b.quantity * b.pricePerUnit;
        counts.total++;
        counts.pipelineValueGHS += value;
        if (b.status === "PENDING") counts.pending++;
        if (b.status === "CONFIRMED") counts.confirmed++;
        if (b.status === "DROPPED_OFF") counts.droppedOff++;
        if (b.status === "REJECTED") {
          counts.rejected++;
          counts.rejectedValueGHS += value;
          if (b.facilityNotes && sampleRejectionNotes.length < 3) {
            sampleRejectionNotes.push({ cropType: b.cropType, quantity: b.quantity, unit: b.unit, note: b.facilityNotes });
          }
        }

        const district = b.farmer.district ?? "Unspecified district";
        const entry = districtMap.get(district) ?? { bookingCount: 0, rejectedCount: 0 };
        entry.bookingCount++;
        if (b.status === "REJECTED") entry.rejectedCount++;
        districtMap.set(district, entry);
      }

      const decided = counts.confirmed + counts.rejected + counts.droppedOff;
      const rejectionRate = decided > 0 ? counts.rejected / decided : null;

      const topDistricts = [...districtMap.entries()]
        .map(([district, v]) => ({ district, ...v }))
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, 5);

      let gapSeverity: GapSeverity = "low";
      if (regionFacilities.length === 0 && (regionFarmers.length > 0 || counts.total > 0)) {
        gapSeverity = "no_facility";
      } else if (rejectionRate !== null && rejectionRate >= 0.3) {
        gapSeverity = "high";
      } else if ((rejectionRate !== null && rejectionRate >= 0.1) || strandedCount >= 5) {
        gapSeverity = "moderate";
      }

      return {
        region,
        farmerCount: regionFarmers.length,
        locatedFarmerCount: located.length,
        unlocatedFarmerCount: regionFarmers.length - located.length,
        strandedFarmerCount: strandedCount,
        approvedFacilityCount: regionFacilities.length,
        approvedCapacityTonnes,
        facilitiesByType,
        bookings: counts,
        rejectionRate,
        topDistricts,
        sampleRejectionNotes,
        gapSeverity,
      };
    })
    .filter((r) => r.farmerCount > 0 || r.approvedFacilityCount > 0 || r.bookings.total > 0);

  const severityRank: Record<GapSeverity, number> = { no_facility: 3, high: 2, moderate: 1, low: 0 };
  regions.sort((a, b) => severityRank[b.gapSeverity] - severityRank[a.gapSeverity]);

  const summary = {
    totalStrandedFarmers: regions.reduce((s, r) => s + r.strandedFarmerCount, 0),
    totalRejectedValueGHS: regions.reduce((s, r) => s + r.bookings.rejectedValueGHS, 0),
    totalPipelineValueGHS: regions.reduce((s, r) => s + r.bookings.pipelineValueGHS, 0),
    regionsWithNoFacility: regions.filter((r) => r.gapSeverity === "no_facility").length,
    strandedKmThreshold: STRANDED_KM,
  };

  return NextResponse.json({ regions, summary });
}
