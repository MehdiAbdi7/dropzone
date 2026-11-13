// L'heure d'Alger et les créneaux de retrait au magasin (14/11). COPIE de
// server/src/utils/algiersTime.ts : le formulaire propose exactement ce que l'API acceptera.
// Le test server/tests/copiesDuFront.test.ts échoue si les deux copies se contredisent.
//
// L'Algérie est à UTC+1 toute l'année, sans heure d'été : un décalage constant suffit. Les
// jours sont manipulés en texte « AAAA-MM-JJ ».

const ALGIERS_OFFSET_MS = 60 * 60 * 1000;
const SLOT_MINUTES = 30;
// Un créneau du jour n'est proposé qu'à au moins 30 minutes de l'heure actuelle.
const MIN_NOTICE_MINUTES = 30;

export type StoreHours = { openingTime: string; closingTime: string; closedDays: number[] };

// Le jour à Alger d'un instant : « 2026-11-13 ».
export function algiersDate(now: Date): string {
  return new Date(now.getTime() + ALGIERS_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const utc = new Date(`${date}T00:00:00Z`);
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};
const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Les heures de retrait proposées pour `date` : toutes les 30 minutes, de l'ouverture incluse à
// la fermeture exclue. Rien un jour de fermeture ou un jour passé ; aujourd'hui, seulement les
// créneaux à au moins 30 minutes de maintenant.
export function pickupSlots(hours: StoreHours, date: string, now: Date): string[] {
  const today = algiersDate(now);
  if (date < today) return [];
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  if (hours.closedDays.includes(weekday)) return [];

  const local = new Date(now.getTime() + ALGIERS_OFFSET_MS);
  const earliest = date === today ? local.getUTCHours() * 60 + local.getUTCMinutes() + MIN_NOTICE_MINUTES : 0;
  const slots: string[] = [];
  for (let minutes = toMinutes(hours.openingTime); minutes < toMinutes(hours.closingTime); minutes += SLOT_MINUTES) {
    if (minutes >= earliest) slots.push(toTime(minutes));
  }
  return slots;
}
