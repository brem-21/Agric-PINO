"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, Clock, XCircle, ArrowLeft, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ApplyStatus {
  isIncidentTeam: boolean;
  request: { status: "PENDING" | "APPROVED" | "REJECTED"; reviewNotes: string | null; createdAt: string } | null;
}

export default function ApplyIncidentTeamPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ApplyStatus | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function loadStatus() {
    setLoading(true);
    fetch("/api/incident-team/apply")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }

  useEffect(loadStatus, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/incident-team/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() || undefined }),
    });
    if (res.ok) {
      loadStatus();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit application");
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>;
  }
  if (!status) {
    return <div className="flex min-h-[60vh] items-center justify-center text-[#1c3a13]/50">Something went wrong.</div>;
  }

  const canApply = !status.isIncidentTeam && (!status.request || status.request.status === "REJECTED");

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
            <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Apply to be a Macho</h1>
          </div>
          <p className="text-sm text-[#1c3a13]/50">
            The Macho Men Association is Lorgric&apos;s incident-response team — they investigate and resolve complaints
            filed by farmers, buyers, riders, and facilities. You keep your current account and dashboard; this adds a
            second capability on top, reviewed by an admin.
          </p>

          <div className="mt-4 space-y-4">
            {status.isIncidentTeam ? (
              <div className="flex items-center gap-3 rounded-xl bg-[#d3fa99] p-4">
                <CheckCircle className="h-6 w-6 text-[#1c3a13] flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#1c3a13]">You&apos;re already a Macho</p>
                  <Link href="/incident-team" className="text-xs text-[#1c3a13]/70 underline">Go to the Incident Team portal</Link>
                </div>
              </div>
            ) : status.request?.status === "PENDING" ? (
              <div className="flex items-center gap-3 rounded-xl bg-[#eeeee9] p-4">
                <Clock className="h-6 w-6 text-[#1c3a13]/60 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#1c3a13]">Application under review</p>
                  <p className="text-xs text-[#1c3a13]/50">Submitted {formatDate(status.request.createdAt)}</p>
                </div>
              </div>
            ) : status.request?.status === "REJECTED" ? (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4">
                <div className="flex items-center gap-3 mb-1">
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                  <p className="font-medium text-red-800">Application not approved</p>
                </div>
                {status.request.reviewNotes && <p className="text-sm text-red-700 ml-9">{status.request.reviewNotes}</p>}
              </div>
            ) : null}

            {canApply && (
              <form onSubmit={handleSubmit} className="space-y-3">
                {error && <p className="text-sm text-red-700">{error}</p>}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[#1c3a13]">Why do you want to join? (optional)</label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg" />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</> : status.request?.status === "REJECTED" ? "Apply Again" : "Apply"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
