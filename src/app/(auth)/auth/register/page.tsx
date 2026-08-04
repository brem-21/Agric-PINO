"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  AlertCircle,
  CheckCircle,
  Tractor,
  ShoppingBag,
  Truck,
  ArrowLeft,
  ArrowRight,
  Phone,
  Warehouse,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NORTHERN_GHANA_REGIONS } from "@/lib/utils";

type Role = "FARMER" | "BUYER" | "LOGISTICS" | "STORAGE_FACILITY" | "ADMIN";

interface FormData {
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  region: string;
  district: string;
  ghanaCardNumber: string;
  ghanaCardName: string;
  residenceLocation: string;
  farmName: string;
  farmSize: string;
  farmLocation: string;
  businessName: string;
  businessType: string;
  companyName: string;
  licensePlate: string;
  vehicleType: string;
  facilityName: string;
}

const ROLE_OPTIONS: {
  value: Role;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "FARMER",
    label: "Farmer",
    description: "List your produce and connect with buyers across Northern Ghana",
    icon: Tractor,
  },
  {
    value: "BUYER",
    label: "Buyer",
    description: "Source fresh produce directly from local farmers at fair prices",
    icon: ShoppingBag,
  },
  {
    value: "LOGISTICS",
    label: "Logistics Provider",
    description: "Offer transport services to move produce between farmers and buyers",
    icon: Truck,
  },
  {
    value: "STORAGE_FACILITY",
    label: "Storage Facility",
    description: "Operate a cold-chain or dry storage site — take farmer drop-offs and earn a 5% commission on sales",
    icon: Warehouse,
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Apply for platform admin access — requires Ghana Card + photo and review by an existing admin",
    icon: ShieldCheck,
  },
];

const BUSINESS_TYPES = [
  { value: "WHOLESALER", label: "Wholesaler (bulk resale)" },
  { value: "PROCESSOR", label: "Food Processor" },
  { value: "RETAILER", label: "Retailer" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "EXPORTER", label: "Exporter" },
  { value: "HOUSEHOLD", label: "Household" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resent, setResent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [pendingPayload, setPendingPayload] = useState<Record<string, unknown> | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    region: "",
    district: "",
    ghanaCardNumber: "",
    ghanaCardName: "",
    residenceLocation: "",
    farmName: "",
    farmSize: "",
    farmLocation: "",
    businessName: "",
    businessType: "",
    companyName: "",
    licensePlate: "",
    vehicleType: "MOTORBIKE",
    facilityName: "",
  });

  function updateForm(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleRoleSelect(selected: Role) {
    setRole(selected);
    setStep(2);
    setError("");
  }

  function handleBack() {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    }
    setError("");
    setOtpError("");
  }

  async function sendOtp(phone: string) {
    const res = await fetch("/api/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");
    if (data.devCode) setDevCode(data.devCode);
    return data;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (role === "ADMIN" && !idPhoto) {
      setError("A photo of your Ghana Card is required to apply as an admin.");
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name,
      phone: form.phone,
      password: form.password,
      role,
      region: form.region,
      district: form.district || undefined,
      ghanaCardNumber: form.ghanaCardNumber,
      ghanaCardName: form.ghanaCardName,
      residenceLocation: form.residenceLocation,
    };

    if (role === "FARMER") {
      payload.farmName = form.farmName || undefined;
      payload.farmSize = form.farmSize ? parseFloat(form.farmSize) : undefined;
      payload.farmLocation = form.farmLocation || undefined;
    } else if (role === "BUYER") {
      payload.businessName = form.businessName || undefined;
      payload.businessType = form.businessType || undefined;
    } else if (role === "LOGISTICS") {
      payload.companyName = form.companyName || undefined;
      payload.licensePlate = form.licensePlate || undefined;
      payload.vehicleType = form.vehicleType;
    } else if (role === "STORAGE_FACILITY") {
      payload.facilityName = form.facilityName || undefined;
    }

    setLoading(true);
    try {
      await sendOtp(form.phone);
      setPendingPayload(payload);
      setOtpCode("");
      setOtpError("");
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setOtpError("");
    setResent(false);
    try {
      await sendOtp(form.phone);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to resend code.");
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    setOtpLoading(true);
    setOtpError("");

    try {
      const verifyRes = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone, code: otpCode }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setOtpError(verifyData.error ?? "Verification failed.");
        return;
      }

      // OTP valid — now create the account
      const registerBody = new FormData();
      for (const [key, value] of Object.entries(pendingPayload ?? {})) {
        if (value !== undefined && value !== null) registerBody.set(key, String(value));
      }
      if (role === "ADMIN" && idPhoto) registerBody.set("idPhotoFront", idPhoto);

      const registerRes = await fetch("/api/register", {
        method: "POST",
        body: registerBody,
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok) {
        setOtpError(registerData.error ?? "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/auth/login?registered=true"), role === "ADMIN" ? 3500 : 2000);
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Maize_farmer.jpg/960px-Maize_farmer.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#fcfcf7]/90" />
      </div>
        <Card className="relative z-10 w-full max-w-md bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl text-center">
          <CardContent className="py-12 flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d3fa99]">
              <CheckCircle className="h-10 w-10 text-[#1c3a13]" />
            </div>
            <h2 className="text-xl font-light tracking-tight text-[#1c3a13]">
              {role === "ADMIN" ? "Application submitted!" : "Account created!"}
            </h2>
            <p className="text-[#1c3a13]/50 text-sm">
              {role === "ADMIN"
                ? "Your account is active — you can start using Lorgric right away. An existing admin will review your application and upgrade your account once approved."
                : "Redirecting you to login..."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Maize_farmer.jpg/960px-Maize_farmer.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[#fcfcf7]/90" />
      </div>
      <div className="relative z-10 w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#d3fa99]">
            <Leaf className="h-7 w-7 text-[#1c3a13]" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Join Lorgric</h1>
            <p className="text-sm text-[#1c3a13]/50">Create your free account</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step === s
                    ? "bg-[#1c3a13] text-[#fcfcf7]"
                    : step > s
                    ? "bg-[#d3fa99] text-[#1c3a13]"
                    : "bg-[#eeeee9] text-[#1c3a13]/40"
                }`}
              >
                {s}
              </div>
              {i < 2 && (
                <div className={`h-0.5 w-12 ${step > s ? "bg-[#1c3a13]" : "bg-[#eeeee9]"}`} />
              )}
            </div>
          ))}
          <p className="ml-2 text-sm text-[#1c3a13]/50">Step {step} of 3</p>
        </div>

        {/* Step 1: Choose Role */}
        {step === 1 && (
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-medium text-[#1c3a13]">I am a...</h2>
              <p className="text-sm text-[#1c3a13]/50">Choose the option that best describes you</p>
            </div>
            <div className="grid gap-3">
              {ROLE_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleRoleSelect(value)}
                  className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all ${
                    role === value
                      ? "border-[#1c3a13] bg-[#eeeee9]"
                      : "border-[#eeeee9] bg-[#fcfcf7] hover:border-[#1c3a13]"
                  }`}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#eeeee9] text-[#1c3a13]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#1c3a13]">{label}</p>
                    <p className="text-sm text-[#1c3a13]/50 mt-0.5">{description}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#1c3a13]/40 flex-shrink-0" />
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-[#1c3a13]/70">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#1c3a13] underline hover:no-underline">
                Sign in
              </Link>
            </p>
          </form>
        )}

        {/* Step 2: Fill Details */}
        {step === 2 && role && (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <button onClick={handleBack} className="text-[#1c3a13]/40 hover:text-[#1c3a13]">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <CardTitle className="text-lg font-light tracking-tight text-[#1c3a13]">
                    {role === "FARMER"
                      ? "Farmer"
                      : role === "BUYER"
                      ? "Buyer"
                      : role === "STORAGE_FACILITY"
                      ? "Storage Facility"
                      : role === "ADMIN"
                      ? "Admin"
                      : "Logistics Provider"}{" "}
                    Details
                  </CardTitle>
                  <CardDescription className="text-[#1c3a13]/50">Fill in your personal information</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[#1c3a13] text-sm font-medium">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Kofi Mensah"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      required
                      className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#1c3a13] text-sm font-medium">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="0244123456"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      required
                      className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-[#1c3a13] text-sm font-medium">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      required
                      className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-[#1c3a13] text-sm font-medium">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={(e) => updateForm("confirmPassword", e.target.value)}
                      required
                      className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region" className="text-[#1c3a13] text-sm font-medium">Region *</Label>
                    <Select value={form.region} onValueChange={(v) => updateForm("region", v)}>
                      <SelectTrigger id="region">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {NORTHERN_GHANA_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district" className="text-[#1c3a13] text-sm font-medium">District</Label>
                    <Input
                      id="district"
                      placeholder="Your district"
                      value={form.district}
                      onChange={(e) => updateForm("district", e.target.value)}
                      className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                    />
                  </div>
                </div>

                {/* Ghana Card */}
                <div className="space-y-4 rounded-lg border border-[#eeeee9] bg-[#eeeee9] p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🪪</span>
                    <div>
                      <p className="text-sm font-medium text-[#1c3a13]">Ghana Card Verification</p>
                      <p className="text-xs text-[#1c3a13]/50">
                        Required to build trust between all platform users
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="ghanaCardNumber" className="text-[#1c3a13] text-sm font-medium">Ghana Card Number *</Label>
                      <Input
                        id="ghanaCardNumber"
                        placeholder="GHA-XXXXXXXXX-X"
                        value={form.ghanaCardNumber}
                        onChange={(e) =>
                          updateForm("ghanaCardNumber", e.target.value.toUpperCase())
                        }
                        required
                        className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ghanaCardName" className="text-[#1c3a13] text-sm font-medium">Name as on Ghana Card *</Label>
                      <Input
                        id="ghanaCardName"
                        placeholder="Full legal name"
                        value={form.ghanaCardName}
                        onChange={(e) => updateForm("ghanaCardName", e.target.value)}
                        required
                        className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="residenceLocation" className="text-[#1c3a13] text-sm font-medium">Place of Residence *</Label>
                      <Input
                        id="residenceLocation"
                        placeholder="e.g. Tamale, Northern Region"
                        value={form.residenceLocation}
                        onChange={(e) => updateForm("residenceLocation", e.target.value)}
                        required
                        className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                      />
                    </div>
                    {role === "ADMIN" && (
                      <div className="space-y-2">
                        <Label htmlFor="idPhoto" className="text-[#1c3a13] text-sm font-medium">Photo of Ghana Card *</Label>
                        <label
                          htmlFor="idPhoto"
                          className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#1c3a13]/20 bg-[#fcfcf7] text-[#1c3a13]/60 hover:border-[#1c3a13]/40 transition-colors"
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-xs text-center px-2 truncate max-w-full">
                            {idPhoto?.name ?? "Upload a clear photo of your Ghana Card"}
                          </span>
                        </label>
                        <input
                          id="idPhoto"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          className="hidden"
                          onChange={(e) => setIdPhoto(e.target.files?.[0] ?? null)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {role === "ADMIN" && (
                  <div className="flex items-start gap-2 rounded-lg border border-[#eeeee9] bg-[#eeeee9] p-3 text-xs text-[#1c3a13]/70">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    You&apos;ll get full buyer access right away. An existing admin reviews your Ghana Card and
                    photo, and your account is upgraded to admin once approved.
                  </div>
                )}

                {/* Farmer-specific */}
                {role === "FARMER" && (
                  <div className="space-y-4 rounded-lg border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <p className="text-sm font-medium text-[#1c3a13]">Farm Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="farmName" className="text-[#1c3a13] text-sm font-medium">Farm Name</Label>
                        <Input
                          id="farmName"
                          placeholder="Mensah Family Farm"
                          value={form.farmName}
                          onChange={(e) => updateForm("farmName", e.target.value)}
                          className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="farmSize" className="text-[#1c3a13] text-sm font-medium">Farm Size (acres)</Label>
                        <Input
                          id="farmSize"
                          type="number"
                          placeholder="e.g. 5"
                          min="0"
                          step="0.1"
                          value={form.farmSize}
                          onChange={(e) => updateForm("farmSize", e.target.value)}
                          className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="farmLocation" className="text-[#1c3a13] text-sm font-medium">Farm Location</Label>
                      <Input
                        id="farmLocation"
                        placeholder="e.g. Tamale, Northern Region"
                        value={form.farmLocation}
                        onChange={(e) => updateForm("farmLocation", e.target.value)}
                        className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                      />
                    </div>
                  </div>
                )}

                {/* Buyer-specific */}
                {role === "BUYER" && (
                  <div className="space-y-4 rounded-lg border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <p className="text-sm font-medium text-[#1c3a13]">Business Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName" className="text-[#1c3a13] text-sm font-medium">Business Name</Label>
                        <Input
                          id="businessName"
                          placeholder="Your business name"
                          value={form.businessName}
                          onChange={(e) => updateForm("businessName", e.target.value)}
                          className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType" className="text-[#1c3a13] text-sm font-medium">Business Type</Label>
                        <Select
                          value={form.businessType}
                          onValueChange={(v) => updateForm("businessType", v)}
                        >
                          <SelectTrigger id="businessType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_TYPES.map((bt) => (
                              <SelectItem key={bt.value} value={bt.value}>
                                {bt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logistics-specific */}
                {role === "LOGISTICS" && (
                  <div className="space-y-4 rounded-lg border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{form.vehicleType === "TRUCK" ? "🚛" : "🏍️"}</span>
                      <p className="text-sm font-medium text-[#1c3a13]">Rider Information</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1c3a13] text-sm font-medium">Vehicle Type</Label>
                      <Select value={form.vehicleType} onValueChange={(v) => updateForm("vehicleType", v)}>
                        <SelectTrigger className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MOTORBIKE">🏍️ Motorbike — last-mile delivery</SelectItem>
                          <SelectItem value="TRUCK">🚛 Truck — bulk hauls, e.g. to/from a storage facility</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-[#1c3a13] text-sm font-medium">Trading Name</Label>
                        <Input
                          id="companyName"
                          placeholder="e.g. Kofi Deliveries"
                          value={form.companyName}
                          onChange={(e) => updateForm("companyName", e.target.value)}
                          className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licensePlate" className="text-[#1c3a13] text-sm font-medium">License Plate</Label>
                        <Input
                          id="licensePlate"
                          placeholder="e.g. GN-1234-23"
                          value={form.licensePlate}
                          onChange={(e) => updateForm("licensePlate", e.target.value)}
                          className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage facility-specific */}
                {role === "STORAGE_FACILITY" && (
                  <div className="space-y-4 rounded-lg border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-5 w-5 text-[#1c3a13]" />
                      <p className="text-sm font-medium text-[#1c3a13]">Facility Information</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="facilityName" className="text-[#1c3a13] text-sm font-medium">Facility Name</Label>
                      <Input
                        id="facilityName"
                        placeholder="e.g. Bolgatanga Cold Storage"
                        value={form.facilityName}
                        onChange={(e) => updateForm("facilityName", e.target.value)}
                        className="bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                      />
                    </div>
                    <p className="text-xs text-[#1c3a13]/50">
                      You&apos;ll set your location, storage type, and accepted crops after signing in.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Sending verification code..." : "Continue — Verify Phone"}
                </Button>

                <p className="text-center text-xs text-[#1c3a13]/50">
                  By registering, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: OTP Verification */}
        {step === 3 && (
          <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <button onClick={handleBack} className="text-[#1c3a13]/40 hover:text-[#1c3a13]">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <CardTitle className="text-lg font-light tracking-tight text-[#1c3a13]">Verify your phone number</CardTitle>
                  <CardDescription className="text-[#1c3a13]/50">
                    Enter the 6-digit code sent to your phone
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#eeeee9] border border-[#eeeee9]">
                  <Phone className="h-5 w-5 text-[#1c3a13]/40" />
                  <div className="text-center">
                    <p className="text-sm text-[#1c3a13]/50">Code sent to</p>
                    <p className="font-semibold text-[#1c3a13]">
                      +233 ****{" "}
                      {form.phone.length >= 4 ? form.phone.slice(-4) : form.phone}
                    </p>
                  </div>
                </div>

                {devCode && (
                  <div className="rounded-lg bg-[#eeeee9] border border-[#eeeee9] p-3 text-sm text-[#1c3a13]">
                    <strong>Dev mode:</strong> Your OTP is{" "}
                    <span className="font-mono font-bold">{devCode}</span>
                  </div>
                )}

                {otpError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{otpError}</span>
                  </div>
                )}

                {resent && (
                  <p className="text-center text-sm text-[#1c3a13]">Code resent successfully!</p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="otpCode" className="text-[#1c3a13] text-sm font-medium">Verification Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="text-center text-2xl font-mono tracking-widest bg-[#fcfcf7] border border-[#eeeee9] rounded-lg focus:ring-[#1c3a13]"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-[#1c3a13]/40 text-center">
                    Code is valid for 10 minutes
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]"
                  size="lg"
                  disabled={otpLoading || otpCode.length !== 6}
                >
                  {otpLoading ? "Verifying..." : "Verify & Create Account"}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-sm text-[#1c3a13]/50 hover:text-[#1c3a13] underline hover:no-underline"
                  >
                    Didn&apos;t receive a code? Resend
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
