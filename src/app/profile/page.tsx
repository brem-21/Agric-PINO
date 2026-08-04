import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerifiedBadge } from "@/components/shared/verified-badge";
import { ProfileImageUpload } from "@/components/shared/profile-image-upload";
import { Phone, MapPin, Star, Leaf, ShoppingBag, Bike, Warehouse, ShieldCheck, ChevronRight, ArrowLeft } from "lucide-react";
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

        {/* Contact info */}
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-[#1c3a13]">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-[#1c3a13]/40" />
              <span className="text-[#1c3a13]">{user.phone}</span>
            </div>
            {(user.region || user.district) && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-[#1c3a13]/40" />
                <span className="text-[#1c3a13]">{[user.district, user.region].filter(Boolean).join(", ")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-specific profile */}
        {user.farmerProfile && (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-[#1c3a13]">Farm Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#1c3a13]/50">Farm name</span>
                <span className="font-medium text-[#1c3a13]">{user.farmerProfile.farmName}</span>
              </div>
              {user.farmerProfile.farmSize && (
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/50">Farm size</span>
                  <span className="font-medium text-[#1c3a13]">{user.farmerProfile.farmSize} acres</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#1c3a13]/50">Location</span>
                <span className="font-medium text-[#1c3a13]">{user.farmerProfile.location}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#1c3a13]/50">Rating</span>
                <span className="flex items-center gap-1 font-medium text-[#1c3a13]">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  {user.farmerProfile.rating.toFixed(1)} ({user.farmerProfile.totalRatings})
                </span>
              </div>
              {user.farmerProfile.description && (
                <p className="text-[#1c3a13]/70 pt-1 border-t border-[#eeeee9]">{user.farmerProfile.description}</p>
              )}
            </CardContent>
          </Card>
        )}

        {user.buyerProfile && (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-[#1c3a13]">Buyer Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {user.buyerProfile.businessName && (
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/50">Business</span>
                  <span className="font-medium text-[#1c3a13]">{user.buyerProfile.businessName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#1c3a13]/50">Type</span>
                <Badge variant="secondary">{user.buyerProfile.businessType}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#1c3a13]/50">Rating</span>
                <span className="flex items-center gap-1 font-medium text-[#1c3a13]">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  {user.buyerProfile.rating.toFixed(1)} ({user.buyerProfile.totalRatings})
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {user.logisticsProfile && (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-[#1c3a13]">Rider Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {user.logisticsProfile.companyName && (
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/50">Trading name</span>
                  <span className="font-medium text-[#1c3a13]">{user.logisticsProfile.companyName}</span>
                </div>
              )}
              {user.logisticsProfile.licensePlate && (
                <div className="flex justify-between">
                  <span className="text-[#1c3a13]/50">Plate</span>
                  <span className="font-medium font-mono text-[#1c3a13]">{user.logisticsProfile.licensePlate}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#1c3a13]/50">Vehicle</span>
                <span className="font-medium text-[#1c3a13]">Motorbike 🏍️</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#1c3a13]/50">Rating</span>
                <span className="flex items-center gap-1 font-medium text-[#1c3a13]">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  {user.logisticsProfile.rating.toFixed(1)} ({user.logisticsProfile.totalRatings})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#1c3a13]/50">Coverage</span>
                <span className="font-medium text-right text-xs text-[#1c3a13]">{user.logisticsProfile.coverageAreas.join(", ")}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
