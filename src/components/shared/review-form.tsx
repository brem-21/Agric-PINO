"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  orderId: string;
  orderType?: "ORDER";
  targetId: string;
  targetName: string;
  targetRole: string;
  onSuccess?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  FARMER: "Farmer",
  BUYER: "Buyer",
  LOGISTICS: "Delivery Rider",
  STORAGE_FACILITY: "Storage Facility",
};

export function ReviewForm({ orderId, orderType = "ORDER", targetId, targetName, targetRole, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const roleLabel = ROLE_LABELS[targetRole] ?? targetRole;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Please select a rating"); return; }
    setLoading(true);
    setError("");

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, orderType, targetId, rating, comment }),
    });

    if (res.ok) {
      setDone(true);
      onSuccess?.();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to submit review");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🙏</div>
        <p className="font-semibold text-[#1c3a13]">Thank you for your review!</p>
        <p className="text-sm text-[#1c3a13]/50 mt-1">Your feedback helps build trust in Lorgric.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="text-sm text-[#1c3a13]/70 mb-2">
          How would you rate your experience with <span className="font-semibold">{targetName}</span> ({roleLabel})?
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-9 w-9 transition-colors",
                  star <= (hovered || rating)
                    ? "fill-[#d3fa99] text-[#1c3a13]"
                    : "text-[#1c3a13]/40"
                )}
              />
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm text-[#1c3a13]/50 mt-1">
            {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1c3a13] mb-1">
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          maxLength={500}
          rows={3}
          className="w-full rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-3 py-2 text-sm text-[#1c3a13] placeholder-[#1c3a13]/40 focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 resize-none"
        />
        <p className="text-xs text-[#1c3a13]/40 text-right">{comment.length}/500</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
      >
        {loading ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
