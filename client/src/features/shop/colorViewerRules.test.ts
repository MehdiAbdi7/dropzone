import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { ProductDetail, Variant } from "@/types/api";
import {
  alternatives,
  availabilityLines,
  firstIndex,
  isAvailable,
  viewerColors,
  wrapIndex,
} from "./colorViewerRules";

const variant = (condition: Variant["condition"], color: string, stock: number, price: number): Variant =>
  ({ sku: `${condition}-${color}-${price}`, options: { Couleur: color }, price, stock, condition }) as unknown as Variant;

// Un P30 Pro : trois couleurs, seule Aurora a une occasion en stock (1 appareil, 32 000 DA) ;
// son neuf est à 0 ; Black a un neuf épuisé ; Breathing Crystal n'a aucune variante.
const product = {
  slug: "p30",
  colors: [
    { name: "Aurora", photoUrl: "https://res.cloudinary.com/x/image/upload/v1/a.webp" },
    { name: "Breathing Crystal", photoUrl: null },
    { name: "Black", photoUrl: "https://res.cloudinary.com/x/image/upload/v1/c.webp" },
  ],
  variants: [variant("refurbished", "Aurora", 1, 32000), variant("new", "Aurora", 0, 55000), variant("new", "Black", 0, 60000)],
} as unknown as ProductDetail;

const colors = viewerColors(product);
const [aurora, crystal, black] = colors;

describe("viewerColors", () => {
  it("garde toutes les couleurs du modèle, dans l'ordre, avec leur photo", () => {
    expect(colors.map((color) => [color.name, color.photoUrl])).toEqual([
      ["Aurora", "https://res.cloudinary.com/x/image/upload/v1/a.webp"],
      ["Breathing Crystal", null],
      ["Black", "https://res.cloudinary.com/x/image/upload/v1/c.webp"],
    ]);
  });

  it("compte les appareils, le stock et le prix le plus bas de chaque état", () => {
    expect(aurora.refurbished).toEqual({ count: 1, stock: 1, from: 32000 });
    expect(aurora.new).toBeNull();
  });

  it("ignore une variante en rupture et une couleur sans variante", () => {
    expect(black.new).toBeNull();
    expect(crystal.new).toBeNull();
    expect(crystal.refurbished).toBeNull();
  });

  it("prend le prix le plus bas et additionne le stock d'un neuf", () => {
    const two = {
      ...product,
      variants: [variant("new", "Aurora", 2, 56000), variant("new", "Aurora", 3, 54000)],
    } as unknown as ProductDetail;
    expect(viewerColors(two)[0].new).toEqual({ count: 2, stock: 5, from: 54000 });
  });
});

describe("isAvailable", () => {
  it("dit si la couleur est en stock dans l'état demandé", () => {
    expect(isAvailable(aurora, "refurbished")).toBe(true);
    expect(isAvailable(aurora, "new")).toBe(false);
  });

  it("sans état connu : disponible dans au moins un état", () => {
    expect(isAvailable(aurora, null)).toBe(true);
    expect(isAvailable(black, null)).toBe(false);
  });
});

describe("availabilityLines", () => {
  it("avec un état : une ligne, son texte et son lien vers la fiche de la couleur", () => {
    expect(availabilityLines("p30", aurora, "refurbished")).toEqual([
      {
        condition: "refurbished",
        label: "Occasion",
        available: true,
        text: `1 appareil · dès ${formatPrice(32000)}`,
        href: "/produits/p30/occasion?couleur=Aurora",
      },
    ]);
  });

  it("sans état : deux lignes, Neuf avant Occasion, sans lien pour un état indisponible", () => {
    const lines = availabilityLines("p30", aurora, null);
    expect(lines.map((line) => [line.condition, line.label, line.available])).toEqual([
      ["new", "Neuf scellé", false],
      ["refurbished", "Occasion", true],
    ]);
    expect(lines[0].text).toBe("Pas disponible pour le moment");
    expect(lines[0].href).toBeNull();
    expect(lines[1].href).toBe("/produits/p30/occasion?couleur=Aurora");
  });

  it("un neuf disponible compte les exemplaires en stock", () => {
    const fresh = viewerColors({ ...product, variants: [variant("new", "Aurora", 3, 55000)] } as unknown as ProductDetail)[0];
    const [line] = availabilityLines("p30", fresh, "new");
    expect(line.text).toBe(`3 en stock · dès ${formatPrice(55000)}`);
    expect(line.href).toBe("/produits/p30/neuf?couleur=Aurora");
  });

  it("met « appareils » au pluriel pour plusieurs occasions", () => {
    const used = viewerColors({
      ...product,
      variants: [variant("refurbished", "Aurora", 1, 32000), variant("refurbished", "Aurora", 1, 35000)],
    } as unknown as ProductDetail)[0];
    expect(availabilityLines("p30", used, "refurbished")[0].text).toBe(`2 appareils · dès ${formatPrice(32000)}`);
  });
});

describe("firstIndex", () => {
  it("prend la couleur demandée dans l'adresse", () => {
    expect(firstIndex(colors, "refurbished", "Black")).toBe(2);
  });

  it("sinon la première couleur disponible dans l'état", () => {
    expect(firstIndex(colors, "refurbished", "Inconnue")).toBe(0);
    expect(firstIndex(colors, "refurbished", undefined)).toBe(0);
  });

  it("choisit la première disponible quand la première couleur ne l'est pas", () => {
    const list = viewerColors({
      ...product,
      variants: [variant("refurbished", "Black", 1, 30000)],
    } as unknown as ProductDetail);
    expect(firstIndex(list, "refurbished", undefined)).toBe(2);
  });

  it("revient à 0 quand aucune couleur n'est disponible", () => {
    expect(firstIndex(colors, "new", undefined)).toBe(0);
  });

  it("prend la première valeur quand l'adresse en donne plusieurs", () => {
    expect(firstIndex(colors, null, ["Black", "Aurora"])).toBe(2);
  });
});

describe("wrapIndex", () => {
  it("tourne en boucle dans les deux sens", () => {
    expect(wrapIndex(6, 5, 1)).toBe(0);
    expect(wrapIndex(6, 0, -1)).toBe(5);
    expect(wrapIndex(6, 2, 1)).toBe(3);
  });

  it("reste à 0 avec une seule couleur ou aucune", () => {
    expect(wrapIndex(1, 0, 1)).toBe(0);
    expect(wrapIndex(0, 0, 1)).toBe(0);
  });
});

describe("alternatives", () => {
  it("liste les couleurs disponibles autres que celle affichée", () => {
    expect(alternatives(colors, null, 1)).toEqual([{ name: "Aurora", index: 0 }]);
    expect(alternatives(colors, "refurbished", 0)).toEqual([]);
  });

  it("est vide quand aucune couleur n'est disponible dans l'état", () => {
    expect(alternatives(colors, "new", 0)).toEqual([]);
  });
});
