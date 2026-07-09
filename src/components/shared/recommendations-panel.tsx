"use client";

import { useState } from "react";
import { Sparkles, MapPin, Send, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDistance } from "@/lib/utils";

interface RecommendedListing {
  cropType: string;
  farmerName: string;
  location: string;
  pricePerUnit: number;
  unit: string;
  quantity: number;
  distanceKm?: number;
}

interface RecommendationResult {
  message: string;
  smsSent: boolean;
  listings: RecommendedListing[];
}

export function RecommendationsPanel({ buyerPhone }: { buyerPhone?: string }) {
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "ready">("idle");

  async function getRecommendations(sendSMS: boolean) {
    setLoading(true);
    setError("");
    setLocationStatus("locating");

    try {
      let lat: number | undefined;
      let lon: number | undefined;

      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          setLocationStatus("ready");
        } catch {
          setLocationStatus("idle");
        }
      }

      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, sendSMS }),
      });

      if (!res.ok) throw new Error("Failed to get recommendations");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Could not generate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1c3a13] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#fcfcf7]" />
          </div>
          <div>
            <CardTitle className="text-base text-[#1c3a13] font-medium tracking-tight">AI Produce Recommendations</CardTitle>
            <p className="text-xs text-[#1c3a13]/50 mt-0.5">Personalized for your buying history · powered by AI</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!result ? (
          <div className="space-y-3">
            <p className="text-sm text-[#1c3a13]/70">
              Get AI-powered produce recommendations based on your purchase history and nearby farmers.
              {locationStatus === "ready" && (
                <span className="text-[#1c3a13] font-medium"> Location detected ✓</span>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => getRecommendations(false)}
                disabled={loading}
                variant="outline"
                className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9] flex-1"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analysing...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Get Recommendations</>
                )}
              </Button>

              {buyerPhone && (
                <Button
                  onClick={() => getRecommendations(true)}
                  disabled={loading}
                  className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7] flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Send to Phone ({buyerPhone.slice(-4)})
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* AI message */}
            <div className="bg-[#fcfcf7] rounded-xl p-3 border border-[#eeeee9]">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-[#1c3a13] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#1c3a13]">{result.message}</p>
              </div>
              {result.smsSent && (
                <p className="text-xs text-[#1c3a13] mt-2 flex items-center gap-1">
                  <Send className="h-3 w-3" /> SMS sent to {buyerPhone}
                </p>
              )}
            </div>

            {/* Listing cards */}
            {result.listings.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {result.listings.map((l, i) => (
                  <div key={i} className="bg-[#eeeee9] rounded-xl p-2.5 border border-[#eeeee9] text-xs">
                    <p className="font-semibold text-[#1c3a13]">{l.cropType}</p>
                    <p className="text-[#1c3a13] font-bold">{formatCurrency(l.pricePerUnit)}/{l.unit}</p>
                    <p className="text-[#1c3a13]/50 truncate">{l.farmerName}</p>
                    {l.distanceKm !== undefined && (
                      <div className="flex items-center gap-1 text-[#1c3a13]/40 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {formatDistance(l.distanceKm)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResult(null)}
              className="rounded-full text-[#1c3a13]/70 hover:text-[#1c3a13] hover:bg-[#eeeee9] w-full"
            >
              Refresh Recommendations
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}
