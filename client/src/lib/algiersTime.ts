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

// Le formulaire propose toujours deux jours de retrait (13/11). Les stories d'affaires sortent
// le soir : un client doit pouvoir réserver la nuit. On prend donc les deux prochains jours qui
// ont encore un créneau : aujourd'hui et demain en journée, demain et après-demain une fois le
// magasin fermé, et un jour de fermeture est sauté plutôt que proposé grisé. Chercher sur
// 7 jours suffit : il y a au plus 6 jours de fermeture par semaine.
const PICKUP_DAY_COUNT = 2;
const SEARCH_DAYS = 7;

export function pickupDays(hours: StoreHours, now: Date): string[] {
  const today = algiersDate(now);
  const days: string[] = [];
  for (let offset = 0; offset < SEARCH_DAYS && days.length < PICKUP_DAY_COUNT; offset += 1) {
    const day = addDays(today, offset);
    if (pickupSlots(hours, day, now).length > 0) days.push(day);
  }
  return days;
}

// Comment écrire un jour de retrait : le nom du jour d'abord (« Samedi »), la date dessous, et
// « Aujourd'hui » ou « Demain » seulement quand c'est vrai. Pas de copie côté serveur : ce texte
// ne sert qu'à l'affichage. `timeZone: "UTC"` : `date` est un jour, pas un instant, il ne doit pas
// glisser d'un jour selon le fuseau du téléphone.
const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function describePickupDay(date: string, today: string) {
  const noon = new Date(`${date}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("fr-FR", { ...options, timeZone: "UTC" }).format(noon);
  return {
    weekday: upperFirst(format({ weekday: "long" })),
    date: format({ day: "numeric", month: "long" }),
    relative: date === today ? "Aujourd'hui" : date === addDays(today, 1) ? "Demain" : null,
  };
}
