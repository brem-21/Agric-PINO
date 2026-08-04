"use client";

import { useState } from "react";
import Link from "next/link";
import { Handshake, Loader2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface MakeOfferDialogProps {
  listingId: string;
  cropType: string;
  unit: string;
  listedPrice: number;
  maxQuantity: number;
  trigger?: React.ReactNode;
}

// A binding alternative to negotiating over plain chat — this is what
// actually turns "I'll do GHS 280 for 25kg" into something the farmer can
// accept and have an order appear from, instead of a promise made in a
// message thread the order system never sees.
export function MakeOfferDialog({ listingId, cropType, unit, listedPrice, maxQuantity, trigger }: MakeOfferDialogProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(String(Math.min(1, maxQuantity)));
  const [pricePerUnit, setPricePerUnit] = useState(String(listedPrice));
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(pricePerUnit) || 0;
  const total = qtyNum * priceNum;

  async function handleSubmit() {
    setError("");
    if (qtyNum <= 0 || qtyNum > maxQuantity) {
      setError(`Enter a quantity up to ${maxQuantity} ${unit}.`);
      return;
    }
    if (priceNum <= 0) {
      setError("Enter a valid price per unit.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, quantity: qtyNum, pricePerUnit: priceNum, message: message.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send offer.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setSent(false);
    setError("");
    setMessage("");
    setQuantity(String(Math.min(1, maxQuantity)));
    setPricePerUnit(String(listedPrice));
  }

  return (
    <>
      <div onClick={() => { reset(); setOpen(true); }}>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Handshake className="h-3.5 w-3.5 mr-1.5" />
            Make an Offer
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#1c3a13]">Make an offer — {cropType}</DialogTitle>
            <p className="text-xs text-[#1c3a13]/40 mt-0.5">Listed at {formatCurrency(listedPrice)}/{unit}</p>
          </DialogHeader>

          {sent ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eeeee9]">
                <CheckCheck className="h-7 w-7 text-[#1c3a13]" />
              </div>
              <p className="font-medium text-[#1c3a13]">Offer sent!</p>
              <p className="text-sm text-[#1c3a13]/50">The farmer has 48 hours to accept, counter, or decline.</p>
              <Link href="/buyer/offers" className="text-sm font-medium text-[#1c3a13] hover:underline">
                Track it in My Offers →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[#1c3a13] text-xs">Quantity ({unit})</Label>
                  <Input
                    type="number"
                    min={1}
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[#1c3a13] text-xs">Your price/{unit}</Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#eeeee9] px-3 py-2 flex justify-between text-sm">
                <span className="text-[#1c3a13]/60">Your total offer</span>
                <span className="font-semibold text-[#1c3a13]">{formatCurrency(total)}</span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[#1c3a13] text-xs">Message (optional)</Label>
                <Input
                  placeholder="e.g. Can pick up today if accepted"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  className="bg-[#fcfcf7] border-[#eeeee9] text-[#1c3a13] rounded-lg"
                />
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
                  className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Handshake className="h-3.5 w-3.5 mr-1.5" />}
                  Send Offer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
