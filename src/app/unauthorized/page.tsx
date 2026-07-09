"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function UnauthorizedPage() {
  const router = useRouter();

  function handleGoBack() {
    // No prior page in this tab's history (e.g. direct link, new tab) — fall back to the landing page
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardContent className="py-12 flex flex-col items-center text-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <ShieldX className="h-10 w-10 text-red-600" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Access Denied</h1>
            <p className="text-[#1c3a13]/50 text-sm leading-relaxed">
              You don&apos;t have permission to view this page. Please sign in with an account that has
              the appropriate role, or contact support if you believe this is an error.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex-1 rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button asChild className="flex-1 rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>

          <p className="text-xs text-[#1c3a13]/40">
            Need access?{" "}
            <Link href="/auth/login" className="text-[#1c3a13] hover:underline font-medium">
              Sign in with a different account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
