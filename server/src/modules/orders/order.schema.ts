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

// Livraison ou réservation au magasin (14/11). Absent : une livraison, comme avant.
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

// La réservation au magasin (14/11) : l'un des deux jours proposés (13/11 : le jour exact, pas
// « demain »), à une heure proposée par le formulaire. Le jour et l'heure sont revérifiés par le
// serveur avec les horaires du magasin (createOrder).
//
// Depuis le 18/11, deux façons de réserver : `two_days` (par défaut, comme avant : un jour et une heure,
// jusqu'à minuit) ou `unlimited` (sans date, contre une avance BaridiMob réglée par le magasin).
const pickupOrderSchema = z
  .object({
    ...orderBase,
    fulfillment: z.literal("pickup"),
    reservationMode: z.enum(["two_days", "unlimited"]).default("two_days"),
    pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choisissez le jour où vous passerez" }).optional(),
    pickupTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Choisissez une heure" }).optional(),
  })
  .superRefine((order, ctx) => {
    if (order.reservationMode !== "two_days") return;
    if (!order.pickupDate) ctx.addIssue({ code: "custom", path: ["pickupDate"], message: "Choisissez le jour où vous passerez" });
    if (!order.pickupTime) ctx.addIssue({ code: "custom", path: ["pickupTime"], message: "Choisissez une heure" });
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
  // Un numéro plus grand qu'un entier PostgreSQL ferait une erreur 500 au lieu d'un 404.
  number: z.coerce.number().int().min(1).max(2_147_483_647),
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
  "collected",
  "returned",
]);

export const adminOrderListQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  // Les onglets de la page Commandes (14/11) : livraisons, retraits, ventes au magasin.
  type: z.enum(["delivery", "pickup", "in_store"]).optional(),
  // `stage` sépare les deux onglets des livraisons : `new` = à confirmer par téléphone, `ongoing` =
  // confirmée, expédiée ou livrée (l'argent n'est pas encore arrivé).
  stage: z.enum(["new", "ongoing"]).optional(),
  q: z.string().trim().min(1).max(80).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type AdminOrderListQuery = z.infer<typeof adminOrderListQuerySchema>;

// Les prix négociés (16/11, lot 3) : une ligne de la commande par son `id`, son nouveau prix accordé.
// Les limites et les cadeaux sont vérifiés par `applyPrices`, qui répond par un message précis.
const negotiatedPricesSchema = z
  .array(z.object({ id: z.number().int().positive(), unitPrice: z.number() }))
  .max(30)
  .optional();

export const statusBodySchema = z.object({ status: orderStatusSchema, prices: negotiatedPricesSchema });

// Les moyens de paiement au comptoir (14/11), Espèces par défaut dans le back-office.
export const paymentMethodSchema = z.enum(["cash", "baridimob", "ccp", "card", "transfer"], {
  error: "Moyen de paiement inconnu",
});
export const pickupBodySchema = z.object({ method: paymentMethodSchema, prices: negotiatedPricesSchema });
// Encaisser une livraison (17/11, lot 4) : le moyen par lequel l'argent est arrivé (CCP, BaridiMob…).
export const collectBodySchema = z.object({ method: paymentMethodSchema });
// Un colis qui revient (17/11) : les frais que DropZone paie à la société de livraison, en dinars
// entiers (0 si elle ne facture rien), et le moyen par lequel il les paie.
export const returnBodySchema = z.object({
  fee: z.number().int({ error: "Un montant en dinars, sans virgule" }).min(0).max(10_000_000),
  method: paymentMethodSchema,
});

// Modifier une commande (15/11, lot 2). Une ligne existante se désigne par son `id`, un nouvel
// article par son `sku` ; une ligne payante qui n'est pas listée est retirée. Les cadeaux ne sont
// jamais envoyés : ils restent tels quels (voir editOrder).
const editedQuantity = z.number().int().min(1).max(10);
const editedPrice = z.number().int().min(0).max(100_000_000);
const editLineSchema = z.union([
  z.object({ id: z.number().int().positive(), quantity: editedQuantity, unitPrice: editedPrice }),
  z.object({ sku: z.string().trim().toUpperCase().min(3).max(40), quantity: editedQuantity, unitPrice: editedPrice }),
]);
export const editOrderBodySchema = z.object({
  lines: z.array(editLineSchema).min(1, { error: "Une commande garde au moins un article" }).max(30),
  method: paymentMethodSchema.optional(),
  fullName: z.string().trim().min(3).max(80).optional(),
  phone: phoneSchema.optional(),
  note: z.string().trim().max(500).nullable().optional(),
});
export type EditOrderInput = z.infer<typeof editOrderBodySchema>;

// La vente au magasin (16/11, lot 3) : le vendeur saisit le ticket au comptoir. `unitPrice` est le
// prix accordé ; absent, c'est le prix catalogue. Nom, téléphone et moyen de paiement obligatoires.
// Les lignes d'un ticket saisi au back-office : la vente au magasin et la commande prise par téléphone.
const ticketLinesSchema = z
  .array(
    z.object({
      sku: z.string().trim().toUpperCase().min(3).max(40),
      quantity: z.number().int().min(1).max(10),
      unitPrice: z.number().int().min(0).max(10_000_000).optional(),
    }),
  )
  .min(1, { error: "Le ticket est vide" })
  .max(30);

export const storeSaleBodySchema = z.object({
  fullName: z.string().trim().min(3, { error: "Le nom et le prénom du client (3 caractères au minimum)" }).max(80),
  phone: phoneSchema,
  method: paymentMethodSchema,
  note: z.string().trim().max(500).optional(),
  acceptLimitations: z.boolean().default(false),
  lines: ticketLinesSchema,
});
export type StoreSaleInput = z.infer<typeof storeSaleBodySchema>;

// La commande prise par téléphone (19/11) : le vendeur saisit une livraison pour un client qui appelle. Pas de
// `cartHash` (personne n'a vu de récapitulatif à l'écran) ; `acceptLimitations` dit que le client a été informé de
// vive voix. `shippingFee` : des frais saisis à la main, absents le serveur les calcule comme pour le site.
const phoneOrderBase = {
  fullName: z.string().trim().min(3, { error: "Le nom et le prénom du client (3 caractères au minimum)" }).max(80),
  phone: phoneSchema,
  note: z.string().trim().max(500).optional(),
  acceptLimitations: z.boolean().default(false),
  lines: ticketLinesSchema,
};

const phoneDeliverySchema = z.object({
  ...phoneOrderBase,
  fulfillment: z.literal("delivery"),
  wilaya: z.enum(WILAYAS, { error: "Wilaya inconnue" }),
  commune: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(200),
  shippingFee: z.number().int({ error: "Un montant en dinars, sans virgule" }).min(0).max(100_000).optional(),
});

export const phoneOrderBodySchema = z.discriminatedUnion("fulfillment", [phoneDeliverySchema]);
export type PhoneOrderInput = z.infer<typeof phoneOrderBodySchema>;
