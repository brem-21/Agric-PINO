"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldQuestion, Loader2, CheckCircle, XCircle, Clock,
  Upload, AlertCircle, ArrowLeft, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { compressImage } from "@/lib/compress-image";

interface VerificationRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNotes: string | null;
  createdAt: string;
  feeAmount: number | null;
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
}

interface VerificationStatus {
  isVerified: boolean;
  verifiedAt: string | null;
  completedCount: number;
  threshold: number;
  eligible: boolean;
  fee: number;
  latestRequest: VerificationRequest | null;
  ghanaCardNumber: string | null;
  ghanaCardName: string | null;
  residenceLocation: string | null;
}

type Step = "status" | "form" | "submitting";

async function uploadFile(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("file", compressed);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Upload failed");
  }
  const { url } = await res.json();
  return url;
}

export default function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [step, setStep] = useState<Step>("status");
  const [error, setError] = useState("");

  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [ghanaCardName, setGhanaCardName] = useState("");
  const [residenceLocation, setResidenceLocation] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  function loadStatus() {
    setLoading(true);
    fetch("/api/verification")
      .then((r) => r.json())
      .then((data: VerificationStatus) => {
        setStatus(data);
        setGhanaCardNumber((prev) => prev || data.ghanaCardNumber || "");
        setGhanaCardName((prev) => prev || data.ghanaCardName || "");
        setResidenceLocation((prev) => prev || data.residenceLocation || "");
      })
      .catch(() => setError("Failed to load verification status"))
      .finally(() => setLoading(false));
  }

  useEffect(loadStatus, []);

  async function handleSubmit() {
    if (!frontFile) { setError("Please upload the front of your Ghana Card"); return; }
    setError("");
    setStep("submitting");
    try {
      const idPhotoFront = await uploadFile(frontFile);
      const idPhotoBack = backFile ? await uploadFile(backFile) : undefined;

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ghanaCardNumber, ghanaCardName, residenceLocation, idPhotoFront, idPhotoBack }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Submission failed"); setStep("form"); return; }

      // Not yet eligible for the free path — the request was created UNPAID
      // and needs the fast-track fee paid before an admin will see it.
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      loadStatus();
      setStep("status");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
      setStep("form");
    }
  }

  const [resumingPayment, setResumingPayment] = useState(false);

  async function handleResumePayment() {
    setError("");
    setResumingPayment(true);
    try {
      const res = await fetch("/api/verification", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      if (!res.ok || !data.authorizationUrl) { setError(data.error ?? "Could not start payment"); return; }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setResumingPayment(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>;
  }

  if (!status) {
    return <div className="flex min-h-[60vh] items-center justify-center text-[#1c3a13]/50">Something went wrong.</div>;
  }

  const latest = status.latestRequest;
  const noBlockingRequest = !latest || latest.status === "REJECTED";
  const canApplyFree = !status.isVerified && status.eligible && noBlockingRequest;
  const canApplyPaid = !status.isVerified && !status.eligible && noBlockingRequest;

  return (
    <div className="min-h-screen bg-[#fcfcf7] py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <Link href="/profile" className="flex items-center gap-1.5 text-sm text-[#1c3a13]/50 hover:text-[#1c3a13] w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Link>

        <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeee9]">
              <ShieldCheck className="h-5 w-5 text-[#1c3a13]" />
            </div>
            <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Identity Verification</h1>
          </div>
          <p className="text-sm text-[#1c3a13]/50">
            Verification is a trust badge, not a requirement — you already have full access to list, order, and transact either way. Wait for it to unlock for free through activity on the platform, or pay a one-time fee to apply right away. Every application is reviewed by an admin either way.
          </p>

          {step === "status" && (
            <div className="mt-4 space-y-4">
              {status.isVerified ? (
                <div className="flex items-center gap-3 rounded-xl bg-[#d3fa99] p-4">
                  <CheckCircle className="h-6 w-6 text-[#1c3a13] flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#1c3a13]">You&apos;re verified</p>
                    {status.verifiedAt && <p className="text-xs text-[#1c3a13]/70">Since {formatDate(status.verifiedAt)}</p>}
                  </div>
                </div>
              ) : latest?.status === "PENDING" && latest.feeAmount != null && latest.paymentStatus === "UNPAID" ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-amber-700 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-amber-900">Payment pending</p>
                      <p className="text-xs text-amber-700">
                        Started {formatDate(latest.createdAt)} — pay GHS {latest.feeAmount} to send this for admin review.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleResumePayment}
                    disabled={resumingPayment}
                    className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]"
                  >
                    {resumingPayment ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Starting payment…</> : `Pay GHS ${latest.feeAmount} now`}
                  </Button>
                </div>
              ) : latest?.status === "PENDING" ? (
                <div className="flex items-center gap-3 rounded-xl bg-[#eeeee9] p-4">
                  <Clock className="h-6 w-6 text-[#1c3a13]/60 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#1c3a13]">Application under review</p>
                    <p className="text-xs text-[#1c3a13]/50">Submitted {formatDate(latest.createdAt)} — an admin will review it shortly.</p>
                  </div>
                </div>
              ) : latest?.status === "REJECTED" ? (
                <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                  <div className="flex items-center gap-3 mb-1">
                    <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <p className="font-medium text-red-800">Application rejected</p>
                  </div>
                  {latest.reviewNotes && <p className="text-sm text-red-700 ml-9">{latest.reviewNotes}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl bg-[#eeeee9] p-4">
                  <ShieldQuestion className="h-6 w-6 text-[#1c3a13]/60 flex-shrink-0" />
                  <p className="text-sm text-[#1c3a13]/70">You haven&apos;t applied for verification yet.</p>
                </div>
              )}

              {!status.isVerified && !status.eligible && (
                <div className="rounded-xl border border-[#eeeee9] p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-[#1c3a13]">
                    <TrendingUp className="h-4 w-4" />
                    {status.completedCount} of {status.threshold} completed transactions
                  </div>
                  <div className="h-2 rounded-full bg-[#eeeee9] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#1c3a13]"
                      style={{ width: `${Math.min(100, (status.completedCount / status.threshold) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[#1c3a13]/50">
                    {status.threshold - status.completedCount} more completed transaction(s) to unlock free verification —
                    or skip the wait for a one-time GHS {status.fee} fee.
                  </p>
                </div>
              )}

              {canApplyFree && (
                <Button onClick={() => setStep("form")} className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                  {latest?.status === "REJECTED" ? "Apply Again" : "Apply for Verification"}
                </Button>
              )}

              {canApplyPaid && (
                <div className="space-y-2">
                  <Button onClick={() => setStep("form")} className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                    {latest?.status === "REJECTED" ? `Apply Again — Pay GHS ${status.fee}` : `Apply Now — Pay GHS ${status.fee}`}
                  </Button>
                  <p className="text-center text-xs text-[#1c3a13]/40">
                    Or keep transacting — verification unlocks free once you hit {status.threshold} completed transactions.
                  </p>
                </div>
              )}
            </div>
          )}

          {(step === "form" || step === "submitting") && (
            <div className="mt-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}
              <p className="text-xs text-[#1c3a13]/50">
                Pre-filled from your account — update if anything&apos;s changed. What&apos;s actually new here is the card photo.
              </p>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1c3a13]">Ghana Card Number</label>
                <input value={ghanaCardNumber} onChange={(e) => setGhanaCardNumber(e.target.value)}
                  placeholder="GHA-000000000-0" disabled={step === "submitting"}
                  className="w-full rounded-lg border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none disabled:opacity-60" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1c3a13]">Name on Card</label>
                <input value={ghanaCardName} onChange={(e) => setGhanaCardName(e.target.value)}
                  placeholder="As shown on your Ghana Card" disabled={step === "submitting"}
                  className="w-full rounded-lg border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none disabled:opacity-60" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1c3a13]">Residence Location</label>
                <input value={residenceLocation} onChange={(e) => setResidenceLocation(e.target.value)}
                  placeholder="e.g. Tamale, Northern Region" disabled={step === "submitting"}
                  className="w-full rounded-lg border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none disabled:opacity-60" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1c3a13]">Card Photo (front)</label>
                  <button type="button" onClick={() => frontRef.current?.click()} disabled={step === "submitting"}
                    className="w-full h-24 rounded-lg border-2 border-dashed border-[#eeeee9] flex flex-col items-center justify-center gap-1 text-[#1c3a13]/50 hover:border-[#1c3a13]/40 disabled:opacity-60">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs text-center px-1 truncate max-w-full">{frontFile?.name ?? "Upload photo"}</span>
                  </button>
                  <input ref={frontRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
                    onChange={(e) => setFrontFile(e.target.files?.[0] ?? null)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1c3a13]">Card Photo (back, optional)</label>
                  <button type="button" onClick={() => backRef.current?.click()} disabled={step === "submitting"}
                    className="w-full h-24 rounded-lg border-2 border-dashed border-[#eeeee9] flex flex-col items-center justify-center gap-1 text-[#1c3a13]/50 hover:border-[#1c3a13]/40 disabled:opacity-60">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs text-center px-1 truncate max-w-full">{backFile?.name ?? "Upload photo"}</span>
                  </button>
                  <input ref={backRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
                    onChange={(e) => setBackFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("status")} disabled={step === "submitting"} className="flex-1 rounded-full border-[#eeeee9] text-[#1c3a13]">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={step === "submitting"} className="flex-1 bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                  {step === "submitting"
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{status.eligible ? "Submitting…" : "Starting payment…"}</>
                    : status.eligible ? "Submit" : `Continue to Pay GHS ${status.fee}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
