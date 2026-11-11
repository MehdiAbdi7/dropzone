import type { MetadataRoute } from "next";
import { SITE_INDEXABLE, SITE_URL } from "@/config/site";

// robots.txt. En démo : rien à indexer. En ligne : tout sauf les pages privées.
export default function robots(): MetadataRoute.Robots {
  if (!SITE_INDEXABLE) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/compte", "/connexion", "/inscription", "/panier", "/commande"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
