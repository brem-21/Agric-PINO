"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";

const pickupIcon = L.divIcon({
  html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">📦</div>',
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const deliveryIcon = L.divIcon({
  html: '<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">📍</div>',
  className: "",
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

interface DeliveryMapInnerProps {
  pickup: { lat: number; lng: number; label: string };
  delivery: { lat: number; lng: number; label: string };
  height?: number;
}

export default function DeliveryMapInner({ pickup, delivery, height = 260 }: DeliveryMapInnerProps) {
  const midLat = (pickup.lat + delivery.lat) / 2;
  const midLng = (pickup.lng + delivery.lng) / 2;

  return (
    <div className="overflow-hidden rounded-xl border border-[#eeeee9]" style={{ height }}>
      <MapContainer
        center={[midLat, midLng]}
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
        <Polyline positions={[[pickup.lat, pickup.lng], [delivery.lat, delivery.lng]]} pathOptions={{ color: "#1c3a13", weight: 3, dashArray: "6 8" }} />
        <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
          <Popup>Pickup: {pickup.label}</Popup>
        </Marker>
        <Marker position={[delivery.lat, delivery.lng]} icon={deliveryIcon}>
          <Popup>Delivery: {delivery.label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
