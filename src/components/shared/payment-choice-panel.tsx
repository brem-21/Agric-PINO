"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Smartphone, Banknote, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface PaymentChoicePanelProps {
  orderId: string;
  totalAmount: number;
  farmerName: string;
  acceptsCOD: boolean;
}

type Step = "choose" | "paystack-phone" | "paystack-loading" | "cod-loading" | "cod-done";

export function PaymentChoicePanel({
  orderId,
  totalAmount,
  farmerName,
  acceptsCOD,
}: PaymentChoicePanelProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<Step>("choose");
  const [momoPhone, setMomoPhone] = useState("");
  const [error, setError] = useState("");

  const role = session?.user?.role;
  const ordersPath = role === "FARMER" ? "/farmer/orders" : "/buyer/orders";

  async function handlePaystack() {
    if (!momoPhone.trim() || momoPhone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit mobile money number");
      return;
    }
    setStep("paystack-loading");
    setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, momoPhone: momoPhone.replace(/\s/g, ""), provider: "mtn" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Payment initialization failed");
        setStep("paystack-phone");
        return;
      }
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        router.push(ordersPath);
      }
    } catch {
      setError("Network error. Please try again.");
      setStep("paystack-phone");
    }
  }

  async function handleCOD() {
    setStep("cod-loading");
    setError("");
    try {
      const res = await fetch("/api/payments?action=cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStep("choose");
        return;
      }
      setStep("cod-done");
      setTimeout(() => router.push(ordersPath), 2000);
    } catch {
      setError("Network error. Please try again.");
      setStep("choose");
    }
  }

  if (step === "cod-done") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d3fa99]">
          <CheckCircle className="h-9 w-9 text-[#1c3a13]" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Order confirmed!</h3>
        <p className="text-sm text-gray-500">
          You&apos;ve chosen <span className="font-medium text-gray-700">Pay on Delivery</span>.
          Settle payment with the farmer when you receive your produce.
        </p>
        <p className="text-xs text-gray-400">Redirecting to your orders…</p>
      </div>
    );
  }

  if (step === "paystack-phone" || step === "paystack-loading") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-blue-50 border border-blue-100 p-4">
          <Smartphone className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Mobile Money Payment</p>
            <p className="text-xs text-blue-600">You&apos;ll be redirected to Paystack to complete payment</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mobile Money Number
          </label>
          <input
            type="tel"
            value={momoPhone}
            onChange={(e) => setMomoPhone(e.target.value)}
            placeholder="024 XXX XXXX"
            disabled={step === "paystack-loading"}
            className="w-full rounded-2xl border border-[#eeeee9] px-4 py-2.5 text-sm focus:border-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 disabled:opacity-60"
          />
          <p className="text-xs text-gray-400 mt-1">MTN or Telecel (Tigo) MoMo accepted</p>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStep("choose"); setError(""); }}
            disabled={step === "paystack-loading"}
            className="border-[#eeeee9] text-gray-600 hover:bg-gray-50"
          >
            Back
          </Button>
          <Button
            onClick={handlePaystack}
            disabled={step === "paystack-loading"}
            className="flex-1 bg-[#1c3a13] hover:bg-green-800 text-white"
          >
            {step === "paystack-loading" ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing…</>
            ) : (
              <><ExternalLink className="h-4 w-4 mr-2" />Pay {formatCurrency(totalAmount)}</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d3fa99] mx-auto">
          <CheckCircle className="h-8 w-8 text-[#1c3a13]" />
        </div>
        <p className="font-semibold text-gray-900 mt-2">Order placed!</p>
        <p className="text-sm text-gray-500">How would you like to pay?</p>
        <p className="text-lg font-bold text-[#1c3a13]">{formatCurrency(totalAmount)}</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          onClick={() => setStep("paystack-phone")}
          className="flex items-center gap-4 rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left hover:border-blue-400 hover:bg-blue-100 transition-colors group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 flex-shrink-0">
            <Smartphone className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Pay with Paystack</p>
            <p className="text-xs text-gray-500">Mobile Money (MTN / Telecel)</p>
          </div>
          <span className="text-xs font-medium text-blue-600 bg-blue-100 rounded-full px-2 py-0.5 flex-shrink-0">Instant</span>
        </button>

        {acceptsCOD ? (
          <button
            onClick={handleCOD}
            disabled={step === "cod-loading"}
            className="flex items-center gap-4 rounded-2xl border-2 border-[#eeeee9] bg-[#eeeee9] p-4 text-left hover:border-[#1c3a13] hover:bg-[#d3fa99] transition-colors disabled:opacity-60"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1c3a13] flex-shrink-0">
              {step === "cod-loading" ? (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              ) : (
                <Banknote className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900">Pay on Delivery</p>
              <p className="text-xs text-gray-500">Cash when you receive from {farmerName}</p>
            </div>
            <span className="text-xs font-medium text-[#1c3a13] bg-[#d3fa99] rounded-full px-2 py-0.5 flex-shrink-0">COD</span>
          </button>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 opacity-50 cursor-not-allowed">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-300 flex-shrink-0">
              <Banknote className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-500">Pay on Delivery</p>
              <p className="text-xs text-gray-400">Not accepted by this farmer</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-100 px-3 py-2.5 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Your order with <span className="font-medium">{farmerName}</span> is confirmed regardless of payment choice.
      </p>
    </div>
  );
}
