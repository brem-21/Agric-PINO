"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";

const FOLLOW_EVENT = "lorgric:follow-change";

interface FollowChangeDetail {
  userId: string;
  isFollowing: boolean;
  followerCount: number;
}

interface FollowButtonProps {
  userId: string;
  size?: "sm" | "md";
  className?: string;
  initialFollowing?: boolean;
  initialFollowerCount?: number;
}

export function FollowButton({ userId, size = "sm", className = "", initialFollowing, initialFollowerCount }: FollowButtonProps) {
  const { data: session } = useSession();
  const hasInitialData = initialFollowing !== undefined && initialFollowerCount !== undefined;
  const [following, setFollowing] = useState(hasInitialData ? initialFollowing : false);
  const [followerCount, setFollowerCount] = useState(hasInitialData ? initialFollowerCount : 0);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(hasInitialData);

  // Fetch initial state from server only when initial props are not provided
  useEffect(() => {
    if (hasInitialData) return;
    if (!session) return;
    fetch(`/api/follow/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setFollowing(data.isFollowing ?? false);
        setFollowerCount(data.followerCount ?? 0);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, [userId, session, hasInitialData]);

  // Sync with any other FollowButton on the page that toggles the same user
  useEffect(() => {
    function onFollowChange(e: Event) {
      const { userId: changedId, isFollowing, followerCount: count } = (
        e as CustomEvent<FollowChangeDetail>
      ).detail;
      if (changedId === userId) {
        setFollowing(isFollowing);
        setFollowerCount(count);
      }
    }
    window.addEventListener(FOLLOW_EVENT, onFollowChange);
    return () => window.removeEventListener(FOLLOW_EVENT, onFollowChange);
  }, [userId]);

  if (!session || session.user.id === userId) return null;
  if (!checked) return null;

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    const method = following ? "DELETE" : "POST";
    await fetch(`/api/follow/${userId}`, { method }).catch(() => {});

    const nextFollowing = !following;
    const nextCount = followerCount + (nextFollowing ? 1 : -1);

    setFollowing(nextFollowing);
    setFollowerCount(nextCount);
    setLoading(false);

    // Broadcast so every other FollowButton for this user syncs instantly
    window.dispatchEvent(
      new CustomEvent<FollowChangeDetail>(FOLLOW_EVENT, {
        detail: { userId, isFollowing: nextFollowing, followerCount: nextCount },
      })
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={following ? "Unfollow" : "Follow"}
      className={`inline-flex items-center gap-1 rounded-full font-semibold transition-all disabled:opacity-50 ${
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1.5"
      } ${
        following
          ? "bg-[#d3fa99] text-[#1c3a13] hover:bg-red-50 hover:text-red-600 border border-[#d3fa99]"
          : "bg-transparent text-[#1c3a13] border border-[#1c3a13] hover:bg-[#eeeee9]"
      } ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : following ? (
        <UserCheck className="h-3 w-3" />
      ) : (
        <UserPlus className="h-3 w-3" />
      )}
      {following ? "Following" : "Follow"}
      {followerCount > 0 && (
        <span className={`ml-0.5 ${following ? "text-[#1c3a13]/50" : "text-[#1c3a13]/50"}`}>
          · {followerCount}
        </span>
      )}
    </button>
  );
}
