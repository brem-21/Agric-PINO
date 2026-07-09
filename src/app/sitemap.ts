import type { MetadataRoute } from "next";

const PUBLIC_ROUTES = ["", "/about", "/marketplace", "/equipment", "/find-rider"];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const now = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
  }));
}
