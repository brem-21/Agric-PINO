"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Leaf, AlertCircle, CheckCircle, Tractor, ShoppingBag, Truck, ShieldCheck, Upload, ArrowLeft, ArrowRight } from "lucide-react";
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

type Role = "FARMER" | "BUYER" | "LOGISTICS" | "ADMIN";

interface FormData {
  // Common
  name: string;
  phone: string;
  password: string;
  confirmPassword: string;
  region: string;
  district: string;
  // Ghana Card
  ghanaCardNumber: string;
  ghanaCardName: string;
  residenceLocation: string;
  // Farmer
  farmName: string;
  farmSize: string;
  farmLocation: string;
  // Buyer
  businessName: string;
  businessType: string;
  // Logistics
  companyName: string;
  licensePlate: string;
}

const ROLE_OPTIONS: { value: Role; label: string; description: string; icon: React.ElementType }[] = [
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
    value: "ADMIN",
    label: "Admin",
    description: "Apply for platform admin access — requires Ghana Card + photo and review by an existing admin",
    icon: ShieldCheck,
  },
];

const BUSINESS_TYPES = [
  { value: "RETAILER", label: "Retailer" },
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "PROCESSOR", label: "Food Processor" },
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
    setStep(1);
    setError("");
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

    setLoading(true);

    try {
      const payload = new FormData();
      payload.set("name", form.name);
      payload.set("phone", form.phone);
      payload.set("password", form.password);
      payload.set("role", role ?? "");
      payload.set("region", form.region);
      if (form.district) payload.set("district", form.district);
      payload.set("ghanaCardNumber", form.ghanaCardNumber);
      payload.set("ghanaCardName", form.ghanaCardName);
      payload.set("residenceLocation", form.residenceLocation);

      if (role === "FARMER") {
        if (form.farmName) payload.set("farmName", form.farmName);
        if (form.farmSize) payload.set("farmSize", form.farmSize);
        if (form.farmLocation) payload.set("farmLocation", form.farmLocation);
      } else if (role === "BUYER") {
        if (form.businessName) payload.set("businessName", form.businessName);
        if (form.businessType) payload.set("businessType", form.businessType);
      } else if (role === "LOGISTICS") {
        if (form.companyName) payload.set("companyName", form.companyName);
        if (form.licensePlate) payload.set("licensePlate", form.licensePlate);
      } else if (role === "ADMIN" && idPhoto) {
        payload.set("idPhotoFront", idPhoto);
      }

      const res = await fetch("/api/register", {
        method: "POST",
        body: payload,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/auth/login?registered=true"), role === "ADMIN" ? 3500 : 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
        <Card className="relative z-10 w-full max-w-md text-center">
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
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step === 1 ? "bg-[#1c3a13] text-[#fcfcf7]" : "bg-[#d3fa99] text-[#1c3a13]"}`}>1</div>
          <div className={`h-0.5 w-16 ${step === 2 ? "bg-[#1c3a13]" : "bg-[#eeeee9]"}`} />
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${step === 2 ? "bg-[#1c3a13] text-[#fcfcf7]" : "bg-[#eeeee9] text-[#1c3a13]/40"}`}>2</div>
          <p className="ml-2 text-sm text-[#1c3a13]/50">Step {step} of 2</p>
        </div>

        {/* Step 1: Choose Role */}
        {step === 1 && (
          <div className="space-y-4">
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
                  className={`flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors ${
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
            <p className="text-center text-sm text-[#1c3a13]/50">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-[#1c3a13] hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        )}

        {/* Step 2: Fill Details */}
        {step === 2 && role && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleBack} className="text-[#1c3a13]/40 hover:text-[#1c3a13]">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <CardTitle className="text-lg">
                    {role === "FARMER" ? "Farmer" : role === "BUYER" ? "Buyer" : role === "ADMIN" ? "Admin" : "Logistics Provider"} Details
                  </CardTitle>
                  <CardDescription>Fill in your personal information</CardDescription>
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

                {/* Common fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="Kofi Mensah"
                      value={form.name}
                      onChange={(e) => updateForm("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      placeholder="0244123456"
                      value={form.phone}
                      onChange={(e) => updateForm("phone", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Min. 8 characters"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={(e) => updateForm("confirmPassword", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="region">Region *</Label>
                    <Select value={form.region} onValueChange={(v) => updateForm("region", v)}>
                      <SelectTrigger id="region">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {NORTHERN_GHANA_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Input
                      id="district"
                      placeholder="Your district"
                      value={form.district}
                      onChange={(e) => updateForm("district", e.target.value)}
                    />
                  </div>
                </div>

                {/* Ghana Card */}
                <div className="space-y-4 rounded-xl border border-[#eeeee9] bg-[#eeeee9] p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🪪</span>
                    <div>
                      <p className="text-sm font-medium text-[#1c3a13]">Ghana Card Verification</p>
                      <p className="text-xs text-[#1c3a13]/60">Required to build trust between all platform users</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="ghanaCardNumber">Ghana Card Number *</Label>
                      <Input
                        id="ghanaCardNumber"
                        placeholder="GHA-XXXXXXXXX-X"
                        value={form.ghanaCardNumber}
                        onChange={(e) => updateForm("ghanaCardNumber", e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ghanaCardName">Name as on Ghana Card *</Label>
                      <Input
                        id="ghanaCardName"
                        placeholder="Full legal name"
                        value={form.ghanaCardName}
                        onChange={(e) => updateForm("ghanaCardName", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="residenceLocation">Place of Residence *</Label>
                      <Input
                        id="residenceLocation"
                        placeholder="e.g. Tamale, Northern Region"
                        value={form.residenceLocation}
                        onChange={(e) => updateForm("residenceLocation", e.target.value)}
                        required
                      />
                    </div>
                    {role === "ADMIN" && (
                      <div className="space-y-2">
                        <Label htmlFor="idPhoto">Photo of Ghana Card *</Label>
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
                  <div className="flex items-start gap-2 rounded-xl border border-[#eeeee9] bg-[#eeeee9] p-3 text-xs text-[#1c3a13]/70">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    You&apos;ll get full buyer access right away. An existing admin reviews your Ghana Card and
                    photo, and your account is upgraded to admin once approved.
                  </div>
                )}

                {/* Farmer-specific */}
                {role === "FARMER" && (
                  <div className="space-y-4 rounded-xl border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <p className="text-sm font-medium text-[#1c3a13]">Farm Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="farmName">Farm Name</Label>
                        <Input
                          id="farmName"
                          placeholder="Mensah Family Farm"
                          value={form.farmName}
                          onChange={(e) => updateForm("farmName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="farmSize">Farm Size (acres)</Label>
                        <Input
                          id="farmSize"
                          type="number"
                          placeholder="e.g. 5"
                          min="0"
                          step="0.1"
                          value={form.farmSize}
                          onChange={(e) => updateForm("farmSize", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="farmLocation">Farm Location</Label>
                      <Input
                        id="farmLocation"
                        placeholder="e.g. Tamale, Northern Region"
                        value={form.farmLocation}
                        onChange={(e) => updateForm("farmLocation", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Buyer-specific */}
                {role === "BUYER" && (
                  <div className="space-y-4 rounded-xl border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <p className="text-sm font-medium text-[#1c3a13]">Business Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="businessName">Business Name</Label>
                        <Input
                          id="businessName"
                          placeholder="Your business name"
                          value={form.businessName}
                          onChange={(e) => updateForm("businessName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Select value={form.businessType} onValueChange={(v) => updateForm("businessType", v)}>
                          <SelectTrigger id="businessType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {BUSINESS_TYPES.map((bt) => (
                              <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Logistics-specific */}
                {role === "LOGISTICS" && (
                  <div className="space-y-4 rounded-xl border border-[#eeeee9] bg-[#eeeee9] p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏍️</span>
                      <p className="text-sm font-medium text-[#1c3a13]">Rider Information</p>
                    </div>
                    <p className="text-xs text-[#1c3a13]/50">All logistics providers on Lorgric use motorbikes for last-mile delivery.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Trading Name</Label>
                        <Input
                          id="companyName"
                          placeholder="e.g. Kofi Deliveries"
                          value={form.companyName}
                          onChange={(e) => updateForm("companyName", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="licensePlate">License Plate</Label>
                        <Input
                          id="licensePlate"
                          placeholder="e.g. GN-1234-23"
                          value={form.licensePlate}
                          onChange={(e) => updateForm("licensePlate", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>

                <p className="text-center text-xs text-[#1c3a13]/40">
                  By registering, you agree to our Terms of Service and Privacy Policy.
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
