"use client";

import { getOnlineStatus, getInitials, type OnlineStatus } from "@/lib/utils";

const STATUS_COLORS: Record<OnlineStatus, { dot: string; ring: string }> = {
  online: { dot: "bg-[#d3fa99]", ring: "ring-[#d3fa99]" },
  away: { dot: "bg-amber-400", ring: "ring-amber-400" },
  offline: { dot: "bg-red-500", ring: "ring-red-500" },
};

const SIZE_MAP = {
  sm: { dot: "h-2 w-2", avatar: "h-7 w-7", text: "text-xs" },
  md: { dot: "h-2.5 w-2.5", avatar: "h-9 w-9", text: "text-sm" },
  lg: { dot: "h-3 w-3", avatar: "h-11 w-11", text: "text-base" },
};

interface OnlineIndicatorProps {
  lastSeen?: string | Date | null;
  ownStatus?: boolean;
  size?: "sm" | "md" | "lg";
}

export function OnlineIndicator({ lastSeen, ownStatus = false, size = "md" }: OnlineIndicatorProps) {
  const status: OnlineStatus = ownStatus ? "online" : getOnlineStatus(lastSeen);
  const { dot } = STATUS_COLORS[status];
  const { dot: dotSize } = SIZE_MAP[size];

  return (
    <span
      className={`block rounded-full ${dotSize} ${dot} ring-2 ring-[#fcfcf7]`}
      aria-label={status}
    />
  );
}

interface AvatarWithStatusProps {
  name: string | null | undefined;
  image?: string | null;
  lastSeen?: string | Date | null;
  ownStatus?: boolean;
  size?: "sm" | "md" | "lg";
  bgColor?: string;
}

export function AvatarWithStatus({
  name,
  image,
  lastSeen,
  ownStatus = false,
  size = "md",
  bgColor,
}: AvatarWithStatusProps) {
  const status: OnlineStatus = ownStatus ? "online" : getOnlineStatus(lastSeen);
  const { ring, dot } = STATUS_COLORS[status];
  const { avatar, dot: dotSize, text } = SIZE_MAP[size];
  const bg = bgColor ?? "bg-[#1c3a13]/50";

  return (
    <span className="relative inline-flex flex-shrink-0">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? ""}
          className={`${avatar} rounded-full object-cover ring-2 ${ring}`}
        />
      ) : (
        <span
          className={`flex ${avatar} items-center justify-center rounded-full ${bg} ${text} font-semibold text-[#fcfcf7] ring-2 ${ring}`}
        >
          {getInitials(name)}
        </span>
      )}
      <span
        className={`absolute -bottom-0.5 -right-0.5 block rounded-full ${dotSize} ${dot} ring-2 ring-[#fcfcf7]`}
      />
    </span>
  );
}
