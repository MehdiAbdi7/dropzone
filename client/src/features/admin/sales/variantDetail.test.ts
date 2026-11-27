import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import { variantDetailRows } from "./variantDetail";
import { makeHit } from "./variantHit.fixture";

// Ce que le bouton « Détail » de la vente (18/11) montre : une ligne par information, rien d'inventé.
const valueOf = (rows: { label: string; value: string }[], label: string) => rows.find((row) => row.label === label)?.value;

const deal = makeHit({
  condition: "refurbished",
  grade: 8,
  batteryHealth: 95,
  replacedParts: ["Écran", "Batterie"],
  compatibleParts: ["Écran"],
  defects: ["Rayure sur le dos"],
  limitations: ["Face ID absent"],
  withBox: false,
  details: "Comme neuf",
  warrantyMonths: 6,
  origin: "Europe",
  reference: "51057",
  purchasePrice: 180_000,
  gifts: [{ name: "Chargeur 20W", quantity: 1 }],
});

describe("variantDetailRows : une occasion", () => {
  const rows = variantDetailRows(deal);

  it("dit l'état de l'appareil : note, batterie, pièces changées, défauts, limitations, boîte", () => {
    expect(valueOf(rows, "Note")).toBe("8/10");
    expect(valueOf(rows, "Batterie")).toBe("95 %");
    expect(valueOf(rows, "Pièces changées")).toBe("Écran (compatible), Batterie (d'origine)");
    expect(valueOf(rows, "Défauts")).toBe("Rayure sur le dos");
    expect(valueOf(rows, "Limitations")).toBe("Face ID absent");
    expect(valueOf(rows, "Boîte")).toBe("Sans sa boîte d'origine");
  });

  it("donne la garantie, l'origine, la référence, les détails du gérant et les cadeaux", () => {
    expect(valueOf(rows, "Garantie")).toBe("6 mois");
    expect(valueOf(rows, "Origine")).toBe("Europe");
    expect(valueOf(rows, "Référence")).toBe("51057");
    expect(valueOf(rows, "Détails")).toBe("Comme neuf");
    expect(valueOf(rows, "Cadeaux offerts")).toBe("1 × Chargeur 20W");
  });

  it("donne le stock, le prix de vente et le prix d'achat", () => {
    expect(valueOf(rows, "Stock")).toBe("3 en stock");
    expect(valueOf(rows, "Prix de vente")).toBe(formatPrice(245_000));
    expect(valueOf(rows, "Prix d'achat")).toBe(formatPrice(180_000));
  });
});

// Le prix d'achat est une ligne « secrète » (27/11) : la fenêtre la cache derrière le code des prix d'achat. La fonction rend
// toujours le vrai prix et le drapeau ; c'est l'écran qui décide de le montrer.
describe("variantDetailRows : la ligne du prix d'achat est secrète", () => {
  it("marque le prix d'achat comme secret, et lui seul", () => {
    const rows = variantDetailRows(deal);
    expect(rows.filter((row) => row.secret).map((row) => row.label)).toEqual(["Prix d'achat"]);
  });

  it("garde le prix de vente et le reste de la fiche en clair", () => {
    const rows = variantDetailRows(deal);
    expect(rows.find((row) => row.label === "Prix de vente")?.secret).toBeUndefined();
    expect(rows.find((row) => row.label === "Garantie")?.secret).toBeUndefined();
  });

  it("un prix d'achat inconnu n'est pas secret : « non renseigné » ne révèle rien", () => {
    const row = variantDetailRows(makeHit({ purchasePrice: null })).find((r) => r.label === "Prix d'achat");
    expect(row).toEqual({ label: "Prix d'achat", value: "non renseigné" });
  });
});

describe("variantDetailRows : un neuf scellé", () => {
  it("dit « Neuf scellé » et n'a ni note ni batterie", () => {
    const rows = variantDetailRows(makeHit({ warrantyMonths: 12 }));
    expect(valueOf(rows, "État")).toBe("Neuf scellé");
    expect(valueOf(rows, "Note")).toBeUndefined();
    expect(valueOf(rows, "Batterie")).toBeUndefined();
    expect(valueOf(rows, "Garantie")).toBe("12 mois");
  });
});

describe("variantDetailRows : les cas où l'information manque", () => {
  it("une boîte non précisée, des listes vides, une note et une batterie absentes se lisent bien", () => {
    const rows = variantDetailRows(makeHit({ condition: "refurbished" }));
    expect(valueOf(rows, "Boîte")).toBe("Boîte non précisée");
    expect(valueOf(rows, "Pièces changées")).toBe("aucune");
    expect(valueOf(rows, "Défauts")).toBe("aucun");
    expect(valueOf(rows, "Limitations")).toBe("aucune");
    expect(valueOf(rows, "Note")).toBe("non précisée");
    expect(valueOf(rows, "Batterie")).toBe("non mesurée");
  });

  it("un prix d'achat inconnu dit « non renseigné », jamais NaN", () => {
    const rows = variantDetailRows(makeHit({ purchasePrice: null }));
    expect(valueOf(rows, "Prix d'achat")).toBe("non renseigné");
    expect(JSON.stringify(rows)).not.toContain("NaN");
  });

  // Le client peut passer en ligne avant l'API : une réponse sans les nouveaux champs ne doit ni planter ni dire NaN.
  it("une réponse d'une ancienne API (sans la fiche ni le prix d'achat) ne plante pas et ne dit pas NaN", () => {
    const old = { ...makeHit({ condition: "refurbished" }) } as Partial<ReturnType<typeof makeHit>>;
    for (const key of ["purchasePrice", "gifts", "replacedParts", "compatibleParts", "defects", "limitations"] as const) delete old[key];
    const rows = variantDetailRows(old as ReturnType<typeof makeHit>);
    expect(valueOf(rows, "Prix d'achat")).toBe("non renseigné");
    expect(valueOf(rows, "Pièces changées")).toBe("aucune");
    expect(JSON.stringify(rows)).not.toContain("NaN");
  });

  it("une garantie absente dit « aucune » ; sans origine, référence, détails ni cadeaux, ces lignes n'existent pas", () => {
    const rows = variantDetailRows(makeHit());
    expect(valueOf(rows, "Garantie")).toBe("aucune");
    for (const label of ["Origine", "Référence", "Détails", "Cadeaux offerts"]) {
      expect(valueOf(rows, label), label).toBeUndefined();
    }
  });
});
