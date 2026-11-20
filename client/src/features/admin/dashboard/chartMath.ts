import { addDays } from "@/lib/algiersTime";

// Les calculs des graphiques du tableau de bord (20/11), sans écran : l'échelle, les repères, l'anneau et les
// libellés. Les graphiques sont dessinés à la main en SVG (pas de bibliothèque) : ce fichier est tout ce qu'il faut
// comprendre pour les lire.

// Un point de la série : un jour (à Alger) et ses quatre mesures. Le serveur envoie un point par jour, sans trou.
export type OverviewPoint = { date: string; sales: number; orders: number; profit: number; collected: number };

// Ce que la liste déroulante du grand graphique propose. `money` : en dinars (sinon un nombre de commandes).
export type Metric = "sales" | "orders" | "profit" | "collected";
export const METRICS: { key: Metric; label: string; money: boolean }[] = [
  { key: "sales", label: "Ventes", money: true },
  { key: "orders", label: "Commandes", money: false },
  { key: "profit", label: "Bénéfice", money: true },
  { key: "collected", label: "Encaissé", money: true },
];

export const metricValue = (point: OverviewPoint, metric: Metric): number => point[metric];
export const totalOf = (series: OverviewPoint[], metric: Metric): number => series.reduce((sum, point) => sum + point[metric], 0);

// Le haut de l'échelle : le 1, 2, 5 ou 10 supérieur de l'ordre de grandeur de la plus grande valeur (300 000 donne
// 500 000, 69 000 donne 100 000). Sans rien à montrer, 1 : l'axe existe quand même.
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

// Les repères horizontaux, de 0 à `max`. De l'argent : quatre intervalles. Un nombre de commandes : des repères
// ENTIERS (une demi-commande n'existe pas), donc le premier nombre d'intervalles qui divise `max`.
export function axisTicks(max: number, integer: boolean): number[] {
  const parts = integer ? ([4, 5, 2, 1, 3].find((candidate) => max % candidate === 0) ?? 1) : 4;
  return Array.from({ length: parts + 1 }, (_, index) => (index * max) / parts);
}

// Un montant court pour l'axe : « 250 k », « 1,5 M », avec la virgule française.
export function shortAmount(value: number): string {
  const decimal = (number: number) => String(Math.round(number * 10) / 10).replace(".", ",");
  if (Math.abs(value) >= 1_000_000) return `${decimal(value / 1_000_000)} M`;
  if (Math.abs(value) >= 1_000) return `${decimal(value / 1_000)} k`;
  return String(value);
}

// L'anneau : le contour d'un cercle de circonférence `circumference`, coupé en arcs proportionnels aux valeurs.
// Chaque arc dit sa longueur et où il commence (la somme des précédents), pour `stroke-dasharray` et
// `stroke-dashoffset`. Rien à dessiner quand tout est à zéro.
export function donutSegments(values: number[], circumference: number): { length: number; offset: number }[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return [];
  let offset = 0;
  return values.map((value) => {
    const length = (value / total) * circumference;
    const segment = { length, offset };
    offset += length;
    return segment;
  });
}

// La part de chacun en pourcentage entier (la somme peut faire 99 ou 101 : c'est de l'affichage).
export function percentages(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => (total === 0 ? 0 : Math.round((value / total) * 100)));
}

// Tous les jours nommés sur 7 jours, un sur cinq sur 30 (le dernier, aujourd'hui, l'est toujours).
export const labelEvery = (days: number): number => (days <= 7 ? 1 : 5);

// « ven. 20 » : le jour de la semaine et le numéro. `timeZone: "UTC"` : `date` est un jour, pas un instant, il ne
// doit pas glisser d'un jour selon le fuseau du navigateur.
export function shortDayLabel(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

// « Aujourd'hui », « Hier », sinon « 10/11 ».
export function relativeDayLabel(date: string, today: string): string {
  if (date === today) return "Aujourd'hui";
  if (addDays(date, 1) === today) return "Hier";
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}
