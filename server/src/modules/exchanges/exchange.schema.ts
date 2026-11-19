import { z } from "zod";
import { paymentMethodSchema, phoneSchema } from "../orders/order.schema.js";
import { checkRefurbishedSheet, labelRecord, sheetFields } from "../products/product.schema.js";

// Les échanges (lot 5, 15/11) : le client rend un téléphone et en prend un autre.

// Le prix de reprise est saisi à la main : le magasin décide ce qu'il donne au client pour son
// téléphone, en dinars entiers. Aucun prix n'est calculé ni suggéré.
const tradeInPrice = z.number({ error: "Saisissez le prix de reprise, en dinars" }).int({ error: "Un montant en dinars, sans virgule" }).min(0).max(10_000_000);

// Le téléphone du client : un modèle de notre catalogue (obligatoire), sa couleur, son prix de reprise et
// la fiche d'état complète de l'affaire, la même que celle d'un appareil reconditionné du catalogue.
export const tradeInSchema = z
  .object({
    deviceModelId: z.number().int().positive({ error: "Choisissez le modèle du téléphone repris" }),
    color: z.string().trim().min(1, { error: "Choisissez la couleur" }).max(60),
    price: tradeInPrice,
    // Le stockage et les autres options de la variante (« Stockage » : « 256 Go »).
    options: labelRecord(60).default({}),
    ...sheetFields,
  })
  .superRefine((tradeIn, ctx) => checkTradeInSheet(tradeIn, ctx));
export type TradeInInput = z.infer<typeof tradeInSchema>;

// L'appareil en panne laissé par un remplacement sous garantie (atelier, étape 6) : la même fiche d'état qu'une
// reprise, SANS prix. Son prix de reprise est 0 DA, fixé par le service : le magasin a déjà payé l'appareil donné.
export const replacementTradeInSchema = z
  .object({
    deviceModelId: z.number().int().positive({ error: "Choisissez le modèle de l'appareil en panne" }),
    color: z.string().trim().min(1, { error: "Choisissez la couleur" }).max(60),
    options: labelRecord(60).default({}),
    ...sheetFields,
  })
  .superRefine((tradeIn, ctx) => checkTradeInSheet(tradeIn, ctx));
export type ReplacementTradeInInput = z.infer<typeof replacementTradeInSchema>;

// Une reprise est toujours une affaire : sa boîte est dite, ses pièces sont cohérentes, sa garantie est dite.
// La même règle à l'échange et à la modification de la fiche avant la mise en vente.
function checkTradeInSheet(tradeIn: Parameters<typeof checkRefurbishedSheet>[0] & { warrantyMonths: number | null }, ctx: z.RefinementCtx) {
  checkRefurbishedSheet(tradeIn, ctx);
  if (tradeIn.warrantyMonths === null) {
    ctx.addIssue({ code: "custom", path: ["warrantyMonths"], message: "Indiquez la garantie de l'affaire, en mois" });
  }
}

// Modifier la fiche d'une reprise avant sa mise en vente (18/11) : le téléphone a été remis en état (batterie
// neuve), la fiche le dit, et les frais de remise en état s'ajoutent à son prix d'achat. Le modèle et le prix
// de reprise ne changent pas.
export const updateTradeInBodySchema = z
  .object({
    color: z.string().trim().min(1, { error: "Choisissez la couleur" }).max(60),
    options: labelRecord(60).default({}),
    repairCost: z
      .number({ error: "Saisissez les frais de remise en état, en dinars (0 s'il n'y en a pas)" })
      .int({ error: "Un montant en dinars, sans virgule" })
      .min(0)
      .max(10_000_000)
      .default(0),
    ...sheetFields,
  })
  .superRefine((tradeIn, ctx) => checkTradeInSheet(tradeIn, ctx));
export type UpdateTradeInInput = z.infer<typeof updateTradeInBodySchema>;

// Ce que le magasin donne : les lignes d'un ticket du comptoir (`unitPrice` = prix accordé, absent =
// prix catalogue). Un seul téléphone repris par échange (un contre un), le client est obligatoire.
export const exchangeBodySchema = z.object({
  fullName: z.string().trim().min(3, { error: "Le nom et le prénom du client (3 caractères au minimum)" }).max(80),
  phone: phoneSchema,
  method: paymentMethodSchema,
  note: z.string().trim().max(500).optional(),
  acceptLimitations: z.boolean().default(false),
  lines: z
    .array(
      z.object({
        sku: z.string().trim().toUpperCase().min(3).max(40),
        quantity: z.number().int().min(1).max(10),
        unitPrice: z.number().int().min(0).max(10_000_000).optional(),
      }),
    )
    .min(1, { error: "Choisissez ce que le magasin donne" })
    .max(30),
  tradeIn: tradeInSchema,
});
export type ExchangeInput = z.infer<typeof exchangeBodySchema>;

export const tradeInListQuerySchema = z.object({
  // « pending » : les reprises à mettre en vente (par défaut) ; « listed » : celles déjà en vente.
  status: z.enum(["pending", "listed"]).default("pending"),
});

// Mettre en vente : le prix de revente, fixé par l'admin. Le prix de reprise reste le prix d'achat.
export const publishTradeInBodySchema = z.object({
  price: z.number({ error: "Saisissez le prix de revente, en dinars" }).int({ error: "Un montant en dinars, sans virgule" }).min(0).max(10_000_000),
});
