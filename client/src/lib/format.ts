import { OPTION_ORDER } from "@/config/catalog";
import type { Options } from "@/types/api";

const priceFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

// 189000 → « 189 000 DA ». Les prix sont des dinars entiers, calculés par le serveur.
export function formatPrice(value: number): string {
  return `${priceFormat.format(value)} DA`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Algiers",
  }).format(new Date(value));
}

// Les paires d'un objet dans l'ordre voulu ; les clés inconnues viennent après.
export function orderedEntries(record: Options, order: string[]): [string, string][] {
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? order.length : index;
  };
  return Object.entries(record).sort(([a], [b]) => rank(a) - rank(b));
}

// { Couleur: "Noir", Stockage: "256 Go" } → « 256 Go, Noir »
export function formatOptions(options: Options): string {
  return orderedEntries(options, OPTION_ORDER)
    .map(([, value]) => value)
    .join(", ");
}
