import { z } from "zod";

const MAX_DAYS = 366;
const DAY = 24 * 60 * 60 * 1000;

// Un vrai jour « AAAA-MM-JJ » : « 2026-02-30 » a le bon format mais n'existe pas.
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Date au format AAAA-MM-JJ" })
  .refine((value) => new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value, {
    error: "Cette date n'existe pas",
  });

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
