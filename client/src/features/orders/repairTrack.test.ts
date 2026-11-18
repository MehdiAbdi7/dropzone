import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/format";
import { parseTrackNumber, trackPriceText, trackStateText, trackSteps, type RepairTracking } from "./repairTrack";

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
  returnedOn: null,
  steps: [{ status: "received", at: "2026-11-18T10:00:00.000Z" }],
};

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
    expect(trackStateText("quote")).toBe("Un devis vous attend : le magasin vous appelle.");
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
