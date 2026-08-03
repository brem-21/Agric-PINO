import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRange } from "@/lib/analytics-range";
import type { Prisma } from "@prisma/client";

const TOP_LOCATIONS = 6;
const ROLES = ["FARMER", "BUYER", "LOGISTICS", "STORAGE_FACILITY", "ADMIN"] as const;

function previousWindow(from: Date, to: Date): { from: Date; to: Date } {
  const durationMs = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - durationMs), to: new Date(from.getTime()) };
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null; // null → frontend renders "New"
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

async function computeTotals(where: Prisma.UserEventWhereInput) {
  const [totalEvents, sessionGroups, userGroups, typeGroups] = await Promise.all([
    prisma.userEvent.count({ where }),
    prisma.userEvent.groupBy({ by: ["sessionId"], where }),
    prisma.userEvent.groupBy({ by: ["userId"], where: { ...where, userId: { not: null } } }),
    prisma.userEvent.groupBy({ by: ["type"], where }),
  ]);
  const uniqueSessions = sessionGroups.length;
  return {
    totalEvents,
    uniqueSessions,
    uniqueUsers: userGroups.length,
    distinctEventTypes: typeGroups.length,
    avgEventsPerSession: uniqueSessions > 0 ? Math.round((totalEvents / uniqueSessions) * 10) / 10 : 0,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range") ?? "month";
  const location = searchParams.get("location");
  const role = searchParams.get("role");
  const os = searchParams.get("os");

  const { from, to } = resolveRange(range, searchParams.get("from"), searchParams.get("to"));
  const prev = previousWindow(from, to);

  const baseWhere: Prisma.UserEventWhereInput = {
    ...(location && { placeName: location }),
    ...(role && { user: { role: role as never } }),
    ...(os && { os }),
  };
  const currentWhere: Prisma.UserEventWhereInput = { ...baseWhere, createdAt: { gte: from, lte: to } };
  const previousWhere: Prisma.UserEventWhereInput = { ...baseWhere, createdAt: { gte: prev.from, lt: prev.to } };

  const [
    currentTotals,
    previousTotals,
    deviceGroups,
    osGroups,
    typeGroups,
    locationGroups,
    allLocationRows,
    allOsRows,
  ] = await Promise.all([
    computeTotals(currentWhere),
    computeTotals(previousWhere),
    prisma.userEvent.groupBy({ by: ["deviceType"], where: { ...currentWhere, deviceType: { not: null } }, _count: true }),
    prisma.userEvent.groupBy({ by: ["os"], where: { ...currentWhere, os: { not: null } }, _count: true }),
    prisma.userEvent.groupBy({ by: ["type"], where: currentWhere, _count: true }),
    prisma.userEvent.groupBy({ by: ["placeName"], where: { ...currentWhere, placeName: { not: null } }, _count: true }),
    prisma.userEvent.groupBy({ by: ["placeName"], where: { placeName: { not: null } } }),
    prisma.userEvent.groupBy({ by: ["os"], where: { os: { not: null } } }),
  ]);

  const withPct = (rows: { key: string; count: number }[], total: number) =>
    rows
      .sort((a, b) => b.count - a.count)
      .map((r) => ({ ...r, pct: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0 }));

  const deviceBreakdown = withPct(
    deviceGroups.map((g) => ({ key: g.deviceType as string, count: g._count })),
    currentTotals.totalEvents
  );

  const osBreakdown = withPct(
    osGroups.map((g) => ({ key: g.os as string, count: g._count })),
    currentTotals.totalEvents
  );

  const typeBreakdown = withPct(
    typeGroups.map((g) => ({ key: g.type, count: g._count })),
    currentTotals.totalEvents
  );

  const allLocations = withPct(
    locationGroups.map((g) => ({ key: g.placeName as string, count: g._count })),
    currentTotals.totalEvents
  );
  const locationBreakdown = allLocations.slice(0, TOP_LOCATIONS);
  const otherLocationsCount = allLocations.slice(TOP_LOCATIONS).reduce((sum, r) => sum + r.count, 0);
  if (otherLocationsCount > 0) {
    locationBreakdown.push({
      key: "Other",
      count: otherLocationsCount,
      pct: Math.round((otherLocationsCount / currentTotals.totalEvents) * 1000) / 10,
    });
  }

  return NextResponse.json({
    totals: {
      totalEvents: { value: currentTotals.totalEvents, growth: pctChange(currentTotals.totalEvents, previousTotals.totalEvents) },
      uniqueSessions: { value: currentTotals.uniqueSessions, growth: pctChange(currentTotals.uniqueSessions, previousTotals.uniqueSessions) },
      uniqueUsers: { value: currentTotals.uniqueUsers, growth: pctChange(currentTotals.uniqueUsers, previousTotals.uniqueUsers) },
      distinctEventTypes: { value: currentTotals.distinctEventTypes, growth: pctChange(currentTotals.distinctEventTypes, previousTotals.distinctEventTypes) },
      avgEventsPerSession: { value: currentTotals.avgEventsPerSession, growth: pctChange(currentTotals.avgEventsPerSession, previousTotals.avgEventsPerSession) },
    },
    deviceBreakdown,
    osBreakdown,
    typeBreakdown,
    locationBreakdown,
    filterOptions: {
      locations: allLocationRows.map((r) => r.placeName as string).sort(),
      roles: ROLES,
      os: allOsRows.map((r) => r.os as string).sort(),
    },
  });
}
