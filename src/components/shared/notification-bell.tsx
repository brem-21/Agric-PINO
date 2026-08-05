"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import Link from "next/link";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
  actor: { name: string; image: string | null } | null;
}

interface NotificationBellProps {
  colorClass?: string;
  buttonClassName?: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_ICON: Record<string, string> = {
  NEW_LISTING: "🌾",
  MESSAGE: "💬",
  ORDER_STATUS_UPDATE: "📦",
  DELIVERY_REQUESTED: "🚚",
  DELIVERY_UPDATE: "🚚",
  NEW_COMPLAINT: "🚩",
  COMPLAINT_UPDATE: "📋",
  REPEAT_OFFENDER_FLAGGED: "⚠️",
  NEW_STORAGE_BOOKING: "🏬",
  STORAGE_BOOKING_UPDATE: "🏬",
  FACILITY_APPROVED: "✅",
  FACILITY_REJECTED: "❌",
  LISTING_APPROVED: "✅",
  LISTING_REJECTED: "❌",
  ADMIN_APPLICATION: "🛡️",
  ADMIN_APPROVED: "✅",
  ADMIN_REJECTED: "❌",
  INCIDENT_TEAM_APPLICATION: "💪",
  INCIDENT_TEAM_APPROVED: "✅",
  INCIDENT_TEAM_REJECTED: "❌",
  VERIFICATION_SUBMITTED: "🪪",
  VERIFICATION_APPROVED: "✅",
  VERIFICATION_REJECTED: "❌",
  VERIFIED: "✅",
  REVIEW_REQUEST: "⭐",
  OFFER_RECEIVED: "🤝",
  OFFER_COUNTERED: "🔄",
  OFFER_ACCEPTED: "✅",
  OFFER_REJECTED: "❌",
  ORDER_DISPUTED: "🚫",
  ORDER_DISPUTE_RESOLVED: "⚖️",
};

export function NotificationBell({
  colorClass = "text-[#fcfcf7]/70",
  buttonClassName = "hover:bg-white/10",
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function poll() {
      fetch("/api/notifications?count=1")
        .then((r) => r.json())
        .then((d) => setUnread(d.unread ?? 0))
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function openPanel() {
    if (open) { setOpen(false); setPanelPos(null); return; }
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setOpen(true);
    setLoading(true);
    const data = await fetch("/api/notifications").then((r) => r.json()).catch(() => ({}));
    setNotifs(data.notifications ?? []);
    setLoading(false);
  }

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    setUnread(0);
  }

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPanel}
        className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-colors ${buttonClassName} ${colorClass}`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-[#d3fa99] text-[#1c3a13] text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && panelPos && (
        <div
          className="fixed w-80 bg-[#fcfcf7] rounded-2xl border border-[#eeeee9] z-[9999] overflow-hidden"
          style={{ top: panelPos.top, right: panelPos.right }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#eeeee9]">
            <h3 className="font-medium text-[#1c3a13] text-sm tracking-tight">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-[#1c3a13] hover:text-[#1c3a13]/70 flex items-center gap-1">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#1c3a13]/40 hover:text-[#1c3a13]/70">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#eeeee9]">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-[#1c3a13]/40" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-[#1c3a13]/40" />
                <p className="text-sm text-[#1c3a13]/50">No notifications yet</p>
              </div>
            ) : (
              notifs.map((n) => {
                const inner = (
                  <div
                    onClick={() => { if (!n.read) markOne(n.id); }}
                    className={`flex gap-3 px-4 py-3 hover:bg-[#eeeee9] transition-colors cursor-pointer ${
                      !n.read ? "bg-[#eeeee9]/40" : ""
                    }`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#eeeee9] flex items-center justify-center text-base">
                      {TYPE_ICON[n.type] ?? "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? "font-semibold text-[#1c3a13]" : "text-[#1c3a13]/70"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-[#1c3a13]/50 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-xs text-[#1c3a13]/40 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.read && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-[#d3fa99] mt-1.5" />
                    )}
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
