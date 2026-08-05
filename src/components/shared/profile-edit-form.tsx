"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Loader2, AlertCircle, Lock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type Role = "FARMER" | "BUYER" | "LOGISTICS" | "STORAGE_FACILITY" | "ADMIN";

interface FarmerProfile { farmName: string; farmSize: number | null; location: string; description: string | null; acceptsCOD: boolean; rating: number; totalRatings: number }
interface BuyerProfile { businessName: string | null; businessType: string; description: string | null; rating: number; totalRatings: number }
interface LogisticsProfile { companyName: string | null; licensePlate: string | null; vehicleType: string; vehicleCapacity: number | null; coverageAreas: string[]; rating: number; totalRatings: number }
interface StorageFacilityProfile { name: string; location: string; description: string | null; operatingHours: string | null; capacityTonnes: number | null; rating: number; totalRatings: number }

interface ProfileEditFormProps {
  name: string;
  phone: string;
  region: string | null;
  district: string | null;
  ghanaCardNumber: string | null;
  ghanaCardName: string | null;
  residenceLocation: string | null;
  isVerified: boolean;
  role: Role;
  farmerProfile: FarmerProfile | null;
  buyerProfile: BuyerProfile | null;
  logisticsProfile: LogisticsProfile | null;
  storageFacilityProfile: StorageFacilityProfile | null;
}

const BUYER_TYPES = ["WHOLESALER", "RETAILER", "RESTAURANT", "PROCESSOR", "EXPORTER", "HOUSEHOLD"];
const VEHICLE_TYPES = ["MOTORBIKE", "TRUCK"];

const fieldClass = "space-y-1.5";
const rowClass = "flex justify-between text-sm";
const labelClass = "text-[#1c3a13]/50";
const valueClass = "font-medium text-[#1c3a13]";

export function ProfileEditForm(props: ProfileEditFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(props.name);
  const [phone, setPhone] = useState(props.phone);
  const [region, setRegion] = useState(props.region ?? "");
  const [district, setDistrict] = useState(props.district ?? "");
  const [ghanaCardNumber, setGhanaCardNumber] = useState(props.ghanaCardNumber ?? "");
  const [ghanaCardName, setGhanaCardName] = useState(props.ghanaCardName ?? "");
  const [residenceLocation, setResidenceLocation] = useState(props.residenceLocation ?? "");

  const [farmName, setFarmName] = useState(props.farmerProfile?.farmName ?? "");
  const [farmSize, setFarmSize] = useState(props.farmerProfile?.farmSize?.toString() ?? "");
  const [farmLocation, setFarmLocation] = useState(props.farmerProfile?.location ?? "");
  const [farmDescription, setFarmDescription] = useState(props.farmerProfile?.description ?? "");

  const [businessName, setBusinessName] = useState(props.buyerProfile?.businessName ?? "");
  const [businessType, setBusinessType] = useState(props.buyerProfile?.businessType ?? "HOUSEHOLD");
  const [buyerDescription, setBuyerDescription] = useState(props.buyerProfile?.description ?? "");

  const [companyName, setCompanyName] = useState(props.logisticsProfile?.companyName ?? "");
  const [licensePlate, setLicensePlate] = useState(props.logisticsProfile?.licensePlate ?? "");
  const [vehicleType, setVehicleType] = useState(props.logisticsProfile?.vehicleType ?? "MOTORBIKE");
  const [vehicleCapacity, setVehicleCapacity] = useState(props.logisticsProfile?.vehicleCapacity?.toString() ?? "");

  const [facilityName, setFacilityName] = useState(props.storageFacilityProfile?.name ?? "");
  const [facilityLocation, setFacilityLocation] = useState(props.storageFacilityProfile?.location ?? "");
  const [facilityDescription, setFacilityDescription] = useState(props.storageFacilityProfile?.description ?? "");
  const [operatingHours, setOperatingHours] = useState(props.storageFacilityProfile?.operatingHours ?? "");
  const [capacityTonnes, setCapacityTonnes] = useState(props.storageFacilityProfile?.capacityTonnes?.toString() ?? "");

  function resetToProps() {
    setName(props.name);
    setPhone(props.phone);
    setRegion(props.region ?? "");
    setDistrict(props.district ?? "");
    setGhanaCardNumber(props.ghanaCardNumber ?? "");
    setGhanaCardName(props.ghanaCardName ?? "");
    setResidenceLocation(props.residenceLocation ?? "");
    setFarmName(props.farmerProfile?.farmName ?? "");
    setFarmSize(props.farmerProfile?.farmSize?.toString() ?? "");
    setFarmLocation(props.farmerProfile?.location ?? "");
    setFarmDescription(props.farmerProfile?.description ?? "");
    setBusinessName(props.buyerProfile?.businessName ?? "");
    setBusinessType(props.buyerProfile?.businessType ?? "HOUSEHOLD");
    setBuyerDescription(props.buyerProfile?.description ?? "");
    setCompanyName(props.logisticsProfile?.companyName ?? "");
    setLicensePlate(props.logisticsProfile?.licensePlate ?? "");
    setVehicleType(props.logisticsProfile?.vehicleType ?? "MOTORBIKE");
    setVehicleCapacity(props.logisticsProfile?.vehicleCapacity?.toString() ?? "");
    setFacilityName(props.storageFacilityProfile?.name ?? "");
    setFacilityLocation(props.storageFacilityProfile?.location ?? "");
    setFacilityDescription(props.storageFacilityProfile?.description ?? "");
    setOperatingHours(props.storageFacilityProfile?.operatingHours ?? "");
    setCapacityTonnes(props.storageFacilityProfile?.capacityTonnes?.toString() ?? "");
  }

  function handleCancel() {
    resetToProps();
    setError("");
    setEditing(false);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          region,
          district: district || undefined,
          ...(!props.isVerified && { ghanaCardNumber, ghanaCardName, residenceLocation }),
          ...(props.role === "FARMER" && {
            farmName,
            farmSize: farmSize ? Number(farmSize) : undefined,
            farmLocation,
            farmDescription: farmDescription || undefined,
          }),
          ...(props.role === "BUYER" && {
            businessName: businessName || undefined,
            businessType,
            buyerDescription: buyerDescription || undefined,
          }),
          ...(props.role === "LOGISTICS" && {
            companyName: companyName || undefined,
            licensePlate: licensePlate || undefined,
            vehicleType,
            vehicleCapacity: vehicleCapacity ? Number(vehicleCapacity) : undefined,
          }),
          ...(props.role === "STORAGE_FACILITY" && {
            facilityName,
            facilityLocation,
            facilityDescription: facilityDescription || undefined,
            operatingHours: operatingHours || undefined,
            capacityTonnes: capacityTonnes ? Number(capacityTonnes) : undefined,
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save changes");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Contact info */}
      <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium text-[#1c3a13]">Contact Information</CardTitle>
          {!editing && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-[#1c3a13]/50 hover:text-[#1c3a13]">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {!editing ? (
            <>
              <div className={rowClass}><span className={labelClass}>Name</span><span className={valueClass}>{props.name}</span></div>
              <div className={rowClass}><span className={labelClass}>Phone</span><span className={valueClass}>{props.phone}</span></div>
              {(props.region || props.district) && (
                <div className={rowClass}><span className={labelClass}>Location</span><span className={valueClass}>{[props.district, props.region].filter(Boolean).join(", ")}</span></div>
              )}
              <div className="pt-2 border-t border-[#eeeee9] space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/50">
                  Ghana Card
                  {props.isVerified && <span className="flex items-center gap-1 text-[#1c3a13]/40"><Lock className="h-3 w-3" />Locked — verified</span>}
                </div>
                <div className={rowClass}><span className={labelClass}>Number</span><span className={valueClass}>{props.ghanaCardNumber ?? "—"}</span></div>
                <div className={rowClass}><span className={labelClass}>Name on card</span><span className={valueClass}>{props.ghanaCardName ?? "—"}</span></div>
                <div className={rowClass}><span className={labelClass}>Residence</span><span className={valueClass}>{props.residenceLocation ?? "—"}</span></div>
              </div>
            </>
          ) : (
            <>
              <div className={fieldClass}>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
              </div>
              <div className={fieldClass}>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className={fieldClass}>
                  <Label>Region</Label>
                  <Input value={region} onChange={(e) => setRegion(e.target.value)} disabled={saving} />
                </div>
                <div className={fieldClass}>
                  <Label>District</Label>
                  <Input value={district} onChange={(e) => setDistrict(e.target.value)} disabled={saving} />
                </div>
              </div>

              <div className="pt-2 border-t border-[#eeeee9] space-y-3">
                <div className="flex items-center gap-1.5 text-xs text-[#1c3a13]/50">Ghana Card</div>
                {props.isVerified ? (
                  <div className="rounded-lg bg-[#eeeee9] p-3 text-xs text-[#1c3a13]/60 flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 flex-shrink-0" />
                    Your identity is verified, so these details are locked. To change them, submit a new verification request.
                  </div>
                ) : (
                  <>
                    <div className={fieldClass}>
                      <Label>Ghana Card Number</Label>
                      <Input value={ghanaCardNumber} onChange={(e) => setGhanaCardNumber(e.target.value)} disabled={saving} />
                    </div>
                    <div className={fieldClass}>
                      <Label>Name on Card</Label>
                      <Input value={ghanaCardName} onChange={(e) => setGhanaCardName(e.target.value)} disabled={saving} />
                    </div>
                    <div className={fieldClass}>
                      <Label>Residence Location</Label>
                      <Input value={residenceLocation} onChange={(e) => setResidenceLocation(e.target.value)} disabled={saving} />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={handleCancel} disabled={saving} className="flex-1 rounded-full border-[#eeeee9] text-[#1c3a13]">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-[#1c3a13] text-[#fcfcf7] rounded-full hover:bg-[#2a5219]">
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save changes"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Role-specific profile */}
      {props.role === "FARMER" && props.farmerProfile && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium text-[#1c3a13]">Farm Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!editing ? (
              <>
                <div className={rowClass}><span className={labelClass}>Farm name</span><span className={valueClass}>{props.farmerProfile.farmName}</span></div>
                {props.farmerProfile.farmSize != null && (
                  <div className={rowClass}><span className={labelClass}>Farm size</span><span className={valueClass}>{props.farmerProfile.farmSize} acres</span></div>
                )}
                <div className={rowClass}><span className={labelClass}>Location</span><span className={valueClass}>{props.farmerProfile.location}</span></div>
                <div className={`${rowClass} items-center`}>
                  <span className={labelClass}>Rating</span>
                  <span className={`${valueClass} flex items-center gap-1`}><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{props.farmerProfile.rating.toFixed(1)} ({props.farmerProfile.totalRatings})</span>
                </div>
                {props.farmerProfile.description && <p className="text-[#1c3a13]/70 pt-1 border-t border-[#eeeee9] text-sm">{props.farmerProfile.description}</p>}
              </>
            ) : (
              <>
                <div className={fieldClass}><Label>Farm name</Label><Input value={farmName} onChange={(e) => setFarmName(e.target.value)} disabled={saving} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={fieldClass}><Label>Farm size (acres)</Label><Input type="number" value={farmSize} onChange={(e) => setFarmSize(e.target.value)} disabled={saving} /></div>
                  <div className={fieldClass}><Label>Location</Label><Input value={farmLocation} onChange={(e) => setFarmLocation(e.target.value)} disabled={saving} /></div>
                </div>
                <div className={fieldClass}><Label>Description</Label><Textarea value={farmDescription} onChange={(e) => setFarmDescription(e.target.value)} disabled={saving} /></div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {props.role === "BUYER" && props.buyerProfile && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium text-[#1c3a13]">Buyer Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!editing ? (
              <>
                {props.buyerProfile.businessName && (
                  <div className={rowClass}><span className={labelClass}>Business</span><span className={valueClass}>{props.buyerProfile.businessName}</span></div>
                )}
                <div className={rowClass}><span className={labelClass}>Type</span><span className={valueClass}>{props.buyerProfile.businessType}</span></div>
                <div className={`${rowClass} items-center`}>
                  <span className={labelClass}>Rating</span>
                  <span className={`${valueClass} flex items-center gap-1`}><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{props.buyerProfile.rating.toFixed(1)} ({props.buyerProfile.totalRatings})</span>
                </div>
              </>
            ) : (
              <>
                <div className={fieldClass}><Label>Business name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={saving} /></div>
                <div className={fieldClass}>
                  <Label>Business type</Label>
                  <Select value={businessType} onValueChange={setBusinessType} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldClass}><Label>Description</Label><Textarea value={buyerDescription} onChange={(e) => setBuyerDescription(e.target.value)} disabled={saving} /></div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {props.role === "LOGISTICS" && props.logisticsProfile && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium text-[#1c3a13]">Rider Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!editing ? (
              <>
                {props.logisticsProfile.companyName && (
                  <div className={rowClass}><span className={labelClass}>Trading name</span><span className={valueClass}>{props.logisticsProfile.companyName}</span></div>
                )}
                {props.logisticsProfile.licensePlate && (
                  <div className={rowClass}><span className={labelClass}>Plate</span><span className={`${valueClass} font-mono`}>{props.logisticsProfile.licensePlate}</span></div>
                )}
                <div className={rowClass}><span className={labelClass}>Vehicle</span><span className={valueClass}>{props.logisticsProfile.vehicleType === "TRUCK" ? "Truck 🚚" : "Motorbike 🏍️"}</span></div>
                <div className={`${rowClass} items-center`}>
                  <span className={labelClass}>Rating</span>
                  <span className={`${valueClass} flex items-center gap-1`}><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{props.logisticsProfile.rating.toFixed(1)} ({props.logisticsProfile.totalRatings})</span>
                </div>
                {props.logisticsProfile.coverageAreas.length > 0 && (
                  <div className={rowClass}><span className={labelClass}>Coverage</span><span className="font-medium text-right text-xs text-[#1c3a13]">{props.logisticsProfile.coverageAreas.join(", ")}</span></div>
                )}
              </>
            ) : (
              <>
                <div className={fieldClass}><Label>Trading name</Label><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={saving} /></div>
                <div className={fieldClass}><Label>License plate</Label><Input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} disabled={saving} /></div>
                <div className={fieldClass}>
                  <Label>Vehicle type</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {VEHICLE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className={fieldClass}><Label>Vehicle capacity (kg)</Label><Input type="number" value={vehicleCapacity} onChange={(e) => setVehicleCapacity(e.target.value)} disabled={saving} /></div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {props.role === "STORAGE_FACILITY" && props.storageFacilityProfile && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-3"><CardTitle className="text-base font-medium text-[#1c3a13]">Facility Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!editing ? (
              <>
                <div className={rowClass}><span className={labelClass}>Facility name</span><span className={valueClass}>{props.storageFacilityProfile.name}</span></div>
                <div className={rowClass}><span className={labelClass}>Location</span><span className={valueClass}>{props.storageFacilityProfile.location}</span></div>
                {props.storageFacilityProfile.operatingHours && (
                  <div className={rowClass}><span className={labelClass}>Hours</span><span className={valueClass}>{props.storageFacilityProfile.operatingHours}</span></div>
                )}
                {props.storageFacilityProfile.capacityTonnes != null && (
                  <div className={rowClass}><span className={labelClass}>Capacity</span><span className={valueClass}>{props.storageFacilityProfile.capacityTonnes} tonnes</span></div>
                )}
                <div className={`${rowClass} items-center`}>
                  <span className={labelClass}>Rating</span>
                  <span className={`${valueClass} flex items-center gap-1`}><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{props.storageFacilityProfile.rating.toFixed(1)} ({props.storageFacilityProfile.totalRatings})</span>
                </div>
                {props.storageFacilityProfile.description && <p className="text-[#1c3a13]/70 pt-1 border-t border-[#eeeee9] text-sm">{props.storageFacilityProfile.description}</p>}
              </>
            ) : (
              <>
                <div className={fieldClass}><Label>Facility name</Label><Input value={facilityName} onChange={(e) => setFacilityName(e.target.value)} disabled={saving} /></div>
                <div className={fieldClass}><Label>Location</Label><Input value={facilityLocation} onChange={(e) => setFacilityLocation(e.target.value)} disabled={saving} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={fieldClass}><Label>Operating hours</Label><Input value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} disabled={saving} /></div>
                  <div className={fieldClass}><Label>Capacity (tonnes)</Label><Input type="number" value={capacityTonnes} onChange={(e) => setCapacityTonnes(e.target.value)} disabled={saving} /></div>
                </div>
                <div className={fieldClass}><Label>Description</Label><Textarea value={facilityDescription} onChange={(e) => setFacilityDescription(e.target.value)} disabled={saving} /></div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
