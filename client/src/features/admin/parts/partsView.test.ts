import { describe, expect, it } from "vitest";
import {
  activeCategoryId,
  arrivalProblem,
  averageAfterArrival,
  categoryChoiceProblem,
  categoryNameProblem,
  isOutOfStock,
  movementLabel,
  partDraftProblem,
  partEditProblem,
  partPatchBody,
  stockProblem,
  visibleParts,
} from "./partsView";

// Les catégories de pièces (21/11) : le nom, la catégorie ouverte par défaut, ce que montre la page, le déplacement.
const categories = [
  { id: 4, name: "Afficheur", partsCount: 1 },
  { id: 7, name: "Batterie", partsCount: 2 },
];

describe("categoryNameProblem", () => {
  it("accepte un nom de 1 à 40 caractères", () => {
    expect(categoryNameProblem("Batterie")).toBeNull();
    expect(categoryNameProblem("x".repeat(40))).toBeNull();
  });

  it("refuse un nom vide ou trop long, en français", () => {
    expect(categoryNameProblem("   ")).toBe("Le nom de la catégorie : 1 caractère au minimum.");
    expect(categoryNameProblem("x".repeat(41))).toBe("Le nom de la catégorie : 40 caractères au maximum.");
  });
});

describe("categoryChoiceProblem", () => {
  it("demande de choisir une catégorie avant de créer une pièce", () => {
    expect(categoryChoiceProblem(null)).toBe("Choisis la catégorie de la pièce.");
    expect(categoryChoiceProblem(7)).toBeNull();
  });
});

describe("activeCategoryId", () => {
  it("garde la catégorie demandée si elle existe", () => {
    expect(activeCategoryId(categories, 7)).toBe(7);
  });

  it("sinon ouvre la première (la catégorie vient d'être supprimée, ou rien n'est choisi)", () => {
    expect(activeCategoryId(categories, 99)).toBe(4);
    expect(activeCategoryId(categories, null)).toBe(4);
  });

  it("rien quand il n'y a aucune catégorie", () => {
    expect(activeCategoryId([], 7)).toBeNull();
  });
});

describe("visibleParts", () => {
  const parts = [
    { id: 1, name: "Batterie iPhone 13", categoryId: 7 },
    { id: 2, name: "Batterie iPhone 15", categoryId: 7 },
    { id: 3, name: "Écran iPhone 13", categoryId: 4 },
  ];

  it("sans recherche : les pièces de la catégorie ouverte", () => {
    expect(visibleParts(parts, 7, "").map((part) => part.id)).toEqual([1, 2]);
    expect(visibleParts(parts, 4, "").map((part) => part.id)).toEqual([3]);
  });

  it("avec une recherche : toutes les catégories (une pièce rangée ailleurs reste trouvable)", () => {
    expect(visibleParts(parts, 7, "ecran").map((part) => part.id)).toEqual([3]);
    expect(visibleParts(parts, 4, "iphone 13").map((part) => part.id)).toEqual([1, 3]);
  });
});

describe("partPatchBody et la catégorie", () => {
  const part = { name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000, categoryId: 7 };

  it("envoie la catégorie seulement si elle a changé", () => {
    expect(partPatchBody(part, { ...part, categoryId: 4 })).toEqual({ categoryId: 4 });
    expect(partPatchBody(part, part)).toEqual({});
  });
});

// Les règles de saisie de la page Pièces (18/11) : les mêmes bornes que l'API, dites en français avant l'envoi.
const draft = { name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000, stock: 2 };

describe("partDraftProblem", () => {
  it("accepte un brouillon valide, prix et stock à 0 compris", () => {
    expect(partDraftProblem(draft)).toBeNull();
    expect(partDraftProblem({ ...draft, purchasePrice: 0, salePrice: 0, stock: 0 })).toBeNull();
  });

  it("refuse un nom trop court ou trop long", () => {
    expect(partDraftProblem({ ...draft, name: " a " })).toMatch(/nom/i);
    expect(partDraftProblem({ ...draft, name: "x".repeat(81) })).toMatch(/nom/i);
  });

  it("refuse un prix vide (NaN), négatif, décimal ou trop grand, en nommant le prix", () => {
    expect(partDraftProblem({ ...draft, purchasePrice: Number.NaN })).toMatch(/prix d'achat/i);
    expect(partDraftProblem({ ...draft, purchasePrice: -1 })).toMatch(/prix d'achat/i);
    expect(partDraftProblem({ ...draft, salePrice: 12.5 })).toMatch(/prix de vente/i);
    expect(partDraftProblem({ ...draft, salePrice: 10_000_001 })).toMatch(/prix de vente/i);
  });

  it("refuse un stock de départ vide, négatif ou décimal", () => {
    expect(partDraftProblem({ ...draft, stock: Number.NaN })).toMatch(/stock/i);
    expect(partDraftProblem({ ...draft, stock: -1 })).toMatch(/stock/i);
    expect(partDraftProblem({ ...draft, stock: 1.5 })).toMatch(/stock/i);
  });
});

describe("arrivalProblem", () => {
  it("refuse une quantité de 0, trop grande ou vide", () => {
    expect(arrivalProblem({ quantity: 0, unitCost: 100 })).toMatch(/quantité/i);
    expect(arrivalProblem({ quantity: 10_001, unitCost: 100 })).toMatch(/quantité/i);
    expect(arrivalProblem({ quantity: Number.NaN, unitCost: 100 })).toMatch(/quantité/i);
  });

  it("refuse un prix d'achat vide ou négatif", () => {
    expect(arrivalProblem({ quantity: 1, unitCost: Number.NaN })).toMatch(/prix d'achat/i);
    expect(arrivalProblem({ quantity: 1, unitCost: -1 })).toMatch(/prix d'achat/i);
  });

  it("accepte un arrivage à 0 DA (pièces récupérées)", () => {
    expect(arrivalProblem({ quantity: 2, unitCost: 0 })).toBeNull();
  });
});

describe("stockProblem", () => {
  it("refuse un stock négatif, décimal ou vide", () => {
    expect(stockProblem(-1, 4)).toMatch(/stock/i);
    expect(stockProblem(2.5, 4)).toMatch(/stock/i);
    expect(stockProblem(Number.NaN, 4)).toMatch(/stock/i);
  });

  it("dit quand le stock compté est déjà celui de la pièce", () => {
    expect(stockProblem(4, 4)).toBe("Le stock est déjà de 4");
  });

  it("accepte un stock compté différent", () => {
    expect(stockProblem(3, 4)).toBeNull();
    expect(stockProblem(0, 4)).toBeNull();
  });
});

describe("isOutOfStock", () => {
  it("vrai seulement à 0", () => {
    expect(isOutOfStock({ stock: 0 })).toBe(true);
    expect(isOutOfStock({ stock: 1 })).toBe(false);
  });
});

describe("movementLabel", () => {
  it("dit un arrivage et une correction, avec leur signe", () => {
    expect(movementLabel({ kind: "arrival", delta: 2 })).toBe("Arrivage de 2");
    expect(movementLabel({ kind: "correction", delta: -1 })).toBe("Correction : −1");
    expect(movementLabel({ kind: "correction", delta: 3 })).toBe("Correction : +3");
  });
});

// L'aperçu du prix d'achat moyen dans la fenêtre d'arrivage : la même formule que l'API (partMath.ts).
describe("averageAfterArrival", () => {
  it("2 en stock à 3 500 plus 2 à 0 donnent 1 750", () => {
    expect(averageAfterArrival({ stock: 2, purchasePrice: 3_500 }, { quantity: 2, unitCost: 0 })).toBe(1_750);
  });

  it("sans stock, le prix de l'arrivage", () => {
    expect(averageAfterArrival({ stock: 0, purchasePrice: 5_000 }, { quantity: 3, unitCost: 2_800 })).toBe(2_800);
  });

  it("rien tant que la saisie est incomplète", () => {
    expect(averageAfterArrival({ stock: 2, purchasePrice: 3_500 }, { quantity: Number.NaN, unitCost: 0 })).toBeNull();
    expect(averageAfterArrival({ stock: 2, purchasePrice: 3_500 }, { quantity: 0, unitCost: 100 })).toBeNull();
  });
});

// « Modifier » n'envoie que ce qui a changé : le prix d'achat est une moyenne recalculée à chaque arrivage, un
// renommage ne doit jamais la remettre à la valeur vue à l'ouverture de la fenêtre.
describe("partPatchBody", () => {
  const part = { name: "Batterie iPhone 13", purchasePrice: 3_500, salePrice: 6_000 };

  it("un renommage n'envoie que le nom, jamais le prix d'achat", () => {
    expect(partPatchBody(part, { ...part, name: "Batterie iPhone 13 Pro" })).toEqual({ name: "Batterie iPhone 13 Pro" });
  });

  it("n'envoie que le prix changé", () => {
    expect(partPatchBody(part, { ...part, salePrice: 6_500 })).toEqual({ salePrice: 6_500 });
    expect(partPatchBody(part, { ...part, purchasePrice: 3_000 })).toEqual({ purchasePrice: 3_000 });
  });

  it("compare le nom sans les espaces autour, et rien n'est envoyé quand rien n'a changé", () => {
    expect(partPatchBody(part, { ...part, name: "  Batterie iPhone 13 " })).toEqual({});
  });
});

// En modification, le stock n'est pas un champ de la fenêtre : il ne doit pas empêcher d'enregistrer.
describe("partEditProblem", () => {
  it("accepte un nom et des prix valides", () => {
    expect(partEditProblem({ name: "Batterie", purchasePrice: 0, salePrice: 0 })).toBeNull();
  });

  it("dit le nom ou le prix fautif", () => {
    expect(partEditProblem({ name: "a", purchasePrice: 1, salePrice: 1 })).toMatch(/nom/i);
    expect(partEditProblem({ name: "Batterie", purchasePrice: Number.NaN, salePrice: 1 })).toMatch(/prix d'achat/i);
    expect(partEditProblem({ name: "Batterie", purchasePrice: 1, salePrice: -1 })).toMatch(/prix de vente/i);
  });
});
