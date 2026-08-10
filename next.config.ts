import type { NextConfig } from "next";

// This deploy box has no static public IP, so it changes on every stop/start —
// deriving the allowed origin from NEXT_PUBLIC_APP_URL (already updated per
// deploy, see .env.local) means that churn no longer requires a code change
// here too. Falls back to localhost for environments that don't set it (CI).
const appHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").host;
  } catch {
    return "localhost:3000";
  }
})();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets the dev server accept requests (HMR websocket, server actions) when
  // reached through the remote box's addresses instead of only localhost.
  allowedDevOrigins: [appHost.split(":")[0], "172.31.25.39"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://picsum.photos https://fastly.picsum.photos https://res.cloudinary.com https://images.unsplash.com https://upload.wikimedia.org",
              "font-src 'self' data:",
              "connect-src 'self' https://nominatim.openstreetmap.org https://api.paystack.co",
              "worker-src blob:",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", appHost, "172.31.25.39:3000"],
    },
    // Next's internal proxy layer buffers/clones every request body in memory
    // before it reaches route handlers; the implicit default silently stalls
    // requests larger than it can hold instead of erroring. Set explicitly,
    // comfortably above the largest upload we allow (upload.ts caps at 5MB).
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
