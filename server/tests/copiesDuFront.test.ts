import { describe, expect, it } from "vitest";
import { findLibraryLogo, isLibraryLogo } from "../src/config/brandLogos.js";
import { WILAYAS } from "../src/config/wilayas.js";
import { defaultWarrantyMonths } from "../src/modules/products/warranty.js";
import {
  findLibraryLogo as frontFindLibraryLogo,
  isLibraryLogo as frontIsLibraryLogo,
} from "../../client/src/config/brandLogos.js";
import { defaultWarrantyMonths as frontDefaultWarrantyMonths } from "../../client/src/config/warranty.js";
import { WILAYAS as FRONT_WILAYAS } from "../../client/src/config/wilayas.js";
import {
  addDays as frontAddDays,
  algiersDate as frontAlgiersDate,
  pickupDays as frontPickupDays,
  pickupSlots as frontPickupSlots,
} from "../../client/src/lib/algiersTime.js";
import { addDays, algiersDate, pickupDays, pickupSlots } from "../src/utils/algiersTime.js";

// Trois règles existent en deux exemplaires, un dans client/ et un dans server/ : les deux
// dossiers se déploient chacun de leur côté (Vercel et Render), donc un paquet partagé
// compliquerait la mise en ligne. Le prix de cette simplicité : ces tests. Ils échouent si
// une copie change sans l'autre, au lieu de laisser le front et l'API se contredire.
describe("Les règles écrites des deux côtés (client/ et server/) restent identiques", () => {
  it("les 58 wilayas", () => {
    expect(FRONT_WILAYAS).toEqual(WILAYAS);
  });

  it("la garantie proposée par défaut, pour chaque sorte et chaque état", () => {
    const kinds = ["phone", "tablet", "laptop", "watch", "accessory", "audiovisual"] as const;
    for (const kind of kinds) {
      for (const condition of ["new", "refurbished"] as const) {
        expect(frontDefaultWarrantyMonths(kind, condition), `${kind} ${condition}`).toBe(
          defaultWarrantyMonths(kind, condition),
        );
      }
    }
  });

  it("les logos de la bibliothèque, pour des marques connues, des gammes et des inconnues", () => {
    const names = [
      "Apple", "Samsung", "  HP ", "iPhone", "Apple Watch", "Galaxy", "Dell", "Lenovo", "Asus", "ASUS",
      "Realme", "GoPro", "Xiaomi", "", "Marque Inconnue",
    ];
    for (const name of names) {
      expect(frontFindLibraryLogo(name), `findLibraryLogo(${JSON.stringify(name)})`).toBe(findLibraryLogo(name));
    }
    for (const url of ["/brands/apple.svg", "/brands/dji.svg", "/brands/realme.svg", "https://x/y.svg", "/brands/../x.svg"]) {
      expect(frontIsLibraryLogo(url), `isLibraryLogo(${url})`).toBe(isLibraryLogo(url));
    }
  });

  // Les créneaux de retrait (14/11) : le formulaire ne doit proposer que ce que l'API accepte.
  it("les créneaux de retrait et l'heure d'Alger", () => {
    const hourSets = [
      { openingTime: "09:00", closingTime: "20:00", closedDays: [] },
      { openingTime: "10:30", closingTime: "18:00", closedDays: [5] },
    ];
    const moments = ["2026-11-14T08:00", "2026-11-14T18:40", "2026-11-14T23:59", "2026-11-19T10:00"].map(
      (algiers) => new Date(`${algiers}+01:00`),
    );
    for (const hours of hourSets) {
      for (const now of moments) {
        expect(frontAlgiersDate(now)).toBe(algiersDate(now));
        expect(frontPickupDays(hours, now), now.toISOString()).toEqual(pickupDays(hours, now));
        for (const day of [algiersDate(now), addDays(algiersDate(now), 1)]) {
          expect(frontAddDays(day, 1)).toBe(addDays(day, 1));
          expect(frontPickupSlots(hours, day, now), `${day} ${now.toISOString()}`).toEqual(pickupSlots(hours, day, now));
        }
      }
    }
  });
});
