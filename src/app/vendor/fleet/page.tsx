"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Bus, Plus, Loader2, RefreshCw, CheckCircle, XCircle, MapPin } from "lucide-react";
import { VehicleTrackButton } from "@/components/shared/vehicle-presence-tracker";

type Vehicle = {
  id: string;
  vehicleType: string;
  licensePlate: string | null;
  driverName: string | null;
  driverPhone: string | null;
  capacity: number | null;
  isAvailable: boolean;
  latitude: number | null;
  longitude: number | null;
  lastSeen: string | null;
};

const VEHICLE_ICONS: Record<string, React.ReactNode> = {
  BUS: <Bus className="h-5 w-5" />,
  MINIBUS: <Bus className="h-5 w-5" />,
  PICKUP_TRUCK: <Truck className="h-5 w-5" />,
  VAN: <Truck className="h-5 w-5" />,
};

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  BUS: "Bus", MINIBUS: "Minibus", PICKUP_TRUCK: "Pickup Truck", VAN: "Van",
};

export default function VendorFleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [form, setForm] = useState({
    vehicleType: "MINIBUS",
    licensePlate: "",
    driverName: "",
    driverPhone: "",
    capacity: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  const fetchFleet = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vendor/fleet");
    const data = await res.json();
    setVehicles(data.vehicles ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFleet(); }, [fetchFleet]);

  async function toggleAvailability(vehicle: Vehicle) {
    setActing(vehicle.id);
    await fetch("/api/vendor/fleet", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vehicleId: vehicle.id, isAvailable: !vehicle.isAvailable }),
    });
    await fetchFleet();
    setActing(null);
  }

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    await fetch("/api/vendor/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        capacity: form.capacity ? parseFloat(form.capacity) : undefined,
      }),
    });
    setShowForm(false);
    setForm({ vehicleType: "MINIBUS", licensePlate: "", driverName: "", driverPhone: "", capacity: "" });
    await fetchFleet();
    setFormLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-[#1c3a13]">Fleet Management</h1>
          <p className="text-[#1c3a13]/50 text-sm mt-1">{vehicles.length} vehicles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchFleet} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-[#eeeee9] px-3 py-2 text-sm text-[#1c3a13]/70 hover:bg-[#eeeee9] disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1c3a13] px-4 py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {showForm && (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium text-[#1c3a13]">Add New Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addVehicle} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">Vehicle Type</label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => setForm((p) => ({ ...p, vehicleType: e.target.value }))}
                  className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]"
                >
                  {Object.entries(VEHICLE_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">License Plate</label>
                <input value={form.licensePlate} onChange={(e) => setForm((p) => ({ ...p, licensePlate: e.target.value }))} className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]" placeholder="NR-0000-00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">Driver Name</label>
                <input value={form.driverName} onChange={(e) => setForm((p) => ({ ...p, driverName: e.target.value }))} className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">Driver Phone</label>
                <input value={form.driverPhone} onChange={(e) => setForm((p) => ({ ...p, driverPhone: e.target.value }))} className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1c3a13] mb-1">Capacity (kg)</label>
                <input type="number" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]" />
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="submit" disabled={formLoading} className="flex-1 rounded-full bg-[#1c3a13] py-2 text-sm font-semibold text-[#fcfcf7] hover:bg-[#2a5219] disabled:opacity-60">
                  {formLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Vehicle"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-[#eeeee9] px-4 py-2 text-sm text-[#1c3a13]/70 hover:bg-[#eeeee9]">Cancel</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-[#1c3a13]" /></div>
      ) : vehicles.length === 0 ? (
        <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <CardContent className="py-16 text-center">
            <Truck className="h-12 w-12 mx-auto mb-4 text-[#1c3a13]/40" />
            <p className="text-[#1c3a13]/50">No vehicles yet. Add one to manage deliveries.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <Card key={v.id} className={`bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl border-l-4 ${v.isAvailable ? "border-l-[#1c3a13]" : "border-l-[#c4c7c4]"}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className={`flex items-center gap-2 ${v.isAvailable ? "text-[#1c3a13]" : "text-[#1c3a13]/40"}`}>
                    {VEHICLE_ICONS[v.vehicleType] ?? <Truck className="h-5 w-5" />}
                    <span className="font-medium">{VEHICLE_TYPE_LABELS[v.vehicleType] ?? v.vehicleType}</span>
                  </div>
                  {v.isAvailable ? (
                    <span className="inline-flex items-center gap-1 text-xs text-[#1c3a13]"><CheckCircle className="h-3.5 w-3.5" /> Available</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-[#1c3a13]/50"><XCircle className="h-3.5 w-3.5" /> Unavailable</span>
                  )}
                </div>
                {v.licensePlate && <p className="text-sm font-mono text-[#1c3a13] mb-1">{v.licensePlate}</p>}
                {v.driverName && <p className="text-sm text-[#1c3a13]/70">{v.driverName}</p>}
                {v.driverPhone && <p className="text-xs text-[#1c3a13]/40">{v.driverPhone}</p>}
                {v.capacity && <p className="text-xs text-[#1c3a13]/50 mt-1">Capacity: {v.capacity} kg</p>}
                {v.lastSeen && (
                  <p className="flex items-center gap-1 text-xs text-[#1c3a13] mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d3fa99] animate-pulse" />
                    Live location active
                    {v.latitude && v.longitude && (
                      <span className="text-[#1c3a13]/40 ml-1">
                        <MapPin className="h-3 w-3 inline" />
                        {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => toggleAvailability(v)}
                    disabled={acting === v.id}
                    className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${v.isAvailable ? "border border-[#eeeee9] text-[#1c3a13]/70 hover:bg-[#eeeee9]" : "bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"}`}
                  >
                    {acting === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : v.isAvailable ? "Mark Unavailable" : "Mark Available"}
                  </button>
                  {v.isAvailable && (
                    <VehicleTrackButton
                      vehicleId={v.id}
                      vehicleLabel={`${VEHICLE_TYPE_LABELS[v.vehicleType] ?? v.vehicleType} ${v.licensePlate ?? ""}`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
