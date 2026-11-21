import { describe, expect, it } from "vitest";
import { movementLabel } from "../parts/partsView";
import { formatPrice } from "@/lib/format";
import { actionLabel, allowedTargets, confirmText, initialRepairStep, paidText, parseRepairSearch, repairCapabilities, repairStepBadge, returnProblem, repairDraftProblem, repairNumber, repairSteps, repairTotal, warrantyLabel } from "./repairsView";

// Les deux onglets de la liste et la fenêtre par étape (21/11) : où en est une fiche, et sur quelle étape s'ouvre sa fenêtre.
describe("repairStepBadge", () => {
  it("dit la position dans le circuit : « 1/5 · Reçu »", () => {
    expect(repairStepBadge("received", false)).toBe("1/5 · Reçu");
    expect(repairStepBadge("in_repair", false)).toBe("3/5 · En réparation");
  });

  it("sous garantie, l'étape Devis sautée ne compte pas", () => {
    expect(repairStepBadge("in_repair", true)).toBe("2/4 · En réparation");
    expect(repairStepBadge("ready", true)).toBe("3/4 · Prêt");
  });

  it("une fiche rendue est à la dernière étape", () => {
    expect(repairStepBadge("returned", false)).toBe("5/5 · Rendu");
  });

  it("un devis refusé : le nom seul, comme une sortie de commande", () => {
    expect(repairStepBadge("to_return", false)).toBe("À rendre sans réparation");
  });
});

describe("initialRepairStep", () => {
  it("s'ouvre sur l'étape en cours", () => {
    expect(initialRepairStep(repairSteps("in_repair", false))).toBe(2);
  });

  it("sous garantie, c'est la place dans la frise entière (le devis sauté garde sa pastille)", () => {
    expect(initialRepairStep(repairSteps("in_repair", true))).toBe(2);
  });

  it("sur la sortie quand le devis est refusé", () => {
    expect(initialRepairStep(repairSteps("to_return", false))).toBe(2);
  });

  it("sur la dernière étape quand la fiche est rendue", () => {
    expect(initialRepairStep(repairSteps("returned", false))).toBe(4);
  });
});

// La logique de la page Réparations (18/11, étape 2) : la frise, le numéro, la recherche, la saisie, la garantie.
const states = (status: Parameters<typeof repairSteps>[0], underWarranty = false) => repairSteps(status, underWarranty).map((step) => step.state);

describe("repairSteps", () => {
  it("garde le circuit Reçu, Devis, En réparation, Prêt, Rendu", () => {
    expect(repairSteps("received", false).map((step) => step.label)).toEqual(["Reçu", "Devis à valider", "En réparation", "Prêt", "Rendu"]);
  });

  it("En réparation : Reçu et Devis faits, En réparation en cours, le reste à venir", () => {
    expect(states("in_repair")).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
  });

  it("sous garantie, l'étape Devis est sautée", () => {
    expect(states("in_repair", true)).toEqual(["done", "skipped", "current", "upcoming", "upcoming"]);
    expect(states("received", true)).toEqual(["current", "skipped", "upcoming", "upcoming", "upcoming"]);
  });

  it("Rendu : tout est fait, rien n'est « en cours »", () => {
    expect(states("returned")).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("Devis à valider : le devis est l'étape en cours", () => {
    expect(states("quote")).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("À rendre sans réparation : une sortie rouge prend la place de la réparation et de l'étape Prêt", () => {
    const steps = repairSteps("to_return", false);
    expect(steps.map((step) => step.label)).toEqual(["Reçu", "Devis à valider", "À rendre sans réparation", "Rendu"]);
    expect(steps.map((step) => step.state)).toEqual(["done", "done", "exit", "upcoming"]);
  });
});

describe("repairNumber et parseRepairSearch", () => {
  it("écrit le numéro avec son R", () => {
    expect(repairNumber(1001)).toBe("R-1001");
  });

  it("garde le numéro d'une saisie « R-1001 », « r 1001 » ou « 1001 », et le texte sinon", () => {
    expect(parseRepairSearch("r-1001")).toBe("1001");
    expect(parseRepairSearch("R 1001")).toBe("1001");
    expect(parseRepairSearch("1001")).toBe("1001");
    expect(parseRepairSearch("  Karim ")).toBe("Karim");
    expect(parseRepairSearch("")).toBe("");
  });
});

describe("repairDraftProblem", () => {
  const draft = { fullName: "Karim Benali", phone: "0550 12 34 56", deviceName: "iPhone 13", issue: "Écran noir", laborPrice: null };

  it("accepte un brouillon valide, main-d'œuvre vide ou à 0 comprise", () => {
    expect(repairDraftProblem(draft)).toBeNull();
    expect(repairDraftProblem({ ...draft, laborPrice: 0 })).toBeNull();
    expect(repairDraftProblem({ ...draft, phone: "05-50.12.34.56" })).toBeNull();
  });

  it("dit le champ fautif", () => {
    expect(repairDraftProblem({ ...draft, fullName: "Ka" })).toMatch(/nom/i);
    expect(repairDraftProblem({ ...draft, phone: "123" })).toMatch(/téléphone/i);
    expect(repairDraftProblem({ ...draft, phone: "0850123456" })).toMatch(/téléphone/i);
    expect(repairDraftProblem({ ...draft, deviceName: "i" })).toMatch(/appareil/i);
    expect(repairDraftProblem({ ...draft, issue: " " })).toMatch(/panne/i);
    expect(repairDraftProblem({ ...draft, laborPrice: -1 })).toMatch(/main-d'œuvre/i);
    expect(repairDraftProblem({ ...draft, laborPrice: 12.5 })).toMatch(/main-d'œuvre/i);
    expect(repairDraftProblem({ ...draft, laborPrice: 10_000_001 })).toMatch(/main-d'œuvre/i);
    expect(repairDraftProblem({ ...draft, laborPrice: Number.NaN })).toMatch(/main-d'œuvre/i);
  });
});

describe("warrantyLabel", () => {
  it("dit la garantie avec sa date au format jour/mois/année", () => {
    expect(warrantyLabel({ underWarranty: true, warrantyEndsAt: "2027-03-01", warrantyForcedOff: false })).toBe("Sous garantie jusqu'au 01/03/2027");
  });

  it("dit hors garantie, et « forcée » quand le magasin l'a décidé", () => {
    expect(warrantyLabel({ underWarranty: false, warrantyEndsAt: null, warrantyForcedOff: false })).toBe("Hors garantie");
    expect(warrantyLabel({ underWarranty: false, warrantyEndsAt: "2027-03-01", warrantyForcedOff: true })).toBe("Hors garantie (forcée)");
    expect(warrantyLabel({ underWarranty: false, warrantyEndsAt: "2025-03-01", warrantyForcedOff: false })).toBe("Hors garantie (finie le 01/03/2025)");
  });
});

describe("repairTotal", () => {
  it("compte les pièces au prix de vente et la main-d'œuvre", () => {
    expect(repairTotal({ laborPrice: null, parts: [] })).toBe(0);
    expect(repairTotal({ laborPrice: 2_000, parts: [{ quantity: 2, unitPrice: 6_000 }] })).toBe(14_000);
  });
});

describe("actionLabel", () => {
  it("nomme chaque bouton selon d'où l'on part", () => {
    expect(actionLabel("received", "quote", false)).toBe("Proposer le devis");
    expect(actionLabel("received", "in_repair", false)).toBe("Client d'accord : réparer");
    expect(actionLabel("received", "in_repair", true)).toBe("Commencer la réparation");
    expect(actionLabel("quote", "in_repair", false)).toBe("Devis accepté : réparer");
    expect(actionLabel("quote", "to_return", false)).toBe("Devis refusé");
    expect(actionLabel("in_repair", "ready", false)).toBe("Réparation terminée");
    expect(actionLabel("ready", "returned", false)).toBe("Rendre l'appareil");
    expect(actionLabel("to_return", "returned", false)).toBe("Rendre l'appareil");
  });
});

describe("le journal des pièces", () => {
  it("dit une sortie et un retour de réparation", () => {
    expect(movementLabel({ kind: "repair", delta: -2 })).toBe("Réparation : −2");
    expect(movementLabel({ kind: "repair_return", delta: 1 })).toBe("Retour de réparation : +1");
  });
  it("dit des pièces récupérées sur une reprise démontée, et une pièce utilisée pour la remettre en état (étape 6)", () => {
    expect(movementLabel({ kind: "salvage", delta: 2 })).toBe("Pièces récupérées : +2");
    expect(movementLabel({ kind: "trade_in_use", delta: -1 })).toBe("Remise en état d'une reprise : −1");
  });
});

// Relecture finale : la frise dit ce qui s'est VRAIMENT passé, d'après les étapes déjà traversées.
describe("repairSteps avec l'historique", () => {
  it("un devis refusé puis rendu garde sa sortie rouge, il n'a jamais été réparé", () => {
    const steps = repairSteps("returned", false, ["received", "quote", "to_return", "returned"]);
    expect(steps.map((step) => [step.label, step.state])).toEqual([
      ["Reçu", "done"],
      ["Devis à valider", "done"],
      ["À rendre sans réparation", "exit"],
      ["Rendu", "done"],
    ]);
  });

  it("un devis sauté (client d'accord au comptoir) est montré sauté, pas fait", () => {
    expect(repairSteps("in_repair", false, ["received", "in_repair"]).map((step) => step.state)).toEqual(["done", "skipped", "current", "upcoming", "upcoming"]);
    expect(repairSteps("returned", false, ["received", "in_repair", "ready", "returned"]).map((step) => step.state)).toEqual(["done", "skipped", "done", "done", "done"]);
  });

  it("un devis traversé puis revenu en réparation reste fait", () => {
    expect(repairSteps("in_repair", false, ["received", "quote", "in_repair"]).map((step) => step.state)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
  });
});

describe("repairTotal d'une fiche refusée", () => {
  it("ne compte que la main-d'œuvre", () => {
    const parts = [{ quantity: 1, unitPrice: 12_000 }];
    expect(repairTotal({ laborPrice: 500, parts, refused: true })).toBe(500);
    expect(repairTotal({ laborPrice: null, parts, refused: true })).toBe(0);
    expect(repairTotal({ laborPrice: 500, parts, refused: false })).toBe(12_500);
  });
});

describe("confirmText", () => {
  it("demande confirmation pour un devis refusé, en nommant les pièces déjà sorties", () => {
    const text = confirmText("to_return", [{ name: "Batterie iPhone 13", quantity: 1, consumed: true }, { name: "Nappe", quantity: 2, consumed: false }]);
    expect(text).toContain("Batterie iPhone 13 × 1");
    expect(text).not.toContain("Nappe");
    expect(text).toMatch(/retour/i);
  });

  it("sans pièce sortie, dit seulement que la fiche ne peut plus que se rendre", () => {
    expect(confirmText("to_return", [])).toMatch(/rendre/i);
  });

  it("demande confirmation pour rendre l'appareil, qui fige la fiche", () => {
    expect(confirmText("returned", [])).toMatch(/plus se modifier/i);
  });

  it("ne demande rien pour les autres passages", () => {
    expect(confirmText("quote", [])).toBeNull();
    expect(confirmText("in_repair", [])).toBeNull();
    expect(confirmText("ready", [])).toBeNull();
  });
});

// Le Rendu avec paiement (étape 3).
describe("returnProblem", () => {
  it("rien à payer : jamais de problème, même sans moyen", () => {
    expect(returnProblem(0, null)).toBeNull();
  });

  it("de l'argent à encaisser : le moyen de paiement est obligatoire", () => {
    expect(returnProblem(8_000, null)).toBe("Choisissez le moyen de paiement.");
    expect(returnProblem(8_000, "cash")).toBeNull();
  });
});

describe("paidText", () => {
  it("dit ce que le client a payé, avec le moyen et le jour", () => {
    expect(paidText({ paidAmount: 8_000, payMethod: "baridimob", returnedOn: "2026-11-18" })).toBe(`Payé ${formatPrice(8_000)} par BaridiMob le 18/11/2026`);
  });

  it("dit un rendu sans paiement", () => {
    expect(paidText({ paidAmount: 0, payMethod: null, returnedOn: "2026-11-18" })).toBe("Rendu sans paiement le 18/11/2026");
  });

  it("n'a rien à dire avant le Rendu", () => {
    expect(paidText({ paidAmount: null, payMethod: null, returnedOn: null })).toBeNull();
  });
});

// Relecture finale : le texte avant le Rendu ne doit rien affirmer de faux (une fiche rendue SE supprime, par l'admin).
describe("le texte du Rendu", () => {
  it("dit que la fiche ne se modifie plus, sans prétendre qu'elle ne se supprime plus", () => {
    const text = confirmText("returned", []) ?? "";
    expect(text).toMatch(/ne pourra plus se modifier/i);
    expect(text).not.toMatch(/supprim/i);
  });
});

// L'atelier selon le rôle (étape 5) : le technicien avance la réparation, la vente fait le devis et le Rendu.
describe("allowedTargets", () => {
  const all = ["quote", "in_repair", "to_return", "ready", "returned"] as const;

  it("le technicien sous garantie ne garde que En réparation et Prêt", () => {
    expect(allowedTargets("technician", [...all], true)).toEqual(["in_repair", "ready"]);
    expect(allowedTargets("technician", ["quote", "to_return"], true)).toEqual([]);
  });

  it("le technicien hors garantie ne garde que Prêt : l'accord du client est enregistré par la vente", () => {
    expect(allowedTargets("technician", [...all], false)).toEqual(["ready"]);
    expect(allowedTargets("technician", ["in_repair"], false)).toEqual([]);
  });

  it("le vendeur, le responsable et l'admin gardent tout", () => {
    for (const role of ["seller", "order_manager", "admin"] as const) expect(allowedTargets(role, [...all], false), role).toEqual([...all]);
  });
});

describe("repairCapabilities", () => {
  it("le technicien : crée une fiche et gère les pièces avec leur prix d'achat, pas l'argent du client ni le devis", () => {
    expect(repairCapabilities("technician")).toEqual({
      createsRepair: true,
      editsRepair: false,
      seesClientMoney: false,
      deletesRepair: false,
      replacesDevice: false,
      createsPart: true,
      editsPart: false,
      seesPartCost: true,
      seesPartJournal: true,
    });
  });

  it("le vendeur et le responsable : la vente, sans le stock ni le prix d'achat", () => {
    for (const role of ["seller", "order_manager"] as const) {
      expect(repairCapabilities(role), role).toEqual({
        createsRepair: true,
        editsRepair: true,
        seesClientMoney: true,
        deletesRepair: false,
        replacesDevice: true,
        createsPart: false,
        editsPart: false,
        seesPartCost: false,
        seesPartJournal: false,
      });
    }
  });

  it("l'admin peut tout, un client rien", () => {
    expect(Object.values(repairCapabilities("admin")).every(Boolean)).toBe(true);
    expect(Object.values(repairCapabilities("customer")).some(Boolean)).toBe(false);
  });
});
