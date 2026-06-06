import type { MetadataRoute } from "next";
import { siteUrl } from "@/server/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/core", "/core/", "/api/admin", "/api/admin/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
