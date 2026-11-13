// Le créneau d'un retrait en français (14/11) : « dimanche 15 novembre à 15h30 ».
// Le jour arrive en texte (« 2026-11-15 ») ; il est lu et écrit en UTC pour qu'aucun fuseau de
// navigateur ne le fasse glisser à la veille.
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function pickupLabel(pickupDate: string, pickupTime: string): string {
  return `${DAY.format(new Date(`${pickupDate}T00:00:00Z`))} à ${pickupTime.replace(":", "h")}`;
}
