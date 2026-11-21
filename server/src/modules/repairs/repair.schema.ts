import { z } from "zod";
import { replacementTradeInSchema } from "../exchanges/exchange.schema.js";
import { paymentMethodSchema, phoneSchema } from "../orders/order.schema.js";

// Les fiches de réparation (18/11, étape 2). Tous les textes sont bornés : la fiche est saisie au comptoir, mais
// un texte énorme ne doit jamais atteindre la base. Aucun champ pour un code de déverrouillage : Zod ignore ce
// qu'il ne connaît pas, et la fiche n'a de toute façon pas de colonne pour lui.
const spaced = (text: string) => text.replace(/\s+/g, " ");
const short = (min: number, max: number) => z.string().trim().min(min).max(max).transform(spaced);
// Un texte facultatif : vide, c'est « rien » (la fiche garde null).
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((text) => (text === "" ? null : spaced(text)));

const laborPrice = z.number().int().min(0).max(10_000_000);

export const repairBodySchema = z.object({
  fullName: short(3, 80),
  phone: phoneSchema,
  deviceName: short(2, 80),
  deviceColor: optionalText(300).optional(),
  deviceState: optionalText(300).optional(),
  issue: short(3, 500),
  accessories: optionalText(300).optional(),
  laborPrice: laborPrice.optional(),
  // L'article de la vente d'origine : la garantie est recalculée par le serveur, jamais lue du client.
  originItemId: z.number().int().positive().optional(),
  forceOutOfWarranty: z.boolean().optional(),
});
export type RepairInput = z.infer<typeof repairBodySchema>;

export const repairPatchSchema = z.object({
  fullName: short(3, 80).optional(),
  phone: phoneSchema.optional(),
  deviceName: short(2, 80).optional(),
  deviceColor: optionalText(300).optional(),
  deviceState: optionalText(300).optional(),
  issue: short(3, 500).optional(),
  accessories: optionalText(300).optional(),
  // null : on efface la main-d'œuvre (le devis n'est plus fixé).
  laborPrice: laborPrice.nullable().optional(),
  note: optionalText(1000).optional(),
});
export type RepairPatch = z.infer<typeof repairPatchSchema>;

// Les pièces d'une fiche : une quantité de 1 à 100 par ligne.
const lineQuantity = z.number().int().min(1).max(100);
export const repairLineBodySchema = z.object({ partId: z.number().int().positive(), quantity: lineQuantity });
export const repairLinePatchSchema = z.object({ quantity: lineQuantity });
export const repairLineParamsSchema = z.object({ id: z.coerce.number().int().positive(), lineId: z.coerce.number().int().positive() });

// Le moyen de paiement ne sert qu'au Rendu, et seulement s'il y a de l'argent à encaisser (le service tranche).
export const repairStatusBodySchema = z.object({
  status: z.enum(["received", "quote", "in_repair", "ready", "to_return", "returned"]),
  method: paymentMethodSchema.optional(),
});

// Remplacer l'appareil sous garantie (étape 6) : ce que le magasin donne (un seul article, au prix catalogue ou
// négocié ; le prix n'est pas lu pour un même modèle), l'appareil en panne et le moyen de paiement de la différence.
export const replaceBodySchema = z.object({
  method: paymentMethodSchema,
  acceptLimitations: z.boolean().default(false),
  line: z.object({
    sku: z.string().trim().toUpperCase().min(3).max(40),
    unitPrice: z.number().int().min(0).max(10_000_000).optional(),
  }),
  tradeIn: replacementTradeInSchema,
});
export type ReplaceInput = z.infer<typeof replaceBodySchema>;

export const REPAIR_STAGES = ["open", "new", "ongoing", "received", "quote", "in_repair", "ready", "to_return", "returned"] as const;

export const repairListQuerySchema = z.object({
  // « open » : tout sauf les fiches rendues. Les deux onglets de la page (comme « Nouvelles » et « En cours » des
  // commandes) : « new » = les appareils juste reçus, « ongoing » = les autres fiches pas encore rendues.
  stage: z.enum(REPAIR_STAGES).default("open"),
  q: z.string().trim().max(60).default(""),
});
export type RepairListQuery = z.infer<typeof repairListQuerySchema>;

export const warrantyQuerySchema = z
  .object({
    phone: phoneSchema.optional(),
    order: z.coerce.number().int().positive().optional(),
  })
  .refine((query) => query.phone !== undefined || query.order !== undefined, {
    error: "Indiquez le téléphone du client ou le numéro de la commande",
  });
export type WarrantyQuery = z.infer<typeof warrantyQuerySchema>;

// Le suivi public : le numéro et le téléphone dans le corps d'un POST, jamais dans l'URL (qui finit dans les logs).
// Un numéro plus grand qu'un entier PostgreSQL ferait une erreur 500 : il est refusé ici.
export const repairTrackSchema = z.object({
  number: z.coerce.number().int().min(1).max(2_147_483_647),
  phone: phoneSchema,
});

// La réponse du client à son devis (21/11), depuis le suivi : accepter fait passer la fiche En réparation, refuser la
// laisse « À rendre sans réparation ». Même numéro et même téléphone que le suivi.
export const repairDecisionSchema = repairTrackSchema.extend({ decision: z.enum(["accept", "refuse"]) });
export type RepairDecision = z.infer<typeof repairDecisionSchema>["decision"];
