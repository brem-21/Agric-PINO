"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Leaf, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "There is a problem with the server configuration. Please contact support.",
  AccessDenied: "You do not have permission to sign in.",
  Verification: "The verification token has expired or has already been used.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from an OAuth provider.",
  OAuthCreateAccount: "Could not create OAuth provider user in the database.",
  EmailCreateAccount: "Could not create email provider user in the database.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "This email is already linked to a different sign-in method.",
  EmailSignin: "The email could not be sent.",
  CredentialsSignin: "Invalid email or password. Please check your credentials.",
  SessionRequired: "You must be signed in to access this page.",
  Default: "An unexpected authentication error occurred.",
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error") ?? "Default";
  const message = ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.Default;

  return (
    <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d3fa99]">
            <Leaf className="h-7 w-7 text-[#1c3a13]" />
          </div>
          <h1 className="text-xl font-light tracking-tight text-[#1c3a13]">Lorgric</h1>
        </div>

        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <CardTitle className="text-lg font-light tracking-tight text-red-700">Authentication Error</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#1c3a13]/70">{message}</p>
            {errorCode !== "Default" && (
              <p className="text-xs text-[#1c3a13]/40">Error code: {errorCode}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                asChild
                className="flex-1 bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]"
              >
                <Link href="/auth/login">Back to Login</Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="flex-1 border-[#eeeee9] text-[#1c3a13] rounded-full hover:bg-[#eeeee9] hover:border-[#1c3a13]"
              >
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fcfcf7] flex items-center justify-center">
        <div className="text-[#1c3a13]/50">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
