import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ProfileImageUpload } from "@/components/shared/profile-image-upload";
import { ProfileEditForm } from "@/components/shared/profile-edit-form";
import { Leaf, ShoppingBag, Bike, Warehouse, ShieldCheck, ChevronRight, ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { isVerificationApplicableRole } from "@/lib/verification";
import { getDashboardPath } from "@/lib/dashboard-path";

const ROLE_LABEL: Record<string, string> = {
  FARMER: "Farmer",
  BUYER: "Buyer",
  LOGISTICS: "Logistics Rider",
  STORAGE_FACILITY: "Storage Facility",
  ADMIN: "Admin",
};

const ROLE_COLOR: Record<string, string> = {
  FARMER: "bg-[#d3fa99] text-[#1c3a13]",
  BUYER: "bg-[#eeeee9] text-[#1c3a13]",
  LOGISTICS: "bg-[#eeeee9] text-[#1c3a13]",
  STORAGE_FACILITY: "bg-[#eeeee9] text-[#1c3a13]",
  ADMIN: "bg-[#eeeee9] text-[#1c3a13]",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      farmerProfile: true,
      buyerProfile: true,
      logisticsProfile: true,
      storageFacilityProfile: true,
    },
  });

  if (!user) redirect("/auth/login");

  const roleIcon = user.role === "FARMER" ? <Leaf className="h-4 w-4" />
    : user.role === "BUYER" ? <ShoppingBag className="h-4 w-4" />
    : user.role === "STORAGE_FACILITY" ? <Warehouse className="h-4 w-4" />
    : <Bike className="h-4 w-4" />;

  return (
    <div className="min-h-screen bg-[#fcfcf7] py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <Link href={getDashboardPath(user.role)} className="flex items-center gap-1.5 text-sm text-[#1c3a13]/50 hover:text-[#1c3a13] w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Avatar card */}
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="relative inline-flex mb-4">
              <ProfileImageUpload currentImage={user.image} name={user.name} size={80} />
              {user.isVerified && (
                <span className="absolute bottom-0 right-0 translate-x-1 translate-y-1">
                  <VerifiedBadge verifiedAt={user.verifiedAt?.toISOString()} size="md" />
                </span>
              )}
            </div>
            <h1 className="text-xl font-light tracking-tight text-[#1c3a13] flex items-center justify-center gap-2">
              {user.name}
              {user.isVerified && <VerifiedBadge verifiedAt={user.verifiedAt?.toISOString()} size="sm" />}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${ROLE_COLOR[user.role]}`}>
                {roleIcon}
                {ROLE_LABEL[user.role]}
              </span>
            </div>
            <p className="text-sm text-[#1c3a13]/50 mt-1">Member since {formatDate(user.createdAt)}</p>
          </CardContent>
        </Card>

        {/* Verification entry point — ADMIN has no verification tier */}
        {isVerificationApplicableRole(user.role) && (
          <Link href="/verification" className="block">
            <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl hover:bg-[#eeeee9] transition-colors">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeee9] flex-shrink-0">
                  <ShieldCheck className="h-5 w-5 text-[#1c3a13]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1c3a13]">
                    {user.isVerified ? "Verification" : "Get Verified"}
                  </p>
                  <p className="text-xs text-[#1c3a13]/50">
                    {user.isVerified ? "Your account is verified" : "Apply for an identity verification badge"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Incident Team entry point — an add-on capability, not a role, so
            it's offered to any role (including admins, who already have it). */}
        {user.role !== "ADMIN" && (
          <Link href={user.isIncidentTeam ? "/incident-team" : "/incident-team/apply"} className="block">
            <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl hover:bg-[#eeeee9] transition-colors">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeee9] flex-shrink-0">
                  <span className="text-lg" role="img" aria-label="dumbbell">💪</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1c3a13]">
                    {user.isIncidentTeam ? "Incident Team Portal" : "Apply to be a Macho"}
                  </p>
                  <p className="text-xs text-[#1c3a13]/50">
                    {user.isIncidentTeam ? "Macho Men Association — review and resolve complaints" : "Join the Macho Men Association incident-response team"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#1c3a13]/40 flex-shrink-0" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Contact info + role-specific profile — editable */}
        <ProfileEditForm
          name={user.name}
          phone={user.phone}
          region={user.region}
          district={user.district}
          ghanaCardNumber={user.ghanaCardNumber}
          ghanaCardName={user.ghanaCardName}
          residenceLocation={user.residenceLocation}
          isVerified={user.isVerified}
          role={user.role}
          farmerProfile={user.farmerProfile}
          buyerProfile={user.buyerProfile}
          logisticsProfile={user.logisticsProfile}
          storageFacilityProfile={user.storageFacilityProfile}
        />
      </div>
    </div>
  );
}
