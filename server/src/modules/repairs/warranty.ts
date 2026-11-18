// La garantie d'un appareil (18/11, étape 2). Les jours sont des textes « AAAA-MM-JJ » comme dans
// `utils/algiersTime.ts`, qui reste la seule source du « jour d'Alger » : ici, aucune heure, aucun fuseau.

const lastDayOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// Le dernier jour de garantie : le jour de la vente plus `months` mois, ramené au dernier jour du mois d'arrivée
// quand il n'existe pas (31/08 + 6 mois = 28/02). Une date de fin explicite (étape 6 : l'appareil de remplacement
// garde le reste de l'ancienne garantie) l'emporte sur le calcul.
export function warrantyEndDate(saleDay: string, months: number, explicitEnd?: string | null): string {
  if (explicitEnd) return explicitEnd;
  const [year, month, day] = saleDay.split("-").map(Number);
  const target = month - 1 + months;
  const endYear = year + Math.floor(target / 12);
  const endMonth = ((target % 12) + 12) % 12;
  const endDay = Math.min(day, lastDayOfMonth(endYear, endMonth));
  return `${endYear}-${String(endMonth + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
}

// Sous garantie jusqu'à la fin du dernier jour, inclus : le lendemain, c'est fini. Sans date de fin, jamais.
export function isUnderWarranty(endDate: string | null, today: string): boolean {
  return endDate !== null && today <= endDate;
}

