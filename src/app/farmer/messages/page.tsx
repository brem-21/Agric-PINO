"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { formatDate, getInitials } from "@/lib/utils";
import Link from "next/link";
import { Send, MessageCircle, Lock, Edit, Search, Loader2, RefreshCw, Radio, ArrowDown, Bell, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MSG_POLL_MS = 5_000;
const CONV_POLL_MS = 15_000;

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: { name: string };
  listing?: { id: string; cropType: string } | null;
}

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  lastMessageFromMe: boolean;
  unread: number;
}

interface SearchUser {
  id: string;
  name: string;
  image: string | null;
  role: string;
  farmerProfile: { farmName: string } | null;
  storageFacilityProfile: { name: string } | null;
  buyerProfile: { businessName: string | null } | null;
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-[#eeeee9] text-[#1c3a13]">
      {role.charAt(0) + role.slice(1).toLowerCase()}
    </span>
  );
}

function subLabel(u: SearchUser): string {
  if (u.farmerProfile?.farmName) return u.farmerProfile.farmName;
  if (u.storageFacilityProfile?.name) return u.storageFacilityProfile.name;
  if (u.buyerProfile?.businessName) return u.buyerProfile.businessName;
  return "";
}

function isNearBottom(el: HTMLElement, threshold = 120) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

export default function MessagesPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingContact, setPendingContact] = useState<{ id: string; name: string } | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [newMsgBanner, setNewMsgBanner] = useState<string | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef<string | null>(null);
  const activeConvRef = useRef<string | null>(null);
  activeConvRef.current = activeConv;

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch("/api/messages");
      const data = await r.json();
      const convs: Conversation[] = data.conversations ?? [];
      setConversations(convs);
      setPendingContact((prev) => {
        if (prev && convs.find((c) => c.userId === prev.id)) return null;
        return prev;
      });
    } catch { /* network blip */ }
  }, []);

  const fetchMessages = useCallback(async (convId: string, isManual = false) => {
    try {
      const r = await fetch(`/api/messages?with=${convId}`);
      const data = await r.json();
      // The user may have switched conversations while this request was in flight —
      // discard the response so it never renders under the wrong thread.
      if (convId !== activeConvRef.current) return;
      const incoming: Message[] = data.messages ?? [];

      setMessages((prev) => {
        const prevIds = new Set(prev.map((m) => m.id));
        const fresh = incoming.filter(
          (m) => !prevIds.has(m.id) && m.senderId !== session?.user.id && !m.id.startsWith("temp-")
        );

        if (fresh.length > 0) {
          const senderName = fresh[0].sender.name;
          const scrollEl = chatScrollRef.current;
          if (scrollEl && isNearBottom(scrollEl)) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
          } else {
            setShowScrollBtn(true);
            setNewMsgBanner(`New message from ${senderName}`);
            setTimeout(() => setNewMsgBanner(null), 4000);
          }

          if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`Message from ${senderName}`, {
              body: fresh[fresh.length - 1].content,
              icon: "/favicon.ico",
            });
          }
        }

        const realIds = new Set(incoming.map((m) => m.id));
        const temps = prev.filter((m) => m.id.startsWith("temp-") && !realIds.has(m.id));
        return [...incoming, ...temps];
      });

      if (isManual) {
        lastMsgIdRef.current = incoming[incoming.length - 1]?.id ?? null;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      } else if (!lastMsgIdRef.current) {
        lastMsgIdRef.current = incoming[incoming.length - 1]?.id ?? null;
      }

      fetchConversations();
    } catch { /* network blip */ }
  }, [session?.user.id, fetchConversations]);

  useEffect(() => {
    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(fetchConversations, CONV_POLL_MS);
    return () => clearInterval(id);
  }, [fetchConversations]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const withId = params.get("with");
    if (!withId) return;
    setActiveConv(withId);
    fetch(`/api/users/search?id=${withId}`)
      .then((r) => r.json())
      .then((d) => { if (d.user) setPendingContact({ id: d.user.id, name: d.user.name }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchQuery.length < 1) { setSearchResults([]); return; }
    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => r.json())
        .then((d) => setSearchResults(d.users ?? []))
        .catch(() => {})
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!activeConv) return;
    lastMsgIdRef.current = null;
    setShowScrollBtn(false);
    setNewMsgBanner(null);
    // Clear immediately so a leftover message (or unresolved optimistic temp
    // message) from the previous conversation can never flash under this one.
    setMessages([]);
    fetchMessages(activeConv, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConv]);

  useEffect(() => {
    if (!activeConv) return;
    const id = setInterval(() => {
      if (activeConvRef.current) fetchMessages(activeConvRef.current);
    }, MSG_POLL_MS);
    return () => clearInterval(id);
  }, [activeConv, fetchMessages]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const handler = () => setShowScrollBtn(!isNearBottom(el));
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [activeConv]);

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollBtn(false);
    setNewMsgBanner(null);
  }

  function startConversation(user: SearchUser) {
    setActiveConv(user.id);
    setPendingContact({ id: user.id, name: user.name });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !activeConv || loading) return;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      content: trimmed,
      senderId: session?.user.id ?? "",
      createdAt: new Date().toISOString(),
      sender: { name: session?.user.name ?? "" },
      listing: null,
    };
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage("");
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeConv, content: trimmed }),
      });
      if (!res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setNewMessage(trimmed);
        return;
      }
      await fetchMessages(activeConv, true);
    } finally {
      setLoading(false);
    }
  };

  const activeName =
    pendingContact?.id === activeConv
      ? pendingContact.name
      : conversations.find((c) => c.userId === activeConv)?.name ?? "Chat";

  return (
    <div className="flex h-[calc(100vh-8rem)] border border-[#eeeee9] rounded-2xl overflow-hidden bg-[#fcfcf7]">
      {/* Sidebar */}
      <div className="w-72 border-r border-[#eeeee9] flex flex-col bg-[#eeeee9]">
        <div className="p-4 border-b border-[#eeeee9] bg-[#fcfcf7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-medium text-[#1c3a13]">Messages</h2>
            <span className="flex items-center gap-1 text-[10px] text-[#1c3a13] font-medium">
              <Radio className="h-2.5 w-2.5 animate-pulse" />
              Live
            </span>
          </div>
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) setTimeout(() => searchRef.current?.focus(), 50);
            }}
            className="p-1.5 rounded-full text-[#1c3a13]/40 hover:text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
            title="New message"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>

        {showSearch && (
          <div className="border-b border-[#eeeee9] p-3 bg-[#fcfcf7]">
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#1c3a13]/40" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or phone…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#eeeee9] rounded-lg bg-[#fcfcf7] text-[#1c3a13] placeholder-[#1c3a13]/40 focus:outline-none focus:ring-2 focus:ring-[#1c3a13]/20 focus:border-[#1c3a13]"
              />
              {searchLoading && (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[#1c3a13]/40" />
              )}
            </div>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u)}
                  className="w-full text-left flex items-center gap-2.5 px-2 py-2 rounded-xl bg-[#fcfcf7] hover:bg-[#eeeee9] transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1c3a13] text-[#fcfcf7] flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {getInitials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-[#1c3a13] truncate">{u.name}</span>
                      <RoleBadge role={u.role} />
                    </div>
                    {subLabel(u) && <p className="text-xs text-[#1c3a13]/50 truncate">{subLabel(u)}</p>}
                  </div>
                </button>
              ))}
              {searchQuery.length >= 1 && !searchLoading && searchResults.length === 0 && (
                <p className="text-xs text-[#1c3a13]/40 text-center py-3">No users found</p>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pendingContact && !conversations.find((c) => c.userId === pendingContact.id) && (
            <button
              onClick={() => setActiveConv(pendingContact.id)}
              className={`w-full text-left p-3 rounded-xl transition-colors ${
                activeConv === pendingContact.id
                  ? "bg-[#1c3a13] text-[#fcfcf7]"
                  : "bg-[#fcfcf7] hover:bg-[#eeeee9]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                  activeConv === pendingContact.id ? "bg-[#fcfcf7]/20 text-[#fcfcf7]" : "bg-[#1c3a13] text-[#fcfcf7]"
                }`}>
                  {getInitials(pendingContact.name)}
                </div>
                <div className="min-w-0">
                  <div className={`font-medium text-sm truncate ${activeConv === pendingContact.id ? "text-[#fcfcf7]" : "text-[#1c3a13]"}`}>
                    {pendingContact.name}
                  </div>
                  <div className={`text-xs ${activeConv === pendingContact.id ? "text-[#fcfcf7]/60" : "text-[#1c3a13]/50"}`}>
                    New conversation
                  </div>
                </div>
              </div>
            </button>
          )}

          {conversations.length === 0 && !pendingContact ? (
            <div className="p-6 text-center text-[#1c3a13]/50 text-sm">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-[#1c3a13]/20" />
              No conversations yet
              <p className="mt-1 text-xs text-[#1c3a13]/40">Tap the pencil icon to start one</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setActiveConv(conv.userId)}
                className={`w-full text-left p-3 rounded-xl transition-colors ${
                  activeConv === conv.userId
                    ? "bg-[#1c3a13] text-[#fcfcf7]"
                    : "bg-[#fcfcf7] hover:bg-[#eeeee9]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 ${
                    activeConv === conv.userId ? "bg-[#fcfcf7]/20 text-[#fcfcf7]" : "bg-[#1c3a13] text-[#fcfcf7]"
                  }`}>
                    {getInitials(conv.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium text-sm truncate ${activeConv === conv.userId ? "text-[#fcfcf7]" : "text-[#1c3a13]"}`}>
                      {conv.name}
                    </div>
                    <div className={`text-xs truncate ${activeConv === conv.userId ? "text-[#fcfcf7]/60" : "text-[#1c3a13]/50"}`}>
                      {conv.lastMessageFromMe && "(You) "}{conv.lastMessage}
                    </div>
                  </div>
                  {conv.unread > 0 && (
                    <span className={`ml-auto text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 flex-shrink-0 font-bold ${
                      activeConv === conv.userId ? "bg-[#d3fa99] text-[#1c3a13]" : "bg-[#1c3a13] text-[#fcfcf7]"
                    }`}>
                      {conv.unread}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fcfcf7]">
        {activeConv ? (
          <>
            <div className="px-4 py-3 border-b border-[#eeeee9] flex items-center justify-between">
              <div>
                <p className="font-medium text-[#1c3a13]">{activeName}</p>
                <p className="flex items-center gap-1 text-xs text-[#1c3a13]/40 mt-0.5">
                  <Lock className="h-3 w-3" />
                  End-to-end encrypted
                </p>
              </div>
              <button
                onClick={() => activeConv && fetchMessages(activeConv, true)}
                className="p-1.5 rounded-full text-[#1c3a13]/40 hover:text-[#1c3a13] hover:bg-[#eeeee9] transition-colors"
                title="Refresh messages"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {newMsgBanner && (
              <button
                onClick={scrollToBottom}
                className="flex items-center justify-center gap-2 bg-[#d3fa99] text-[#1c3a13] text-xs font-medium py-1.5 px-3 rounded-full mx-4 mt-2 hover:bg-[#c8f57a] transition-colors"
              >
                <Bell className="h-3.5 w-3.5" />
                {newMsgBanner} — tap to scroll down
              </button>
            )}

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-[#1c3a13]/40">
                  <MessageCircle className="h-10 w-10 mb-2 text-[#1c3a13]/20" />
                  <p className="text-sm">Say hello to {activeName}!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === session?.user.id || msg.id.startsWith("temp-");
                const isTemp = msg.id.startsWith("temp-");
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm transition-opacity ${
                        isMe
                          ? `bg-[#1c3a13] text-[#fcfcf7] rounded-br-sm ${isTemp ? "opacity-70" : ""}`
                          : "bg-[#eeeee9] text-[#1c3a13] rounded-bl-sm"
                      }`}
                    >
                      {msg.listing && (
                        <Link
                          href={`/marketplace/${msg.listing.id}`}
                          className={`mb-1.5 flex items-center gap-1 w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
                            isMe ? "bg-[#fcfcf7]/20 text-[#fcfcf7]" : "bg-[#fcfcf7] text-[#1c3a13]"
                          }`}
                        >
                          <Leaf className="h-3 w-3" />
                          About: {msg.listing.cropType}
                        </Link>
                      )}
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? "text-[#fcfcf7]/60" : "text-[#1c3a13]/40"}`}>
                        {isTemp ? "Sending…" : formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {showScrollBtn && (
              <button
                onClick={scrollToBottom}
                className="flex items-center gap-1.5 rounded-full bg-[#1c3a13] text-[#fcfcf7] text-xs font-medium px-3 py-1.5 hover:bg-[#2a5219] transition-colors"
                style={{ position: "absolute", bottom: "5rem", right: "1.5rem" }}
              >
                <ArrowDown className="h-3.5 w-3.5" />
                Scroll down
              </button>
            )}

            <div className="border-t border-[#eeeee9]">
              <div className="p-3 flex gap-2 items-center">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message…"
                  className="flex-1 bg-[#fcfcf7] border border-[#eeeee9] rounded-full text-[#1c3a13] placeholder-[#1c3a13]/40 focus:border-[#1c3a13] focus:ring-[#1c3a13]/20"
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !newMessage.trim()}
                  className="rounded-full bg-[#1c3a13] text-[#fcfcf7] hover:bg-[#2a5219]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-[#1c3a13]/40 px-4 pb-2 text-center">
                The recipient is notified in-app and by SMS
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#1c3a13]/40">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-3 text-[#1c3a13]/20" />
              <p>Select a conversation to start messaging</p>
              <p className="text-xs mt-1">or tap <Edit className="h-3 w-3 inline" /> to find someone</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
