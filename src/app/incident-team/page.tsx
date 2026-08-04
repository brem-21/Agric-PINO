import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Users, CheckCircle, Clock, ArrowRight } from "lucide-react";

export default async function IncidentTeamDashboardPage() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && !session.user.isIncidentTeam)) redirect("/auth/login");

  const [unassignedOpen, assignedToMe, resolvedByMe, repeatOffenderCount] = await Promise.all([
    prisma.complaint.count({ where: { assignedToId: null, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.complaint.count({ where: { assignedToId: session.user.id, status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.complaint.count({ where: { resolvedById: session.user.id } }),
    prisma.complaint
      .groupBy({ by: ["targetUserId"], where: { targetUserId: { not: null } }, _count: true })
      .then((rows) => rows.filter((r) => r._count >= 5).length),
  ]);

  const stats = [
    { label: "Unassigned Complaints", value: unassignedOpen, icon: AlertTriangle, color: "bg-red-100 text-red-700" },
    { label: "Assigned to Me", value: assignedToMe, icon: Clock, color: "bg-[#fee2e2] text-[#7f1d1d]" },
    { label: "Resolved by Me", value: resolvedByMe, icon: CheckCircle, color: "bg-[#fecaca] text-[#7f1d1d]" },
    { label: "Repeat Offenders (5+)", value: repeatOffenderCount, icon: Users, color: "bg-amber-100 text-amber-700" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-tight text-[#7f1d1d]">Welcome, Macho 💪</h1>
        <p className="text-[#7f1d1d]/50 text-sm mt-1">
          The Macho Men Association handles incident response — reviewing and resolving complaints across the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#fef2f2] rounded-2xl border border-[#fee2e2] p-5">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-2xl font-bold text-[#7f1d1d] mt-3">{value}</p>
            <p className="text-sm text-[#7f1d1d]/50 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button asChild className="rounded-full bg-[#7f1d1d] text-[#fef2f2] hover:bg-[#991b1b]">
          <Link href="/incident-team/complaints">Review Complaints <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-[#fee2e2] text-[#7f1d1d] hover:bg-[#fee2e2]">
          <Link href="/incident-team/repeat-offenders">Repeat Offenders</Link>
        </Button>
      </div>
    </div>
  );
}
