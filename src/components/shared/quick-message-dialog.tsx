"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuickMessageDialogProps {
  recipientId: string;
  recipientName: string;
  /** The listing this conversation is about, if opened from a marketplace card — attached to the message for context. Omit for a plain message. */
  listingId?: string;
  cropName?: string;
  trigger?: React.ReactNode;
  className?: string;
}

export function QuickMessageDialog({
  recipientId,
  recipientName,
  listingId,
  cropName,
  trigger,
  className,
}: QuickMessageDialogProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (open) {
      setSent(false);
      setError("");
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: recipientId, content: trimmed, listingId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to send. Try again.");
        return;
      }
      setSent(true);
      setText("");
      setTimeout(() => setOpen(false), 1600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  const initials = recipientName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className={className} onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" size="sm" title={`Message ${recipientName}`}>
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-[#fcfcf7] border border-[#eeeee9] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eeeee9] text-sm font-semibold text-[#1c3a13] flex-shrink-0">
                {initials}
              </div>
              <div>
                <DialogTitle className="text-[#1c3a13]">Message {recipientName}</DialogTitle>
                <p className="text-xs text-[#1c3a13]/40 mt-0.5">Reply in your messages portal</p>
              </div>
            </div>
            {cropName && (
              <p className="text-xs text-[#1c3a13] bg-[#eeeee9] rounded-full px-2.5 py-1 w-fit">
                🌿 About: {cropName}
              </p>
            )}
          </DialogHeader>

          {sent ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eeeee9]">
                <CheckCheck className="h-7 w-7 text-[#1c3a13]" />
              </div>
              <p className="font-medium text-[#1c3a13]">Message sent!</p>
              <p className="text-sm text-[#1c3a13]/50">{recipientName} will receive your message.</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  placeholder={`Hi ${recipientName.split(" ")[0]}, I'm interested in...`}
                  rows={4}
                  maxLength={2000}
                  className="w-full resize-none rounded-lg border border-[#eeeee9] bg-[#fcfcf7] px-4 py-3 text-sm text-[#1c3a13] placeholder-[#1c3a13]/40 focus:border-[#1c3a13] focus:bg-[#fcfcf7] focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 transition-colors"
                />
                <span className="absolute bottom-2.5 right-3 text-[10px] text-[#1c3a13]/40 select-none">
                  {text.length}/2000
                </span>
              </div>

              {error && (
                <p className="text-xs text-red-600 -mt-1">{error}</p>
              )}

              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-[#1c3a13]/40">⌘↵ to send</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="rounded-full border-[#eeeee9] text-[#1c3a13]">
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="rounded-full bg-[#1c3a13] hover:bg-[#2a5219] text-[#fcfcf7]"
                  >
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
