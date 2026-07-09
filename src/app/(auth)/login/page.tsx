"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, Eye, EyeOff, AlertCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroSlideshow } from "@/components/shared/hero-slideshow";
import { RoleLoadingScreen, type LoadingRole } from "@/components/shared/role-loading-screen";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingRole, setLoadingRole] = useState<LoadingRole | null>(null);
  const [redirectTo, setRedirectTo] = useState("/");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid phone number or password. Please try again.");
        setLoading(false);
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role: string = session?.user?.role ?? "";

      // Land on the homepage after login — users navigate to their portal from the navbar.
      setRedirectTo("/");
      setLoadingRole((role as LoadingRole) || "BUYER");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      {loadingRole && (
        <RoleLoadingScreen
          role={loadingRole}
          mode="login"
          onDone={() => router.push(redirectTo)}
        />
      )}
      {/* Real photo background */}
      <div className="absolute inset-0 bg-[#1c3a13]">
        <HeroSlideshow />
      </div>

      {/* Centered form */}
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d3fa99]">
            <Leaf className="h-8 w-8 text-[#1c3a13]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-medium text-[#fcfcf7] tracking-tight">Lorgric<span className="text-[#d3fa99]">●</span></h1>
            <p className="text-sm text-[#fcfcf7]/60">Northern Ghana&apos;s Agricultural Marketplace</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-[#fcfcf7]/95 backdrop-blur-sm border border-[#eeeee9]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in with your phone number</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#1c3a13]/40" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0244 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    autoComplete="tel"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1c3a13]/40 hover:text-[#1c3a13]/70"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex-col gap-2 border-t border-[#eeeee9] pt-4">
            <p className="text-sm text-[#1c3a13]/50">
              Don&apos;t have an account?{" "}
              <Link href="/auth/register" className="font-medium text-[#1c3a13] hover:underline">
                Create one for free
              </Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-center text-[#fcfcf7]/40 text-xs">
          Lorgric · Northern Savannah Zone, Ghana
        </p>
      </div>
      </div>
    </div>
  );
}
