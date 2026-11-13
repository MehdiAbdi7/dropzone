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
