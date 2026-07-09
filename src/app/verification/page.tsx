"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ShieldCheck, ShieldQuestion, Loader2, CheckCircle, XCircle, Clock,
  Upload, AlertCircle, ArrowLeft, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface VerificationRequest {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  paymentStatus: "UNPAID" | "PAID" | "REFUNDED";
  reviewNotes: string | null;
  createdAt: string;
}

interface VerificationStatus {
  isVerified: boolean;
  verifiedAt: string | null;
  fee: number | null;
  latestRequest: VerificationRequest | null;
}

type Step = "status" | "agreement" | "form" | "submitting";

const AGREEMENT_POINTS = [
  "You will provide accurate and truthful information, including a valid Ghana Card number and the name exactly as it appears on your card.",
  "You authorize Lorgric to review the submitted Ghana Card photo and details for the purpose of confirming your identity.",
  "The verification fee is non-refundable, regardless of the outcome of the review.",
  "Providing false or fraudulent information may result in account suspension.",
  "Approval is at the discretion of the Lorgric admin team and may take a few business days.",
];

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Upload failed");
  const { url } = await res.json();
  return url;
}

export default function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [step, setStep] = useState<Step>("status");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const [ghanaCardNumber, setGhanaCardNumber] = useState("");
  const [ghanaCardName, setGhanaCardName] = useState("");
  const [residenceLocation, setResidenceLocation] = useState("");
  const [momoPhone, setMomoPhone] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  function loadStatus() {
    setLoading(true);
    fetch("/api/verification")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setError("Failed to load verification status"))
      .finally(() => setLoading(false));
  }

  useEffect(loadStatus, []);

  async function handleSubmit() {
    if (!frontFile) { setError("Please upload the front of your Ghana Card"); return; }
    if (!momoPhone.trim() || momoPhone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit mobile money number"); return;
    }
    setError("");
    setStep("submitting");
    try {
      const idPhotoFront = await uploadFile(frontFile);
      const idPhotoBack = backFile ? await uploadFile(backFile) : undefined;

      const res = await fetch("/api/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ghanaCardNumber, ghanaCardName, residenceLocation,
          idPhotoFront, idPhotoBack,
          momoPhone: momoPhone.replace(/\s/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Submission failed"); setStep("form"); return; }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please try again.");
      setStep("form");
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>;
  }

  if (!status) {
    return <div className="flex min-h-[60vh] items-center justify-center text-[#1c3a13]/50">Something went wrong.</div>;
  }

  const latest = status.latestRequest;
  const canApply = !status.isVerified && (!latest || latest.status === "REJECTED" || latest.paymentStatus !== "PAID");

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
              ) : latest?.paymentStatus === "PAID" && latest.status === "PENDING" ? (
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

              {canApply && status.fee !== null && (
                <Button onClick={() => setStep("agreement")} className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                  {latest?.status === "REJECTED" ? "Apply Again" : "Apply for Verification"} — {formatCurrency(status.fee)}
                </Button>
              )}
            </div>
          )}

          {step === "agreement" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#1c3a13]/70">
                Verifying your identity costs <span className="font-semibold text-[#1c3a13]">{formatCurrency(status.fee ?? 0)}</span>, paid via Mobile Money. Please read and agree before continuing.
              </p>
              <ol className="space-y-2 text-sm text-[#1c3a13]/80 list-decimal list-inside bg-[#eeeee9] rounded-xl p-4">
                {AGREEMENT_POINTS.map((point, i) => <li key={i}>{point}</li>)}
              </ol>
              <label className="flex items-start gap-2 text-sm text-[#1c3a13] cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                I have read and agree to the terms above.
              </label>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("status")} className="flex-1 rounded-full border-[#eeeee9] text-[#1c3a13]">
                  Cancel
                </Button>
                <Button disabled={!agreed} onClick={() => setStep("form")} className="flex-1 bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219] disabled:opacity-40">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {(step === "form" || step === "submitting") && (
            <div className="mt-4 space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
                </div>
              )}
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

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#1c3a13]">Mobile Money Number</label>
                <input value={momoPhone} onChange={(e) => setMomoPhone(e.target.value)}
                  placeholder="024 XXX XXXX" disabled={step === "submitting"}
                  className="w-full rounded-lg border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none disabled:opacity-60" />
                <p className="text-xs text-[#1c3a13]/40">You&apos;ll be redirected to Paystack to pay {formatCurrency(status.fee ?? 0)}.</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("agreement")} disabled={step === "submitting"} className="flex-1 rounded-full border-[#eeeee9] text-[#1c3a13]">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={step === "submitting"} className="flex-1 bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                  {step === "submitting" ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</> : <><ExternalLink className="h-4 w-4 mr-2" />Pay & Submit</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
