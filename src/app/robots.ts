import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getAppUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
