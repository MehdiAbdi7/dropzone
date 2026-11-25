import { describe, expect, it } from "vitest";
import type { Options, ProductDetail, Variant } from "@/types/api";
import { conditionColumns } from "./choiceColumns";

const variant = (options: Options, stock: number, price: number, condition: Variant["condition"] = "new", warrantyMonths = 12): Variant => ({
  sku: `${options.Couleur}-${options.Stockage}-${price}-${condition}`,
  options,
  price,
  stock,
  condition,
  grade: condition === "new" ? null : 9,
  batteryHealth: condition === "new" ? null : 92,
  replacedParts: [],
  compatibleParts: [],
  defects: [],
  limitations: [],
  withBox: condition === "new" ? null : false,
  details: null,
  warrantyMonths,
  gifts: [],
});

// L'iPhone 17 Pro Max du cahier : 4 neufs en Orange cosmique (3 en 256 Go, 1 en 512 Go),
// une affaire orange à 310 000 DA ; Argent et Bleu intense sans rien.
const product = (overrides: Partial<ProductDetail> = {}) =>
  ({
    slug: "iphone-17-pro-max",
    category: { name: "Smartphones", slug: "smartphones", kind: "phone" },
    images: [{ id: 1, url: "https://x/modele.webp" }],
    posterColor: "Orange cosmique",
    colors: [
      { name: "Argent", photoUrl: null },
      { name: "Orange cosmique", photoUrl: "https://x/orange.webp" },
      { name: "Bleu intense", photoUrl: null },
    ],
    variants: [
      variant({ Stockage: "256 Go", Couleur: "Orange cosmique" }, 3, 352000),
      variant({ Stockage: "512 Go", Couleur: "Orange cosmique" }, 1, 402000),
      variant({ Stockage: "256 Go", Couleur: "Orange cosmique" }, 1, 310000, "refurbished", 6),
    ],
    ...overrides,
  }) as ProductDetail;

describe("photos des colonnes du choix de l'état", () => {
  // 23/11 (demande de Mehdi) : la première étape, Neuf scellé ou Occasion, montre la photo du modèle sur les deux cartes.
  it("met la photo du modèle sur les deux cartes Neuf scellé et Occasion", () => {
    const [fresh, deal] = conditionColumns(product(), null);
    expect(fresh.image).toBe("https://x/modele.webp");
    expect(deal.image).toBe("https://x/modele.webp");
  });

  it("sans photo du produit, prend celle de la couleur de l'affiche, puis d'une autre couleur, puis l'icône", () => {
    expect(conditionColumns(product({ images: [] }), null)[0].image).toBe("https://x/orange.webp");
    expect(conditionColumns(product({ images: [], posterColor: "Argent" }), null)[0].image).toBe("https://x/orange.webp");
    expect(conditionColumns(product({ images: [], colors: [{ name: "Argent", photoUrl: null }] }), null)[0].image).toBe("/products/phone.svg");
  });

  it("garde la photo de la couleur d'un ancien lien avec une couleur", () => {
    expect(conditionColumns(product(), "Argent")[0].image).toBe("/products/phone.svg");
  });
});

describe("conditionColumns", () => {
  it("donne Neuf scellé puis Occasion, sans couleur choisie : tout le stock du modèle", () => {
    const [fresh, deal] = conditionColumns(product(), null);
    expect(fresh).toMatchObject({ lines: ["4 en stock", "Garantie 12 mois"], href: "/produits/iphone-17-pro-max/neuf" });
    expect(deal).toMatchObject({ lines: ["1 appareil", "Garantie 6 mois"], href: "/produits/iphone-17-pro-max/occasion" });
  });

  it("donne Neuf scellé puis Occasion, comptés dans la couleur d'un ancien lien, sur sa lueur et sa photo", () => {
    const [fresh, deal] = conditionColumns(product(), "Orange cosmique");
    expect(fresh).toMatchObject({
      badge: "new",
      title: "Dans sa boîte scellée",
      price: { prefix: "À partir de ", value: 352000 },
      lines: ["4 en stock", "Garantie 12 mois"],
      glow: "Orange cosmique",
      image: "https://x/orange.webp",
      href: "/produits/iphone-17-pro-max/neuf?couleur=Orange%20cosmique",
    });
    expect(deal).toMatchObject({
      badge: "deal",
      title: "Testé et décrit pièce par pièce",
      price: { prefix: "À partir de ", value: 310000 },
      lines: ["1 appareil", "Garantie 6 mois"],
      href: "/produits/iphone-17-pro-max/occasion?couleur=Orange%20cosmique",
    });
  });

  it("grise une colonne sans stock dans la couleur", () => {
    const [fresh, deal] = conditionColumns(product(), "Argent");
    expect(fresh).toMatchObject({ href: null, price: null, lines: ["Aucun neuf scellé en stock"] });
    expect(deal).toMatchObject({ href: null, price: null, lines: ["Aucune occasion en stock"] });
  });

  it("prend la lueur du modèle sans couleur choisie", () => {
    const [fresh] = conditionColumns(product({ colors: [] }), null);
    expect(fresh.glow).toBe("Orange cosmique");
    expect(fresh.href).toBe("/produits/iphone-17-pro-max/neuf");
  });
});
