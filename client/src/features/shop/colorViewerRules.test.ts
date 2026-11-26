import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { ProductDetail, Variant } from "@/types/api";
import {
  alternatives,
  availabilityLines,
  firstIndex,
  isAvailable,
  offerVariants,
  requestedVariant,
  startView,
  viewerColors,
  viewerSearch,
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

// Un modèle de boutique : Noir a 2 neufs à 345 000 DA ; Argent a un neuf épuisé et une occasion à 250 000 DA.
const shop = {
  slug: "p30",
  colors: [
    { name: "Noir", photoUrl: null },
    { name: "Argent", photoUrl: null },
  ],
  variants: [variant("new", "Noir", 2, 345000), variant("new", "Argent", 0, 345000), variant("refurbished", "Argent", 1, 250000)],
} as unknown as ProductDetail;
const shopColors = viewerColors(shop);

describe("offerVariants", () => {
  it("rend les variantes en stock de la couleur dans l'état demandé", () => {
    expect(offerVariants(shop, "Noir", "new").map((one) => one.price)).toEqual([345000]);
    expect(offerVariants(shop, "Argent", "refurbished").map((one) => one.price)).toEqual([250000]);
  });

  it("ne rend rien pour un neuf épuisé ni pour un état absent de la couleur", () => {
    expect(offerVariants(shop, "Argent", "new")).toEqual([]);
    expect(offerVariants(shop, "Noir", "refurbished")).toEqual([]);
  });
});

describe("startView", () => {
  it("état connu et couleur de l'adresse en stock : ouvre ses offres", () => {
    expect(startView(shop, shopColors, "new", { couleur: "Noir" })).toEqual({ index: 0, offers: "new" });
  });

  it("couleur de l'adresse sans stock dans l'état : mode couleurs, sur la couleur de l'aperçu", () => {
    expect(startView(shop, shopColors, "new", { couleur: "Argent", preview: "Argent" })).toEqual({ index: 1, offers: null });
  });

  it("couleur inconnue : mode couleurs, sur la première couleur disponible", () => {
    expect(startView(shop, shopColors, "new", { couleur: "Inconnue" })).toEqual({ index: 0, offers: null });
  });

  it("couleur donnée deux fois : prend la première", () => {
    expect(startView(shop, shopColors, "new", { couleur: ["Noir", "x"] })).toEqual({ index: 0, offers: "new" });
  });

  it("sans état connu : l'état vient de `etat` dans l'adresse", () => {
    expect(startView(shop, shopColors, null, { couleur: "Argent", etat: "occasion" })).toEqual({ index: 1, offers: "refurbished" });
  });

  it("sans état connu ni `etat` : mode couleurs", () => {
    expect(startView(shop, shopColors, null, { couleur: "Noir" }).offers).toBeNull();
  });

  it("l'état de la page l'emporte sur `etat`", () => {
    expect(startView(shop, shopColors, "new", { couleur: "Noir", etat: "occasion" })).toEqual({ index: 0, offers: "new" });
  });
});

describe("viewerSearch", () => {
  it("mode offres sur une page à état connu : `couleur`, sans `apercu` ni `etat`", () => {
    expect(viewerSearch("apercu=Noir", "Noir", "new", "new")).toBe("couleur=Noir");
  });

  it("retour au mode couleurs : `apercu` remplace `couleur`", () => {
    expect(viewerSearch("couleur=Noir", "Noir", null, "new")).toBe("apercu=Noir");
  });

  it("page de référence : l'état s'écrit dans `etat`, et s'enlève au retour", () => {
    expect(viewerSearch("apercu=Argent", "Argent", "refurbished", null)).toBe("couleur=Argent&etat=occasion");
    expect(viewerSearch("couleur=Argent&etat=occasion", "Argent", null, null)).toBe("apercu=Argent");
  });

  it("garde les autres paramètres et encode le nom de la couleur", () => {
    expect(viewerSearch("utm=1&apercu=Noir", "Noir", "new", "new")).toBe("utm=1&couleur=Noir");
    expect(viewerSearch("", "Bleu ciel", "new", "new")).toBe("couleur=Bleu+ciel");
  });

  it("enlève `variante` : une fois la visionneuse déplacée, le lien de la story ne doit plus viser cette variante", () => {
    expect(viewerSearch("couleur=Noir&etat=neuf&variante=new-Noir-345000", "Noir", null, null)).toBe("apercu=Noir");
  });
});

// Le lien de la story Instagram (26/11) : `variante` désigne l'exemplaire dont le client veut revoir la vidéo.
describe("requestedVariant", () => {
  it("rend le SKU quand la couleur, l'état et la variante de l'adresse sont en stock", () => {
    expect(requestedVariant(shop, shopColors, null, { couleur: "Argent", etat: "occasion", variante: "refurbished-Argent-250000" })).toBe(
      "refurbished-Argent-250000",
    );
  });

  it("sur une page à état connu, `etat` n'est pas nécessaire", () => {
    expect(requestedVariant(shop, shopColors, "new", { couleur: "Noir", variante: "new-Noir-345000" })).toBe("new-Noir-345000");
  });

  it("ignore un SKU inconnu", () => {
    expect(requestedVariant(shop, shopColors, "new", { couleur: "Noir", variante: "inconnu" })).toBeNull();
  });

  it("ignore une variante en rupture (le neuf d'Argent est épuisé)", () => {
    expect(requestedVariant(shop, shopColors, "new", { couleur: "Argent", variante: "new-Argent-345000" })).toBeNull();
  });

  it("ignore la variante d'une autre couleur ou d'un autre état que ceux de l'adresse", () => {
    expect(requestedVariant(shop, shopColors, "new", { couleur: "Noir", variante: "refurbished-Argent-250000" })).toBeNull();
    expect(requestedVariant(shop, shopColors, null, { couleur: "Noir", etat: "neuf", variante: "refurbished-Argent-250000" })).toBeNull();
  });

  it("sans `variante`, ou sans offres ouvertes par l'adresse : null", () => {
    expect(requestedVariant(shop, shopColors, "new", { couleur: "Noir" })).toBeNull();
    expect(requestedVariant(shop, shopColors, null, { couleur: "Noir", variante: "new-Noir-345000" })).toBeNull();
  });

  it("prend le premier SKU quand l'adresse en donne deux", () => {
    expect(requestedVariant(shop, shopColors, "new", { couleur: "Noir", variante: ["new-Noir-345000", "x"] })).toBe("new-Noir-345000");
  });
});
