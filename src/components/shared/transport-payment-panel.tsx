"use client";

import { useState } from "react";
import { Loader2, Smartphone, Banknote, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface TransportPaymentPanelProps {
  requestId: string;
  estimatedCost: number;
  paymentStatus: string;
  paymentMethod: string | null;
  onUpdated: () => void;
}

type Step = "choose" | "phone" | "paystack-loading" | "cod-loading";

export function TransportPaymentPanel({
  requestId,
  estimatedCost,
  paymentStatus,
  paymentMethod,
  onUpdated,
}: TransportPaymentPanelProps) {
  const [step, setStep] = useState<Step>("choose");
  const [momoPhone, setMomoPhone] = useState("");
  const [error, setError] = useState("");

  if (paymentStatus === "PAID") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-[#1c3a13] bg-[#d3fa99] rounded-full px-2.5 py-1 w-fit">
        <CheckCircle className="h-3.5 w-3.5" />
        Paid via Paystack
      </div>
    );
  }

  if (paymentMethod === "CASH") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-[#1c3a13] bg-[#eeeee9] rounded-full px-2.5 py-1 w-fit">
        <Banknote className="h-3.5 w-3.5" />
        Cash on delivery
      </div>
    );
  }

  async function payWithPaystack() {
    if (!momoPhone.trim() || momoPhone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit mobile money number");
      return;
    }
    setStep("paystack-loading");
    setError("");
    try {
      const res = await fetch("/api/transport/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, momoPhone: momoPhone.replace(/\s/g, ""), provider: "mtn" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment initialization failed");
        setStep("phone");
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Network error. Please try again.");
      setStep("phone");
    }
  }

  async function payWithCash() {
    setStep("cod-loading");
    setError("");
    try {
      const res = await fetch("/api/transport/payment?action=cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong");
        setStep("choose");
        return;
      }
      onUpdated();
    } catch {
      setError("Network error. Please try again.");
      setStep("choose");
    }
  }

  return (
    <div className="rounded-xl border border-[#eeeee9] bg-[#fcfcf7] p-3 space-y-2.5">
      <p className="text-xs font-medium text-[#1c3a13]/60">
        Delivery fee: <span className="text-[#1c3a13] font-semibold">{formatCurrency(estimatedCost)}</span> — pay the rider
      </p>

      {error && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-100 px-2.5 py-1.5 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {step === "choose" && (
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setStep("phone")}
            className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
          >
            <Smartphone className="h-3.5 w-3.5 mr-1.5" />
            Pay with Paystack
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={payWithCash}
            className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]"
          >
            <Banknote className="h-3.5 w-3.5 mr-1.5" />
            Pay on Delivery
          </Button>
        </div>
      )}

      {(step === "phone" || step === "paystack-loading") && (
        <div className="flex gap-2 items-center">
          <input
            type="tel"
            value={momoPhone}
            onChange={(e) => setMomoPhone(e.target.value)}
            placeholder="Mobile money number"
            disabled={step === "paystack-loading"}
            className="flex-1 rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-1.5 text-sm text-[#1c3a13] placeholder-[#1c3a13]/40 focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 focus:border-[#1c3a13] disabled:opacity-60"
          />
          <Button
            size="sm"
            onClick={payWithPaystack}
            disabled={step === "paystack-loading"}
            className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219] flex-shrink-0"
          >
            {step === "paystack-loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pay"}
          </Button>
        </div>
      )}

      {step === "cod-loading" && (
        <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/60">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
