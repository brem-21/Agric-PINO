"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, CheckCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { compressImage } from "@/lib/compress-image";

const REASONS = [
  { value: "NOT_FRESH", label: "Produce isn't fresh" },
  { value: "WRONG_QUANTITY", label: "Wrong quantity received" },
  { value: "WRONG_ITEM", label: "Wrong item delivered" },
  { value: "DAMAGED", label: "Damaged in transit" },
  { value: "OTHER", label: "Other" },
];

interface RejectProduceDialogProps {
  orderId: string;
  cropType: string;
  onResolved?: () => void;
  trigger?: React.ReactNode;
}

// The accountability path for produce the buyer isn't willing to accept —
// files a real dispute against the order instead of only a general
// complaint, so there's a specific record tied to a specific payment that a
// farmer or admin can actually resolve (refund/replacement/deny).
export function RejectProduceDialog({ orderId, cropType, onResolved, trigger }: RejectProduceDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setReason(REASONS[0].value);
    setDescription("");
    setPhotoFile(null);
    setSent(false);
    setError("");
  }

  async function handleSubmit() {
    if (!description.trim()) { setError("Describe what's wrong."); return; }
    setError("");
    setSending(true);
    try {
      let photo: string | undefined;
      if (photoFile) {
        const compressed = await compressImage(photoFile);
        const fd = new FormData();
        fd.append("file", compressed);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (uploadRes.ok) photo = (await uploadRes.json()).url;
      }

      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description: description.trim(), photo }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to file dispute"); return; }
      setSent(true);
      onResolved?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div onClick={() => { reset(); setOpen(true); }}>
        {trigger ?? (
          <Button variant="outline" size="sm" className="rounded-full border-red-200 text-red-600 hover:bg-red-50">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            Reject Produce
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1c3a13]">Reject {cropType}</DialogTitle>
            <p className="text-xs text-[#1c3a13]/40 mt-0.5">The farmer and an admin will be notified to resolve this.</p>
          </DialogHeader>

          {sent ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eeeee9]">
                <CheckCheck className="h-7 w-7 text-[#1c3a13]" />
              </div>
              <p className="font-medium text-[#1c3a13]">Dispute filed</p>
              <p className="text-sm text-[#1c3a13]/50">The farmer can refund, replace, or respond — an admin can step in too.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#1c3a13]">What&apos;s wrong?</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none"
                >
                  {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#1c3a13]">Details</label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setError(""); }}
                  rows={3}
                  maxLength={1000}
                  placeholder="Describe the issue…"
                  className="w-full resize-none rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:border-[#1c3a13] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#1c3a13]">Photo (optional)</label>
                <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#eeeee9] py-3 text-xs text-[#1c3a13]/50 cursor-pointer hover:border-[#1c3a13]/40">
                  <Upload className="h-4 w-4" />
                  {photoFile?.name ?? "Upload a photo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
                </label>
              </div>

              {error && <p className="text-xs text-red-600">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-full border-[#eeeee9] text-[#1c3a13]">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={sending}
                  className="rounded-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
                  File Dispute
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
