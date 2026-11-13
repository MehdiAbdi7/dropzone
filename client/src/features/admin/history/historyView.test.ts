import { describe, expect, it } from "vitest";
import { historyHref, parseHistoryView } from "./historyView";

// La vue de la page Historique vit dans l'adresse : recharger ou revenir en arrière garde la période.
const today = "2026-11-14";
const parse = (search: string) => parseHistoryView(new URLSearchParams(search), today);

describe("parseHistoryView", () => {
  it("par défaut : le mois d'aujourd'hui, tous les types", () => {
    expect(parse("")).toEqual({ kind: "month", anchor: today, type: undefined });
  });

  it("lit la période, le jour d'ancrage et le type", () => {
    expect(parse("p=day&d=2026-10-03&type=pickup")).toEqual({ kind: "day", anchor: "2026-10-03", type: "pickup" });
    expect(parse("p=year&d=2025-02-01")).toMatchObject({ kind: "year", anchor: "2025-02-01" });
  });

  it("retombe sur les valeurs par défaut quand l'adresse est truquée ou mal écrite", () => {
    expect(parse("p=semaine&d=pas-une-date&type=autre")).toEqual({ kind: "month", anchor: today, type: undefined });
    expect(parse("d=2026-02-30").anchor).toBe(today);
  });
});

describe("historyHref", () => {
  it("écrit l'adresse de la vue, sans type quand il n'y en a pas", () => {
    expect(historyHref({ kind: "month", anchor: "2026-11-14", type: undefined })).toBe(
      "/admin/historique?p=month&d=2026-11-14",
    );
    expect(historyHref({ kind: "day", anchor: "2026-11-14", type: "delivery" })).toBe(
      "/admin/historique?p=day&d=2026-11-14&type=delivery",
    );
  });

  it("se relit à l'identique", () => {
    const view = { kind: "year" as const, anchor: "2026-01-01", type: "in_store" as const };
    expect(parseHistoryView(new URL(`http://x${historyHref(view)}`).searchParams, today)).toEqual(view);
  });
});
