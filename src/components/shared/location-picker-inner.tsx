"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { useState } from "react";

const pinIcon = L.divIcon({
  html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">📍</div>',
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

interface LocationPickerInnerProps {
  onSelect: (lat: number, lng: number, label: string) => void;
  defaultLat?: number;
  defaultLng?: number;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

export default function LocationPickerInner({
  onSelect,
  defaultLat = 9.4,
  defaultLng = -0.84,
}: LocationPickerInnerProps) {
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  async function handlePick(lat: number, lng: number) {
    setPin({ lat, lng });
    const coord = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    setLabel(coord);
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const name =
        data.address?.town ??
        data.address?.city ??
        data.address?.village ??
        data.address?.county ??
        data.display_name ??
        coord;
      setLabel(name);
    } catch {
      // keep coordinate label
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200">
      <div style={{ height: 300 }}>
        <MapContainer
          center={[defaultLat, defaultLng]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          <ClickHandler onPick={handlePick} />
          {pin && <Marker position={[pin.lat, pin.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>
      <div className="flex items-center gap-3 bg-gray-50 border-t border-gray-200 p-3">
        <div className="flex-1 min-w-0">
          {pin ? (
            loading ? (
              <p className="text-sm text-gray-400 animate-pulse">Getting location name…</p>
            ) : (
              <p className="text-sm font-medium text-gray-800 truncate">{label}</p>
            )
          ) : (
            <p className="text-sm text-gray-400">Tap anywhere on the map to pin a location</p>
          )}
        </div>
        <button
          type="button"
          disabled={!pin || loading}
          onClick={() => pin && onSelect(pin.lat, pin.lng, label)}
          className="shrink-0 rounded-lg bg-green-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-40 hover:bg-green-800 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  );
}
