import { z } from "zod";

const MAX_DAYS = 366;
const DAY = 24 * 60 * 60 * 1000;

// Un vrai jour « AAAA-MM-JJ » : « 2026-02-30 » a le bon format mais n'existe pas, « 2026-13-01 »
// non plus. Une seule règle, sans `.regex()` séparé : avec Zod 4, une règle `.refine()` s'exécute
// même quand la précédente a échoué, et `toISOString()` lève une RangeError sur une date invalide
// (erreur 500 au lieu de 400).
function isRealDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const day = z.string().refine(isRealDay, { error: "Une date qui existe, au format AAAA-MM-JJ" });

// L'historique d'une période (15/11, lot 2) : de `from` à `to`, jours inclus, un an au plus.
export const historyQuerySchema = z
  .object({
    from: day,
    to: day,
    type: z.enum(["delivery", "pickup", "in_store"]).optional(),
    q: z.string().trim().min(1).max(80).optional(),
  })
  .superRefine((value, ctx) => {
    const span = (Date.parse(`${value.to}T00:00:00Z`) - Date.parse(`${value.from}T00:00:00Z`)) / DAY;
    if (span < 0) {
      ctx.addIssue({ code: "custom", path: ["to"], message: "La fin est avant le début" });
    } else if (span + 1 > MAX_DAYS) {
      ctx.addIssue({ code: "custom", path: ["to"], message: `Une période dure ${MAX_DAYS} jours au plus` });
    }
  });
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
