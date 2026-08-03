"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useMemo } from "react";

export interface StorageFacility {
  id: string;
  name: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  storageTypes: string[];
  capacityTonnes: number | null;
  acceptedCategories: string[];
  operatingHours: string | null;
  rating: number;
  totalRatings: number;
}

const STORAGE_TYPE_LABEL: Record<string, string> = {
  COLD_CHAIN: "Cold Chain",
  HERMETIC_DRY: "Hermetic/Dry",
};

interface StorageFacilityMapInnerProps {
  facilities: StorageFacility[];
  selectedFacilityId: string | null;
  onSelectFacility: (facilityId: string) => void;
  /** Default center — Bolgatanga, Upper East Region (Lorgric's flagship corridor). */
  center?: [number, number];
  zoom?: number;
}

function createFacilityIcon(hasColdChain: boolean, selected: boolean) {
  const emoji = hasColdChain ? "🧊" : "🏬";
  const border = selected ? "border:3px solid #1c3a13" : "border:3px solid #16a34a";
  const scale = selected ? "transform:scale(1.3);" : "";
  return L.divIcon({
    html: `<div style="font-size:22px;${scale}display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:10px;background:white;${border};box-shadow:0 2px 6px rgba(0,0,0,0.35);">${emoji}</div>`,
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -22],
  });
}

export default function StorageFacilityMapInner({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  center = [10.7854, -0.8513],
  zoom = 9,
}: StorageFacilityMapInnerProps) {
  const withLocation = useMemo(
    () => facilities.filter((f) => f.latitude != null && f.longitude != null),
    [facilities]
  );

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} className="z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={19}
      />

      {withLocation.map((f) => {
        const selected = f.id === selectedFacilityId;
        const icon = createFacilityIcon(f.storageTypes.includes("COLD_CHAIN"), selected);

        return (
          <Marker
            key={f.id}
            position={[f.latitude!, f.longitude!]}
            icon={icon}
            eventHandlers={{
              click: () => onSelectFacility(f.id),
              mouseover: (e) => { e.target.openPopup(); },
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <p style={{ fontWeight: 700, marginBottom: 2 }}>{f.name}</p>
                <p style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>{f.location}</p>
                <p style={{ fontSize: 12, marginBottom: 2 }}>
                  {f.storageTypes.map((t) => STORAGE_TYPE_LABEL[t] ?? t).join(" · ")}
                </p>
                {f.capacityTonnes && (
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>Capacity: ~{f.capacityTonnes}t</p>
                )}
                {f.operatingHours && (
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{f.operatingHours}</p>
                )}
                <p style={{ fontSize: 12, marginBottom: 6 }}>
                  ⭐ {f.rating.toFixed(1)} ({f.totalRatings})
                </p>
                <button
                  onClick={() => onSelectFacility(f.id)}
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
                  {selected ? "✓ Selected" : "Select Facility"}
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
