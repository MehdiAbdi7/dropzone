import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import {
  canDecide,
  parseTrackNumber,
  quoteRows,
  repairSlipAvailable,
  repairSlipRows,
  trackNumberDigits,
  trackPriceText,
  trackSkippedText,
  trackStateText,
  trackSteps,
  trackWarrantyText,
  type RepairTracking,
} from "./repairTrack";

// Le suivi d'une réparation sur /suivi (18/11, étape 4) : le numéro saisi, les phrases, le prix, la frise datée.
const base: RepairTracking = {
  number: 1001,
  deviceName: "iPhone 13",
  deviceColor: null,
  status: "received",
  refused: false,
  underWarranty: false,
  warrantyEndsAt: null,
  price: null,
  quote: null,
  returnedOn: null,
  steps: [{ status: "received", at: "2026-11-18T10:00:00.000Z" }],
};

// Un devis de 13 000 DA : une batterie à 6 000 (deux fois) et 1 000 DA de main-d'œuvre.
const quote = { labor: 1_000, items: [{ name: "Batterie iPhone 13", quantity: 2, unitPrice: 6_000 }], total: 13_000 };
const quoted: RepairTracking = { ...base, status: "quote", price: 13_000, quote, steps: [...base.steps, { status: "quote", at: "2026-11-19T09:00:00.000Z" }] };
const accepted: RepairTracking = { ...quoted, status: "in_repair", steps: [...quoted.steps, { status: "in_repair", at: "2026-11-19T10:30:00.000Z" }] };

// Le champ du numéro (21/11) : « R- » est écrit d'avance et ne s'enlève pas, le client tape seulement les chiffres.
describe("trackNumberDigits", () => {
  it("ne garde que les chiffres : « 1003 », « R-1003 » collé, des espaces", () => {
    expect(trackNumberDigits("1003")).toBe("1003");
    expect(trackNumberDigits("R-1003")).toBe("1003");
    expect(trackNumberDigits(" 10 03 ")).toBe("1003");
    expect(trackNumberDigits("abc")).toBe("");
  });

  it("s'arrête à 10 chiffres (le plus grand entier de la base)", () => {
    expect(trackNumberDigits("12345678901234")).toBe("1234567890");
  });

  it("donne un numéro lisible par parseTrackNumber une fois précédé de R-", () => {
    expect(parseTrackNumber(`R-${trackNumberDigits("1003")}`)).toBe(1003);
    expect(parseTrackNumber(`R-${trackNumberDigits("")}`)).toBeNaN();
  });
});

describe("quoteRows", () => {
  it("détaille chaque pièce (quantité, prix de la ligne), puis la main-d'œuvre à part, puis le total", () => {
    expect(quoteRows(quote)).toEqual({
      lines: [
        { label: "Batterie iPhone 13 × 2", detail: `${formatPrice(6_000)} l'unité`, price: formatPrice(12_000) },
        { label: "Main-d'œuvre", detail: null, price: formatPrice(1_000) },
      ],
      total: formatPrice(13_000),
    });
  });

  it("sans pièce : la main-d'œuvre seule", () => {
    expect(quoteRows({ labor: 2_500, items: [], total: 2_500 }).lines).toEqual([{ label: "Main-d'œuvre", detail: null, price: formatPrice(2_500) }]);
  });

  it("une main-d'œuvre à 0 avec des pièces : la ligne dit « Offerte »", () => {
    const rows = quoteRows({ labor: 0, items: [{ name: "Nappe", quantity: 1, unitPrice: 1_000 }], total: 1_000 });
    expect(rows.lines.at(-1)).toEqual({ label: "Main-d'œuvre", detail: null, price: "Offerte" });
  });

  it("la quantité 1 ne s'écrit pas « × 1 »", () => {
    expect(quoteRows({ labor: 0, items: [{ name: "Nappe", quantity: 1, unitPrice: 1_000 }], total: 1_000 }).lines[0]).toEqual({
      label: "Nappe",
      detail: null,
      price: formatPrice(1_000),
    });
  });
});

describe("canDecide", () => {
  it("le client répond au devis seulement à « Devis à valider », hors garantie, avec un devis", () => {
    expect(canDecide(quoted)).toBe(true);
  });

  it("jamais ailleurs : reçu, accepté, sous garantie, sans détail de devis", () => {
    expect(canDecide(base)).toBe(false);
    expect(canDecide(accepted)).toBe(false);
    expect(canDecide({ ...quoted, underWarranty: true })).toBe(false);
    expect(canDecide({ ...quoted, quote: null })).toBe(false);
  });
});

describe("le bon de réparation", () => {
  it("existe une fois le devis accepté (ou accepté au dépôt) : en réparation, prêt, rendu", () => {
    for (const status of ["in_repair", "ready", "returned"] as const) expect(repairSlipAvailable({ ...accepted, status }), status).toBe(true);
  });

  it("n'existe pas avant : reçu, devis à valider ; ni sous garantie, ni refusé, ni sans détail", () => {
    expect(repairSlipAvailable(base)).toBe(false);
    expect(repairSlipAvailable(quoted)).toBe(false);
    expect(repairSlipAvailable({ ...accepted, underWarranty: true })).toBe(false);
    expect(repairSlipAvailable({ ...accepted, refused: true })).toBe(false);
    expect(repairSlipAvailable({ ...accepted, quote: null })).toBe(false);
  });

  it("dit le numéro, l'appareil, chaque ligne, le total, la date de l'accord et les numéros du magasin", () => {
    const rows = repairSlipRows({ ...accepted, deviceColor: "Bleu" });
    expect(rows.title).toBe("BON DE RÉPARATION");
    expect(rows.number).toBe("R-1001");
    expect(rows.where).toBe("iPhone 13 · Bleu");
    expect(rows.items.map((item) => [item.title, item.price])).toEqual([
      ["2 × Batterie iPhone 13", formatPrice(12_000)],
      ["Main-d'œuvre", formatPrice(1_000)],
    ]);
    expect(rows.shipping).toBeNull();
    expect(rows.total).toBe(formatPrice(13_000));
    expect(rows.payNote).toBe("À payer au magasin, à la remise de l'appareil");
    expect(rows.footer).toContain("07 95 13 19 17");
    expect(rows.footer).toContain("05 50 61 12 57");
    expect(rows.footer).toMatch(/pas une facture/);
  });
});

describe("parseTrackNumber", () => {
  it("lit « R-1001 », « r 1001 » et « 1001 »", () => {
    expect(parseTrackNumber("R-1001")).toBe(1001);
    expect(parseTrackNumber("r 1001")).toBe(1001);
    expect(parseTrackNumber("1001")).toBe(1001);
    expect(parseTrackNumber("  R-1001  ")).toBe(1001);
  });

  it("refuse ce qui n'est pas un numéro", () => {
    expect(parseTrackNumber("abc")).toBeNaN();
    expect(parseTrackNumber("")).toBeNaN();
    expect(parseTrackNumber("0")).toBeNaN();
    expect(parseTrackNumber("R-")).toBeNaN();
    expect(parseTrackNumber("10x1")).toBeNaN();
  });
});

describe("trackStateText", () => {
  it("dit en une phrase ce que le client doit savoir", () => {
    expect(trackStateText("ready")).toBe("Votre appareil est prêt, vous pouvez venir le récupérer.");
    expect(trackStateText("to_return")).toBe("Votre appareil est à récupérer, sans réparation.");
    expect(trackStateText("returned")).toBe("Votre appareil vous a été rendu.");
    // Depuis le 21/11 le client répond lui-même à son devis, ou appelle le magasin pour en parler.
    expect(trackStateText("quote")).toBe("Un devis vous attend : lisez-le ci-dessous, puis acceptez-le ou refusez-le. Vous pouvez aussi appeler le magasin.");
  });

  it("n'ajoute rien quand la frise suffit", () => {
    expect(trackStateText("received")).toBeNull();
    expect(trackStateText("in_repair")).toBeNull();
  });
});

describe("trackPriceText", () => {
  it("sous garantie : gratuit", () => {
    expect(trackPriceText({ ...base, underWarranty: true })).toBe("Sous garantie, gratuit");
  });

  it("devis pas encore fixé", () => {
    expect(trackPriceText(base)).toBe("Le prix vous sera communiqué après le diagnostic.");
  });

  it("devis fixé : ce qu'il y a à payer", () => {
    expect(trackPriceText({ ...base, status: "quote", price: 8_000 })).toBe(`À payer : ${formatPrice(8_000)}`);
    expect(trackPriceText({ ...base, status: "ready", price: 8_000 })).toBe(`À payer : ${formatPrice(8_000)}`);
  });

  it("une réparation gratuite hors garantie : aucun frais", () => {
    expect(trackPriceText({ ...base, status: "ready", price: 0 })).toBe("Aucun frais");
  });

  it("une fois rendue : ce qui a été payé", () => {
    expect(trackPriceText({ ...base, status: "returned", price: 8_000 })).toBe(`Payé : ${formatPrice(8_000)}`);
    expect(trackPriceText({ ...base, status: "returned", price: 0 })).toBe("Aucun frais");
  });
});

describe("trackSteps", () => {
  it("donne la date de chaque étape atteinte et rien pour les autres", () => {
    const steps = trackSteps({
      ...base,
      status: "in_repair",
      steps: [
        { status: "received", at: "2026-11-18T10:00:00.000Z" },
        { status: "quote", at: "2026-11-18T11:00:00.000Z" },
        { status: "in_repair", at: "2026-11-18T12:00:00.000Z" },
      ],
    });
    expect(steps.map((step) => [step.label, step.state, step.date !== null])).toEqual([
      ["Reçu", "done", true],
      ["Devis à valider", "done", true],
      ["En réparation", "current", true],
      ["Prêt", "upcoming", false],
      ["Rendu", "upcoming", false],
    ]);
  });

  it("sous garantie, l'étape Devis est sautée et sans date", () => {
    const steps = trackSteps({ ...base, underWarranty: true, status: "ready", steps: [{ status: "received", at: "2026-11-18T10:00:00.000Z" }, { status: "in_repair", at: "2026-11-18T12:00:00.000Z" }, { status: "ready", at: "2026-11-18T14:00:00.000Z" }] });
    expect(steps[1]).toMatchObject({ label: "Devis à valider", state: "skipped", date: null });
  });

  it("un devis refusé, même rendu, garde sa sortie", () => {
    const steps = trackSteps({
      ...base,
      status: "returned",
      refused: true,
      steps: [
        { status: "received", at: "2026-11-18T10:00:00.000Z" },
        { status: "quote", at: "2026-11-18T11:00:00.000Z" },
        { status: "to_return", at: "2026-11-18T12:00:00.000Z" },
        { status: "returned", at: "2026-11-18T13:00:00.000Z" },
      ],
    });
    expect(steps.map((step) => step.label)).toEqual(["Reçu", "Devis à valider", "À rendre sans réparation", "Rendu"]);
    expect(steps[2].state).toBe("exit");
  });
});

// Relecture finale (étape 4).
describe("trackSkippedText", () => {
  it("dit pourquoi l'étape Devis est sautée, sans jamais parler de garantie quand il n'y en a pas", () => {
    expect(trackSkippedText(true)).toBe("Sans devis (sous garantie)");
    expect(trackSkippedText(false)).toBe("Accepté au dépôt");
  });
});

describe("trackWarrantyText", () => {
  it("sous garantie : la date de fin", () => {
    expect(trackWarrantyText({ underWarranty: true, warrantyEndsAt: "2027-03-01" })).toBe("Sous garantie jusqu'au 01/03/2027");
  });

  it("sinon : hors garantie, sans date", () => {
    expect(trackWarrantyText({ underWarranty: false, warrantyEndsAt: null })).toBe("Hors garantie");
    expect(trackWarrantyText({ underWarranty: false, warrantyEndsAt: "2030-01-01" })).toBe("Hors garantie");
  });
});

describe("parseTrackNumber au-delà du plafond", () => {
  it("refuse un numéro plus grand qu'un entier PostgreSQL", () => {
    expect(parseTrackNumber("2147483647")).toBe(2_147_483_647);
    expect(parseTrackNumber("2147483648")).toBeNaN();
    expect(parseTrackNumber("9999999999")).toBeNaN();
  });
});

describe("la date d'une étape revenue", () => {
  it("n'est montrée que sur les étapes faites, en cours ou de sortie", () => {
    const steps = trackSteps({
      ...base,
      status: "quote",
      steps: [
        { status: "received", at: "2026-11-18T10:00:00.000Z" },
        { status: "quote", at: "2026-11-18T11:00:00.000Z" },
        { status: "in_repair", at: "2026-11-18T12:00:00.000Z" },
      ],
    });
    expect(steps.find((step) => step.label === "En réparation")).toMatchObject({ state: "upcoming", date: null });
  });
});
