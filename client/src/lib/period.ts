// Les périodes de la page Historique (15/11, lot 2). Un jour est un texte « AAAA-MM-JJ », jamais
// un instant : le fuseau du téléphone ne doit pas le faire glisser d'un jour. Tous les calculs
// passent donc par des dates UTC.

export type PeriodKind = "day" | "month" | "year";

const toDate = (day: string) => new Date(`${day}T00:00:00Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

// Le nombre de jours du mois de `year`, `month` (1 à 12) : le jour 0 du mois suivant.
const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// De quel jour à quel jour (inclus) va la période qui contient `anchor`.
export function periodRange(kind: PeriodKind, anchor: string): { from: string; to: string } {
  const [year, month] = anchor.split("-").map(Number);
  if (kind === "day") return { from: anchor, to: anchor };
  if (kind === "month") {
    const mm = String(month).padStart(2, "0");
    return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(daysInMonth(year, month)).padStart(2, "0")}` };
  }
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

// La période d'avant (−1) ou d'après (+1). Un mois ou une année qui n'a pas le même jour (31 mars
// → février, 29 février → année suivante) retombe sur le dernier jour qui existe.
export function shiftPeriod(kind: PeriodKind, anchor: string, step: -1 | 1): string {
  if (kind === "day") {
    const date = toDate(anchor);
    date.setUTCDate(date.getUTCDate() + step);
    return toDay(date);
  }
  const [year, month, dayOfMonth] = anchor.split("-").map(Number);
  const target = kind === "month" ? { year, month: month + step } : { year: year + step, month };
  const normalized = new Date(Date.UTC(target.year, target.month - 1, 1));
  const y = normalized.getUTCFullYear();
  const m = normalized.getUTCMonth() + 1;
  const d = Math.min(dayOfMonth, daysInMonth(y, m));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// « Samedi 14 novembre 2026 », « Novembre 2026 » ou « 2026 ».
export function periodLabel(kind: PeriodKind, anchor: string): string {
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(toDate(anchor));
  if (kind === "day") return upperFirst(format({ weekday: "long", day: "numeric", month: "long", year: "numeric" }));
  if (kind === "month") return upperFirst(format({ month: "long", year: "numeric" }));
  return format({ year: "numeric" });
}
