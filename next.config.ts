import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets the dev server accept requests (HMR websocket, server actions) when
  // reached through the remote box's addresses instead of only localhost.
  allowedDevOrigins: ["3.252.95.86", "172.31.25.39"],
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
      allowedOrigins: ["localhost:3000", "3.252.95.86:3000", "172.31.25.39:3000"],
    },
    // Next's internal proxy layer buffers/clones every request body in memory
    // before it reaches route handlers; the implicit default silently stalls
    // requests larger than it can hold instead of erroring. Set explicitly,
    // comfortably above the largest upload we allow (upload.ts caps at 5MB).
    proxyClientMaxBodySize: "20mb",
  },
};

export default nextConfig;
