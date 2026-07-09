"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, AlertCircle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComplaintFormProps {
  onSuccess?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  FRAUD: "Fraud / Scam",
  QUALITY_ISSUE: "Product Quality Issue",
  DELIVERY_PROBLEM: "Delivery Problem",
  PAYMENT_DISPUTE: "Payment Dispute",
  HARASSMENT: "Harassment / Abuse",
  TECHNICAL: "Technical Issue",
  OTHER: "Other",
};

const CATEGORIES = Object.entries(CATEGORY_LABELS);

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-[#eeeee9] text-[#1c3a13]",
  UNDER_REVIEW: "bg-[#eeeee9] text-[#1c3a13]",
  RESOLVED: "bg-[#d3fa99] text-[#1c3a13]",
  DISMISSED: "bg-[#eeeee9] text-[#1c3a13]/50",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

interface Complaint {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ComplaintForm({ onSuccess }: ComplaintFormProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    fetch("/api/complaints")
      .then((r) => r.json())
      .then((d) => setComplaints(d.complaints ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [submitted]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (description.trim().length < 20) {
      setError("Description must be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), category, description: description.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit. Please try again.");
        return;
      }
      setSubmitted(true);
      setSubject("");
      setCategory("");
      setDescription("");
      onSuccess?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Form card */}
      <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
        <div className="border-b border-[#eeeee9] px-6 py-4 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eeeee9]">
            <Flag className="h-4 w-4 text-[#1c3a13]" />
          </div>
          <h2 className="font-medium text-[#1c3a13]">Submit a Report</h2>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-12 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d3fa99]">
              <CheckCircle className="h-9 w-9 text-[#1c3a13]" />
            </div>
            <div>
              <p className="text-lg font-light tracking-tight text-[#1c3a13]">Report submitted</p>
              <p className="text-sm text-[#1c3a13]/50 mt-1">
                Your report has been submitted. Our team will review it shortly.
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-2 rounded-full border-[#1c3a13] text-[#1c3a13] hover:bg-[#eeeee9]"
              onClick={() => setSubmitted(false)}
            >
              Submit another report
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                placeholder="Brief title of the issue"
                required
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-4 py-2.5 text-sm text-[#1c3a13] placeholder-[#1c3a13]/40 focus:border-[#1c3a13] focus:bg-[#fcfcf7] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1.5">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-4 py-2.5 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:bg-[#fcfcf7] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors appearance-none"
              >
                <option value="" disabled>Select a category…</option>
                {CATEGORIES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-[#1c3a13] mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setError(""); }}
                  rows={5}
                  maxLength={2000}
                  placeholder="Describe the issue in detail. Include relevant dates, names, and any evidence you have…"
                  required
                  className="w-full resize-none rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-4 py-3 text-sm text-[#1c3a13] placeholder-[#1c3a13]/40 focus:border-[#1c3a13] focus:bg-[#fcfcf7] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors"
                />
                <div className="absolute bottom-2.5 right-3 text-[10px] text-[#1c3a13]/30 select-none">
                  {description.length}/2000
                </div>
              </div>
              {description.length > 0 && description.trim().length < 20 && (
                <p className="text-xs text-amber-600 mt-1">Please provide at least 20 characters.</p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !category || description.trim().length < 20}
              className="w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting…</>
              ) : (
                "Submit Report"
              )}
            </Button>
          </form>
        )}
      </div>

      {/* Previous complaints */}
      <div>
        <h3 className="text-sm font-medium text-[#1c3a13] mb-3">Your Previous Reports</h3>
        {loadingHistory ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#c4c7c4]" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#eeeee9] py-10 text-center">
            <p className="text-sm text-[#1c3a13]/40">No reports submitted yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1c3a13] truncate">{c.subject}</p>
                    <p className="text-xs text-[#1c3a13]/40 mt-0.5">
                      {CATEGORY_LABELS[c.category] ?? c.category} ·{" "}
                      {new Date(c.createdAt).toLocaleDateString("en-GH", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[c.status] ?? "bg-[#eeeee9] text-[#1c3a13]/50"}`}>
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </div>
                {c.adminNotes && (c.status === "RESOLVED" || c.status === "DISMISSED") && (
                  <div className="rounded-lg bg-[#eeeee9] border border-[#eeeee9] px-3 py-2 text-xs text-[#1c3a13]/70">
                    <span className="font-medium text-[#1c3a13]">Admin response: </span>
                    {c.adminNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
