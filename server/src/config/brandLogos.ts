import { slugify } from "../utils/slugify.js";

// Les logos tout prêts, copiés de Simple Icons 16.36.0 (licence CC0) dans
// client/public/brands/. Les marques restent la propriété de leurs détenteurs.
// Une marque absente de cette liste reçoit un logo envoyé par le gérant, ou aucun.
const LIBRARY = new Set([
  "apple", "samsung", "google", "xiaomi", "oppo", "oneplus", "huawei", "honor", "vivo",
  "motorola", "nokia", "hp", "acer", "msi", "asus", "lenovo", "dell", "razer", "garmin",
  "fitbit", "jbl", "sony", "bose", "beats", "dji",
]);

// Les noms de gamme qui portent le logo de leur fabricant : « iPhone » dans
// Smartphones, « MacBook » dans PC portables, « Galaxy », « Pixel »…
const ALIASES: Record<string, string> = {
  iphone: "apple",
  ipad: "apple",
  macbook: "apple",
  "apple-watch": "apple",
  airpods: "apple",
  galaxy: "samsung",
  pixel: "google",
  redmi: "xiaomi",
  poco: "xiaomi",
};

// « iPhone » → « /brands/apple.svg » ; « Realme » → null.
export function findLibraryLogo(name: string): string | null {
  const slug = slugify(name);
  const file = LIBRARY.has(slug) ? slug : ALIASES[slug];
  return file ? `/brands/${file}.svg` : null;
}

// Un logo choisi dans le back-office doit venir de la bibliothèque (pas d'URL libre).
export function isLibraryLogo(url: string): boolean {
  const match = /^\/brands\/([a-z0-9-]+)\.svg$/.exec(url);
  return match !== null && LIBRARY.has(match[1]);
}
