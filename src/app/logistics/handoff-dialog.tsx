"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Repeat, Loader2, AlertCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AvailableRider {
  id: string;
  vehicleType: string;
  user: { name: string; phone: string };
}

interface HandoffDialogProps {
  requestId: string;
  currentProviderId: string;
  cropType: string;
}

export function HandoffDialog({ requestId, currentProviderId, cropType }: HandoffDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [riders, setRiders] = useState<AvailableRider[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoadingRiders(true);
    setError("");
    setSelected(null);
    fetch("/api/riders/available")
      .then((r) => r.json())
      .then((d) => setRiders((d.riders ?? []).filter((r: AvailableRider) => r.id !== currentProviderId)))
      .catch(() => setError("Couldn't load nearby riders"))
      .finally(() => setLoadingRiders(false));
  }, [open, currentProviderId]);

  async function handleHandoff() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/transport", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action: "handoff",
          nextProviderId: selected,
          handoffNote: note.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to hand off delivery");
        return;
      }
      setOpen(false);
      setNote("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#1c3a13] px-3 py-1.5 text-xs font-medium text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
      >
        <Repeat className="h-3.5 w-3.5" />
        Hand off to another rider
      </button>
      <DialogContent className="bg-[#fcfcf7] border border-[#eeeee9] max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#1c3a13]">Hand off this delivery</DialogTitle>
          <DialogDescription className="text-[#1c3a13]/50">
            Pass the {cropType} delivery to another rider to continue the next leg.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="max-h-56 overflow-y-auto space-y-1.5">
          {loadingRiders ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-[#1c3a13]/40" />
            </div>
          ) : riders.length === 0 ? (
            <p className="text-sm text-[#1c3a13]/50 text-center py-6">No other riders available right now</p>
          ) : (
            riders.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full text-left flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                  selected === r.id
                    ? "border-[#1c3a13] bg-[#eeeee9]"
                    : "border-[#eeeee9] hover:bg-[#eeeee9]"
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c3a13] text-[#fcfcf7] flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1c3a13] truncate">{r.user.name}</p>
                  <p className="text-xs text-[#1c3a13]/50">{r.vehicleType.replace(/_/g, " ")} · {r.user.phone}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Handoff note (optional) — e.g. meeting point"
          rows={2}
          className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] p-2.5 text-sm text-[#1c3a13] placeholder-[#1c3a13]/40 focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 focus:border-[#1c3a13] resize-none"
        />

        <Button
          onClick={handleHandoff}
          disabled={!selected || submitting}
          className="w-full rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm hand-off"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
