"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import { useMemo } from "react";
import { getOnlineStatus, haversineDistance, type FareEstimate } from "@/lib/utils";

export interface Rider {
  id: string;
  name: string;
  phone: string;
  companyName?: string | null;
  licensePlate?: string | null;
  rating: number;
  totalRatings: number;
  lastSeen?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isVerified?: boolean;
  verifiedAt?: string | null;
}

export interface VehicleUnit {
  id: string;
  vehicleType: string;
  name: string;
  phone: string | null;
  companyName: string | null;
  licensePlate: string | null;
  capacity: number | null;
  lastSeen?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MapPin {
  lat: number;
  lng: number;
  type: "pickup" | "delivery";
}

interface RiderMapInnerProps {
  riders: Rider[];
  vehicles?: VehicleUnit[];
  pickupPin: MapPin | null;
  deliveryPin: MapPin | null;
  selectedRiderId: string | null;
  onSelectRider: (riderId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  fareEstimate?: FareEstimate | null;
}

const VEHICLE_EMOJIS: Record<string, string> = {
  BUS: "🚌",
  MINIBUS: "🚌",
  PICKUP_TRUCK: "🚛",
  VAN: "🚐",
};

const STATUS_BORDER: Record<string, string> = {
  online: "border:3px solid #22c55e",
  away: "border:3px solid #f59e0b",
  offline: "border:3px solid #ef4444",
};

function createRiderIcon(status: string, selected: boolean) {
  const border = STATUS_BORDER[status] ?? STATUS_BORDER.offline;
  const grayFilter = status === "offline" ? "filter:grayscale(80%);" : "";
  const scale = selected ? "transform:scale(1.3);" : "";
  return L.divIcon({
    html: `<div style="font-size:26px;${grayFilter}${scale}display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:white;${border};box-shadow:0 2px 6px rgba(0,0,0,0.35);">🏍️</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

function createVehicleIcon(vehicleType: string, status: string, selected: boolean) {
  const emoji = VEHICLE_EMOJIS[vehicleType] ?? "🚛";
  const border = STATUS_BORDER[status] ?? STATUS_BORDER.offline;
  const grayFilter = status === "offline" ? "filter:grayscale(80%);" : "";
  const scale = selected ? "transform:scale(1.3);" : "";
  return L.divIcon({
    html: `<div style="font-size:24px;${grayFilter}${scale}display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;background:white;${border};box-shadow:0 2px 6px rgba(0,0,0,0.35);">${emoji}</div>`,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

const pickupIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const deliveryIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function RiderMapInner({
  riders,
  vehicles = [],
  pickupPin,
  deliveryPin,
  selectedRiderId,
  onSelectRider,
  onMapClick,
  fareEstimate,
}: RiderMapInnerProps) {
  const ridersWithLocation = useMemo(
    () => riders.filter((r) => r.latitude != null && r.longitude != null),
    [riders]
  );

  const vehiclesWithLocation = useMemo(
    () => vehicles.filter((v) => v.latitude != null && v.longitude != null),
    [vehicles]
  );

  return (
    <MapContainer
      center={[9.4, -0.84]}
      zoom={9}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />
      <MapClickHandler onMapClick={onMapClick} />

      {ridersWithLocation.map((rider) => {
        const status = getOnlineStatus(rider.lastSeen);
        const selected = rider.id === selectedRiderId;
        const icon = createRiderIcon(status, selected);
        const distFromPickup =
          pickupPin && rider.latitude && rider.longitude
            ? haversineDistance(pickupPin.lat, pickupPin.lng, rider.latitude, rider.longitude)
            : null;

        return (
          <Marker
            key={rider.id}
            position={[rider.latitude!, rider.longitude!]}
            icon={icon}
            eventHandlers={{
              mouseover: (e) => { e.target.openPopup(); },
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>
                  🏍️ {rider.name}
                  {rider.isVerified && (
                    <span style={{ color: "#3b82f6", marginLeft: 4 }}>✓</span>
                  )}
                </p>
                {rider.companyName && (
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>{rider.companyName}</p>
                )}
                <p style={{ fontSize: 12, marginBottom: 2 }}>
                  ⭐ {rider.rating.toFixed(1)} ({rider.totalRatings} trips)
                </p>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>📞 {rider.phone}</p>
                <p style={{ fontSize: 11, marginBottom: 4 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: status === "online" ? "#22c55e" : status === "away" ? "#f59e0b" : "#ef4444",
                      marginRight: 4,
                    }}
                  />
                  {status === "online" ? "Online" : status === "away" ? "Recently online" : "Offline"}
                </p>
                {distFromPickup !== null && (
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>
                    📍 {distFromPickup.toFixed(1)} km from pickup
                  </p>
                )}
                {fareEstimate && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#16a34a", marginBottom: 6 }}>
                    Est. GHS {fareEstimate.total.toFixed(2)} · ~{fareEstimate.etaMinutes} min
                  </p>
                )}
                <button
                  onClick={() => onSelectRider(rider.id)}
                  style={{
                    background: selected ? "#15803d" : "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    width: "100%",
                  }}
                >
                  {selected ? "✓ Selected" : "Select Rider"}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {vehiclesWithLocation.map((v) => {
        const status = getOnlineStatus(v.lastSeen);
        const selected = v.id === selectedRiderId;
        const icon = createVehicleIcon(v.vehicleType, status, selected);
        const emoji = VEHICLE_EMOJIS[v.vehicleType] ?? "🚛";

        return (
          <Marker
            key={v.id}
            position={[v.latitude!, v.longitude!]}
            icon={icon}
            eventHandlers={{
              mouseover: (e) => { e.target.openPopup(); },
            }}
          >
            <Popup>
              <div style={{ minWidth: 160 }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>
                  {emoji} {v.vehicleType.replace(/_/g, " ")}
                </p>
                {v.companyName && (
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 2 }}>{v.companyName}</p>
                )}
                {v.licensePlate && (
                  <p style={{ fontSize: 12, color: "#555", marginBottom: 2, fontFamily: "monospace" }}>{v.licensePlate}</p>
                )}
                {v.name && v.name !== "Driver" && (
                  <p style={{ fontSize: 12, marginBottom: 2 }}>Driver: {v.name}</p>
                )}
                {v.capacity && (
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>Capacity: {v.capacity} kg</p>
                )}
                <p style={{ fontSize: 11, marginBottom: 4 }}>
                  <span
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: status === "online" ? "#22c55e" : status === "away" ? "#f59e0b" : "#ef4444",
                      marginRight: 4,
                    }}
                  />
                  {status === "online" ? "Online" : status === "away" ? "Recently online" : "Offline"}
                </p>
                {v.phone && (
                  <a
                    href={`tel:${v.phone}`}
                    style={{ fontSize: 12, color: "#16a34a", display: "block", marginBottom: 6 }}
                  >
                    📞 {v.phone}
                  </a>
                )}
                <button
                  onClick={() => onSelectRider(v.id)}
                  style={{
                    background: selected ? "#4338ca" : "#6366f1",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    width: "100%",
                  }}
                >
                  {selected ? "✓ Selected" : "Select Vehicle"}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {pickupPin && (
        <Marker position={[pickupPin.lat, pickupPin.lng]} icon={pickupIcon}>
          <Popup>
            <span style={{ fontSize: 12, fontWeight: 600 }}>📍 Pickup point</span>
          </Popup>
        </Marker>
      )}

      {deliveryPin && (
        <Marker position={[deliveryPin.lat, deliveryPin.lng]} icon={deliveryIcon}>
          <Popup>
            <span style={{ fontSize: 12, fontWeight: 600 }}>📦 Delivery point</span>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
