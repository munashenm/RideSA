import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  const routes = [
    "",
    "/search",
    "/search/buses",
    "/search/taxis",
    "/register",
    "/login",
    "/driver/apply",
  ];

  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));
}
