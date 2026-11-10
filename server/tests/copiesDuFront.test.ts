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
});
