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
  vehicleType?: string;
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

export interface MapPin {
  lat: number;
  lng: number;
  type: "pickup" | "delivery";
}

interface RiderMapInnerProps {
  riders: Rider[];
  pickupPin: MapPin | null;
  deliveryPin: MapPin | null;
  selectedRiderId: string | null;
  onSelectRider: (riderId: string) => void;
  onMapClick: (lat: number, lng: number) => void;
  fareEstimate?: FareEstimate | null;
}

const STATUS_BORDER: Record<string, string> = {
  online: "border:3px solid #22c55e",
  away: "border:3px solid #f59e0b",
  offline: "border:3px solid #ef4444",
};

// TRUCK riders get a bigger, squared-off marker (matches how a bulkier
// vehicle reads visually) rather than the small circular motorbike marker.
function createRiderIcon(vehicleType: string | undefined, status: string, selected: boolean) {
  const isTruck = vehicleType === "TRUCK";
  const border = STATUS_BORDER[status] ?? STATUS_BORDER.offline;
  const grayFilter = status === "offline" ? "filter:grayscale(80%);" : "";
  const scale = selected ? "transform:scale(1.3);" : "";
  const size = isTruck ? 40 : 36;
  const emoji = isTruck ? "🚛" : "🏍️";
  const shape = isTruck ? "border-radius:10px" : "border-radius:50%";
  return L.divIcon({
    html: `<div style="font-size:${isTruck ? 24 : 26}px;${grayFilter}${scale}display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;${shape};background:white;${border};box-shadow:0 2px 6px rgba(0,0,0,0.35);">${emoji}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
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
        const icon = createRiderIcon(rider.vehicleType, status, selected);
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
                  {rider.vehicleType === "TRUCK" ? "🚛" : "🏍️"} {rider.name}
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
