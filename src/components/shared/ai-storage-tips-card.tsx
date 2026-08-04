"use client";

import { useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Tip {
  content: string;
  generatedAt: string;
}

export function AiStorageTipsCard() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchTip = useCallback(async () => {
    const res = await fetch("/api/storage/ai-tips");
    if (res.ok) setTip(await res.json());
  }, []);

  useEffect(() => {
    fetchTip().finally(() => setLoading(false));
  }, [fetchTip]);

  async function regenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/storage/ai-tips", { method: "POST" });
      if (res.ok) setTip(await res.json());
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#eeeee9]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d3fa99]">
            <Sparkles className="h-4 w-4 text-[#1c3a13]" />
          </div>
          <h2 className="font-medium text-[#1c3a13]">AI Storage Tips</h2>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={regenerating || loading}
          onClick={regenerate}
          className="rounded-full border-[#eeeee9] text-[#1c3a13] hover:bg-[#eeeee9]"
        >
          {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
          Regenerate
        </Button>
      </div>
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-[#1c3a13]/40" /></div>
        ) : tip ? (
          <>
            <p className="text-sm text-[#1c3a13] whitespace-pre-wrap">{tip.content}</p>
            <p className="text-xs text-[#1c3a13]/40 mt-3">Generated {formatDate(tip.generatedAt)}</p>
          </>
        ) : (
          <p className="text-sm text-[#1c3a13]/50">Couldn&apos;t load storage tips right now.</p>
        )}
      </div>
    </div>
  );
}
