// L'adresse publique du site et son indexation, lues par le layout (metadata), robots.ts et
// sitemap.ts. Mettre le site en ligne pour de vrai : SITE_URL vers le vrai domaine et
// SITE_INDEXABLE=true sur Vercel, sans toucher au code (retirer aussi le bandeau de démo).
export const SITE_URL = (process.env.SITE_URL ?? "https://dropzone-eight.vercel.app").replace(/\/$/, "");

// En démo, le site n'est pas indexé : `noindex` dans les pages et tout refusé dans robots.txt.
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";
