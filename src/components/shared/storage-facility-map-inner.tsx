"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import { useMemo } from "react";

export interface StorageFacility {
  id: string;
  name: string;
  description: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  storageTypes: string[];
  capacityTonnes: number | null;
  acceptedCategories: string[];
  equipment: string[];
  operatingHours: string | null;
  rating: number;
  totalRatings: number;
}

export interface RouteOption {
  coordinates: [number, number][];
  distanceKm: number;
  durationMin: number;
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
  /** The farmer's own location, shown as a distinct pin from facility markers. */
  originPin?: { lat: number; lng: number } | null;
  /** Alternate routes from originPin to the selected facility. */
  routes?: RouteOption[];
  selectedRouteIndex?: number;
  /** Toggles the street (CARTO) layer for a free satellite imagery layer (Esri World Imagery). */
  satellite?: boolean;
}

const originIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4)"></div>',
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const ROUTE_COLORS = ["#1c3a13", "#94a3b8", "#94a3b8"];

function createFacilityIcon(hasColdChain: boolean, selected: boolean) {
  // House icon for every facility (distinct from the rider motorbike/truck
  // markers) — cold-chain vs. hermetic-dry stays visible via border color.
  const emoji = "🏠";
  const border = selected
    ? "border:3px solid #1c3a13"
    : hasColdChain
    ? "border:3px solid #3b82f6"
    : "border:3px solid #16a34a";
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
  originPin = null,
  routes = [],
  selectedRouteIndex = 0,
  satellite = false,
}: StorageFacilityMapInnerProps) {
  const withLocation = useMemo(
    () => facilities.filter((f) => f.latitude != null && f.longitude != null),
    [facilities]
  );

  return (
    <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }} className="z-0">
      {satellite ? (
        <TileLayer
          key="satellite"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />
      ) : (
        <TileLayer
          key="street"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
      )}

      {routes.map((route, i) => (
        <Polyline
          key={i}
          positions={route.coordinates}
          pathOptions={{
            color: ROUTE_COLORS[i] ?? "#94a3b8",
            weight: i === selectedRouteIndex ? 5 : 3,
            opacity: i === selectedRouteIndex ? 0.9 : 0.5,
            dashArray: i === selectedRouteIndex ? undefined : "6 6",
          }}
        />
      ))}

      {originPin && (
        <Marker position={[originPin.lat, originPin.lng]} icon={originIcon}>
          <Popup>
            <span style={{ fontSize: 12, fontWeight: 600 }}>📍 Your location</span>
          </Popup>
        </Marker>
      )}

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
                {f.equipment.length > 0 && (
                  <p style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>
                    Equipment: {f.equipment.map((e) => e.replace(/_/g, " ").toLowerCase()).join(", ")}
                  </p>
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
