import type { PeriodKind } from "@/lib/period";
import type { OrderType } from "@/types/api";

// La vue de la page Historique (15/11) : quelle période, autour de quel jour, quel type de
// commande. Elle vit dans l'adresse (`?p=month&d=2026-11-14&type=pickup`) : recharger la page
// ou revenir en arrière retrouve la même vue, et un lien peut la partager.

export type HistoryView = { kind: PeriodKind; anchor: string; type: OrderType | undefined };

const KINDS: PeriodKind[] = ["day", "month", "year"];
const TYPES: OrderType[] = ["delivery", "pickup", "in_store"];

// Un vrai jour « AAAA-MM-JJ » : « 2026-02-30 » a le bon format mais n'existe pas.
const isRealDay = (value: string | null): value is string =>
  value !== null &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

// Une adresse truquée ou périmée ne casse pas la page : on retombe sur le mois en cours.
export function parseHistoryView(params: { get(name: string): string | null }, today: string): HistoryView {
  const kind = params.get("p");
  const anchor = params.get("d");
  const type = params.get("type");
  return {
    kind: KINDS.includes(kind as PeriodKind) ? (kind as PeriodKind) : "month",
    anchor: isRealDay(anchor) ? anchor : today,
    type: TYPES.includes(type as OrderType) ? (type as OrderType) : undefined,
  };
}

export function historyHref(view: HistoryView): string {
  const search = new URLSearchParams({ p: view.kind, d: view.anchor });
  if (view.type) search.set("type", view.type);
  return `/admin/historique?${search}`;
}
