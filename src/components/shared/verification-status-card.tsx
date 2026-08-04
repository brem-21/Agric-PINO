import Link from "next/link";
import { ShieldCheck, ShieldAlert, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface VerificationStatusCardProps {
  isVerified: boolean;
  verifiedAt: string | Date | null;
  latestRequestStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
}

export function VerificationStatusCard({
  isVerified,
  verifiedAt,
  latestRequestStatus,
}: VerificationStatusCardProps) {
  if (isVerified) {
    return (
      <Link
        href="/verification"
        className="flex items-center gap-3 rounded-2xl border border-[#eeeee9] bg-[#d3fa99]/40 px-4 py-3 text-sm text-[#1c3a13] hover:bg-[#d3fa99]/60 transition-colors"
      >
        <ShieldCheck className="h-4 w-4 flex-shrink-0" />
        <span>
          <span className="font-medium">Account verified</span>
          {verifiedAt && <span className="text-[#1c3a13]/60"> — since {formatDate(verifiedAt)}</span>}
        </span>
      </Link>
    );
  }

  const underReview = latestRequestStatus === "PENDING";
  const rejected = latestRequestStatus === "REJECTED";

  if (underReview) {
    return (
      <Link
        href="/verification"
        className="flex items-center gap-3 rounded-2xl border border-[#eeeee9] bg-[#eeeee9] px-4 py-3 text-sm text-[#1c3a13] hover:bg-[#eeeee9]/70 transition-colors"
      >
        <Clock className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">Verification application under review</span>
      </Link>
    );
  }

  if (rejected) {
    return (
      <Link
        href="/verification"
        className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 hover:bg-red-100 transition-colors"
      >
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <span className="font-medium">Verification application rejected — tap to reapply</span>
      </Link>
    );
  }

  return (
    <Link
      href="/verification"
      className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
    >
      <ShieldAlert className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">Verify your account to unlock full access — apply for verification</span>
    </Link>
  );
}
