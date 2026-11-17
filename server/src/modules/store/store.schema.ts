import { z } from "zod";

// Une heure à la demi-heure : « 09:00 », « 19:30 ». Les créneaux de retrait sont de 30 minutes.
const halfHour = z.string().regex(/^([01]\d|2[0-3]):[03]0$/, { error: "Une heure à la demi-heure, par exemple 09:00 ou 19:30" });

export const storeHoursSchema = z
  .object({
    openingTime: halfHour,
    closingTime: halfHour,
    // 0 = dimanche … 6 = samedi, comme Date.getUTCDay().
    closedDays: z
      .array(z.number().int().min(0).max(6))
      .max(6)
      .refine((days) => new Set(days).size === days.length, { error: "Un jour est en double" }),
  })
  .refine((hours) => hours.openingTime < hours.closingTime, {
    error: "La fermeture doit être après l'ouverture",
    path: ["closingTime"],
  });

// L'avance de la réservation illimitée et le numéro BaridiMob (18/11), réglés par l'admin. Avance 0 ou numéro
// vide : l'offre est coupée, le formulaire de commande ne la propose pas.
export const reservationSettingsSchema = z.object({
  advance: z
    .number({ error: "Saisissez l'avance en dinars (0 pour couper l'offre)" })
    .int({ error: "Un montant en dinars, sans virgule" })
    .min(0)
    .max(10_000_000),
  baridiNumber: z.string().trim().max(40, { error: "40 caractères au plus" }),
});
export type ReservationSettings = z.infer<typeof reservationSettingsSchema>;
