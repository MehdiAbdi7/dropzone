import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import type { Options, ProductDetail, Variant } from "@/types/api";
import { colorColumns, conditionColumns } from "./choiceColumns";

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

describe("colorColumns", () => {
  it("donne une colonne par couleur, dans l'ordre, avec la lueur de sa couleur", () => {
    const columns = colorColumns(product(), "new");
    expect(columns.map((c) => [c.title, c.glow])).toEqual([
      ["Argent", "Argent"],
      ["Orange cosmique", "Orange cosmique"],
      ["Bleu intense", "Bleu intense"],
    ]);
  });

  // 23/11 : la couleur se choisit après « Neuf scellé » ou « Occasion ». Une couleur sans stock dans cet état est
  // grisée, même si elle en a dans l'autre.
  it("grise une couleur sans neuf en stock, sans lien", () => {
    const [argent, , bleu] = colorColumns(product(), "new");
    expect(argent).toMatchObject({ href: null, price: null, lines: ["Pas de neuf dans cette couleur"] });
    expect(bleu.href).toBeNull();
  });

  it("donne le prix « dès » et le stock du neuf de la couleur, et mène au neuf de cette couleur", () => {
    const orange = colorColumns(product(), "new")[1];
    expect(orange).toMatchObject({
      href: "/produits/iphone-17-pro-max/neuf?couleur=Orange%20cosmique",
      // Le prix est dans les lignes : pas de prix en double (relecture du 05/11).
      price: null,
      lines: [`Neuf scellé dès ${formatPrice(352000)}`, "4 en stock"],
    });
  });

  it("après Occasion : le prix « dès » et le nombre d'occasions de la couleur, et mène aux occasions de cette couleur", () => {
    const [argent, orange] = colorColumns(product(), "refurbished");
    expect(orange).toMatchObject({
      href: "/produits/iphone-17-pro-max/occasion?couleur=Orange%20cosmique",
      price: null,
      lines: [`Occasion dès ${formatPrice(310000)}`, "1 appareil"],
    });
    expect(argent).toMatchObject({ href: null, lines: ["Pas d'occasion dans cette couleur"] });
  });

  it("après Neuf scellé, ne compte jamais une occasion dans la couleur", () => {
    const orange = colorColumns(product({ variants: [product().variants[2]!] }), "new")[1];
    expect(orange).toMatchObject({ href: null, lines: ["Pas de neuf dans cette couleur"] });
  });

  // 06/11 : la photo du modèle montrait la même image sur toutes les couleurs. Une couleur
  // sans sa photo garde l'icône, le gérant envoie la sienne depuis la variante.
  it("prend la photo de la couleur, sinon l'icône (jamais la photo du modèle)", () => {
    const [argent, orange] = colorColumns(product(), "new");
    expect(orange.image).toBe("https://x/orange.webp");
    expect(argent.image).toBe("/products/phone.svg");
  });

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
