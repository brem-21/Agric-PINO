"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function CallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "success" | "failed">("checking");
  const type = params.get("type");
  const isTransport = type === "transport";
  const isVerification = type === "verification";
  const orderId = params.get("orderId");
  const destination = isVerification ? "/verification" : isTransport ? "/farmer/transport" : orderId ? `/tracking/${orderId}` : "/";
  const verifyEndpoint = isVerification
    ? "/api/verification?action=verify"
    : isTransport
      ? "/api/transport/payment?action=verify"
      : "/api/payments?action=verify";

  useEffect(() => {
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference) { setState("failed"); return; }

    fetch(verifyEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((r) => r.json())
      .then((d) => setState(d.status === "success" ? "success" : "failed"))
      .catch(() => setState("failed"));
  }, [params, verifyEndpoint]);

  return (
    <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] p-8 text-center space-y-4">
        {state === "checking" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-[#1c3a13]/40 mx-auto" />
            <p className="text-[#1c3a13]/70">Confirming your payment…</p>
          </>
        )}
        {state === "success" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d3fa99] mx-auto">
              <CheckCircle className="h-8 w-8 text-[#1c3a13]" />
            </div>
            <p className="font-medium text-[#1c3a13]">Payment received</p>
            <p className="text-sm text-[#1c3a13]/50">
              {isVerification
                ? "Your verification application has been sent to an admin for review."
                : isTransport
                  ? "The delivery payment has been confirmed."
                  : "Your order has been confirmed."}
            </p>
            <Button onClick={() => router.push(destination)} className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
              {isVerification ? "Back to Verification" : isTransport ? "Back to Transport" : "Track Order"}
            </Button>
          </>
        )}
        {state === "failed" && (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 mx-auto">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="font-medium text-[#1c3a13]">Payment not confirmed</p>
            <p className="text-sm text-[#1c3a13]/50">We couldn&apos;t confirm your payment. If money was deducted, contact support — otherwise, try again.</p>
            <Button onClick={() => router.push(destination)} variant="outline" className="w-full rounded-full border-[#eeeee9] text-[#1c3a13]">
              {isVerification ? "Back to Verification" : isTransport ? "Back to Transport" : "Back to Order"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]/40" /></div>}>
      <CallbackContent />
    </Suspense>
  );
}
