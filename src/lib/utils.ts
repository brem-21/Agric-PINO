import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-GH", {
    dateStyle: "medium",
  }).format(new Date(date));
}

export function getInitials(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  return (
    name
      .trim()
      .split(" ")
      .map((n) => n[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

export const NORTHERN_GHANA_REGIONS = [
  "Northern Region",
  "North East Region",
  "Savannah Region",
  "Upper East Region",
  "Upper West Region",
];

export const NORTHERN_GHANA_DISTRICTS = {
  "Northern Region": [
    "Tamale Metro",
    "Sagnarigu",
    "Tolon",
    "Kumbungu",
    "Nanton",
    "Savelugu",
    "Karaga",
    "Gushegu",
    "Yendi",
    "Mion",
    "Zabzugu",
    "Tatale-Sanguli",
  ],
  "Upper East Region": [
    "Bolgatanga Metro",
    "Bawku West",
    "Bawku Municipal",
    "Builsa North",
    "Builsa South",
    "Kasena-Nankana East",
    "Kasena-Nankana West",
    "Talensi",
    "Nabdam",
  ],
  "Upper West Region": [
    "Wa Municipal",
    "Wa West",
    "Wa East",
    "Nandom",
    "Lawra",
    "Jirapa",
    "Lambussie-Karni",
    "Sissala East",
    "Sissala West",
    "Daffiama-Bussie-Issa",
  ],
};

export const PRODUCE_CATEGORIES = [
  { value: "VEGETABLES", label: "Vegetables" },
  { value: "GRAINS", label: "Grains & Cereals" },
  { value: "TUBERS", label: "Tubers & Roots" },
  { value: "FRUITS", label: "Fruits" },
  { value: "LEGUMES", label: "Legumes" },
  { value: "LIVESTOCK", label: "Livestock" },
];

export const COMMON_CROPS = [
  "Tomatoes",
  "Peppers",
  "Okra",
  "Garden Eggs",
  "Leafy Greens",
  "Onions",
  "Yams",
  "Rice",
  "Millet",
  "Sorghum",
  "Maize",
  "Groundnuts",
  "Cowpea",
  "Soybean",
  "Shea Nuts",
  "Cattle",
  "Sheep",
  "Goats",
];

export const UNITS = ["kg", "bags", "crates", "bundles", "pieces", "tonnes", "litres"];

// Haversine formula — returns distance in km between two lat/lng points
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function formatDistance(km: number): string {
  if (km < 1) return "< 1 km";
  if (km > 500) return "> 500 km";
  return `${km} km`;
}

export type OnlineStatus = "online" | "away" | "offline";

// Normalizes IPv4-mapped IPv6 (::ffff:1.2.3.4) and loopback addresses for display.
export function formatIp(ip: string | null | undefined): string {
  if (!ip || ip === "unknown") return "—";
  const addr = ip.trim();
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (mapped) return mapped[1];
  if (addr === "::1") return "127.0.0.1 (localhost)";
  return addr;
}

export function getOnlineStatus(lastSeen: Date | string | null | undefined): OnlineStatus {
  if (!lastSeen) return "offline";
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  if (diffMs < 2 * 60 * 1000) return "online";
  if (diffMs < 5 * 60 * 1000) return "away";
  return "offline";
}

const FARE_BASE = 5;
const FARE_PER_KM = 1.8;
const FARE_PER_KG = 0.5;
const FARE_MIN = 8;
const RIDER_SPEED_KMH = 30;

export interface FareEstimate {
  total: number;
  baseFare: number;
  distanceCost: number;
  weightCost: number;
  etaMinutes: number;
}

export function calculateFare(distanceKm: number, weightKg: number): FareEstimate {
  const distanceCost = distanceKm * FARE_PER_KM;
  const weightCost = weightKg * FARE_PER_KG;
  const raw = FARE_BASE + distanceCost + weightCost;
  const total = Math.max(FARE_MIN, Math.round(raw * 100) / 100);
  const etaMinutes = Math.max(5, Math.round((distanceKm / RIDER_SPEED_KMH) * 60));
  return {
    total,
    baseFare: FARE_BASE,
    distanceCost: Math.round(distanceCost * 100) / 100,
    weightCost: Math.round(weightCost * 100) / 100,
    etaMinutes,
  };
}
