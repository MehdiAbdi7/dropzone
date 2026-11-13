import { z } from "zod";

// Des dinars entiers, jamais négatifs.
const amount = z.number().int({ error: "Un montant en dinars, sans virgule" }).min(0).max(100_000_000);

export const openCashSchema = z.object({ openingFloat: amount });
export const closeCashSchema = z.object({ countedCash: amount });
