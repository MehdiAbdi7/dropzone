import { z } from "zod";
import { WILAYAS } from "../../config/wilayas.js";
import { paginationQuery } from "../../utils/pagination.js";

// Le client n'envoie que des SKU et des quantités : jamais de prix.
const cartItemsSchema = z
  .array(
    z.object({
      sku: z.string().trim().toUpperCase().min(3).max(40),
      quantity: z.number().int().min(1).max(10),
    }),
  )
  .min(1, { error: "Le panier est vide" })
  .max(30, { error: "30 articles au maximum" });
export type CartItemInput = z.infer<typeof cartItemsSchema>[number];

// Livraison ou retrait au magasin (14/11). Absent : une livraison, comme avant.
const fulfillmentSchema = z.enum(["delivery", "pickup"]).default("delivery");
export type Fulfillment = z.infer<typeof fulfillmentSchema>;

// L'aperçu connaît le mode de réception : un retrait n'a pas de frais de livraison.
export const previewBodySchema = z.object({ items: cartItemsSchema, fulfillment: fulfillmentSchema });

// Un numéro algérien : 10 chiffres commençant par 0 (mobile 05, 06, 07 ou fixe 02 à 04).
export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(/^0[2-7]\d{8}$/, { error: "Numéro de téléphone invalide" }));

// Ce que toute commande du site envoie, livraison ou retrait.
const orderBase = {
  items: cartItemsSchema,
  fullName: z.string().trim().min(3).max(80),
  phone: phoneSchema,
  note: z.string().trim().max(500).optional(),
  // L'empreinte renvoyée par l'aperçu du panier (voir priceCart).
  cartHash: z.string().regex(/^[a-f0-9]{64}$/, { error: "Récapitulatif manquant, rechargez la page" }),
  // Loi 18-05, art. 12 : la confirmation explicite, case non cochée par défaut.
  acceptTerms: z.literal(true, { error: "Vous devez accepter les conditions générales de vente" }),
  acceptLimitations: z.boolean().default(false),
};

const deliveryOrderSchema = z.object({
  ...orderBase,
  fulfillment: z.literal("delivery"),
  wilaya: z.enum(WILAYAS, { error: "Wilaya inconnue" }),
  commune: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(200),
});

// Le retrait au magasin (14/11) : aujourd'hui ou demain, à une heure proposée par le formulaire.
// L'heure est revérifiée par le serveur avec les horaires du magasin (createOrder).
const pickupOrderSchema = z.object({
  ...orderBase,
  fulfillment: z.literal("pickup"),
  pickupDay: z.enum(["today", "tomorrow"], { error: "Choisissez aujourd'hui ou demain" }),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Choisissez une heure" }),
});

// Sans `fulfillment`, la commande est une livraison : l'ancien formulaire continue de marcher.
export const createOrderSchema = z.preprocess(
  (body) =>
    body && typeof body === "object" && (body as { fulfillment?: unknown }).fulfillment === undefined
      ? { ...body, fulfillment: "delivery" }
      : body,
  z.discriminatedUnion("fulfillment", [deliveryOrderSchema, pickupOrderSchema]),
);
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// Le numéro et le téléphone voyagent dans le corps, jamais dans l'URL (qui finit dans les logs).
export const trackOrderSchema = z.object({
  number: z.coerce.number().int().min(1),
  phone: phoneSchema,
});

export const orderNumberParamsSchema = z.object({ number: z.coerce.number().int().min(1) });

const orderStatusSchema = z.enum([
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "reserved",
  "picked_up",
  "expired",
]);

export const adminOrderListQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  q: z.string().trim().min(1).max(80).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

export const statusBodySchema = z.object({ status: orderStatusSchema });

// Les moyens de paiement au comptoir (14/11), Espèces par défaut dans le back-office.
export const paymentMethodSchema = z.enum(["cash", "baridimob", "ccp", "card", "transfer"], {
  error: "Moyen de paiement inconnu",
});
export const pickupBodySchema = z.object({ method: paymentMethodSchema });
