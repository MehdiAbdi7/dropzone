import { prisma } from "../../config/db.js";
import type { Role } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import { algiersDate } from "../../utils/algiersTime.js";
import { priceReduction } from "../orders/negotiation.js";
import { lockOrder } from "../orders/orderLock.js";
import { amountInWords } from "./amountInWords.js";
import type { InvoiceSettingsInput } from "./invoice.schema.js";
import { invoiceBlocker } from "./invoiceRules.js";

// Les réglages de la facture : une seule ligne (id = 1), créée par la migration.
export async function getInvoiceSettings() {
  return prisma.invoiceSettings.findUniqueOrThrow({ where: { id: 1 } });
}

export async function saveInvoiceSettings(input: InvoiceSettingsInput) {
  return prisma.invoiceSettings.update({ where: { id: 1 }, data: input });
}

// « F-2026-0001 » : une suite continue par année.
export const formatInvoiceNumber = (year: number, number: number) => `F-${year}-${String(number).padStart(4, "0")}`;

// Les mouvements qui sont de l'argent du client (pas les frais de retour, qui sont une perte du magasin).
const PAYMENT_KINDS = ["sale", "pickup", "delivery", "exchange"] as const;

// Ouvrir la facture d'une commande (lot 6). La PREMIÈRE ouverture attribue le numéro, les suivantes le
// rendent tel quel : c'est ce qui rend la suite continue et stable. Tout se fait dans une transaction, sur
// la commande verrouillée : deux ouvertures simultanées ne consomment jamais deux numéros. La facture se
// remplit seule d'après la commande ; elle ne montre jamais le prix d'achat ni le bénéfice.
export async function issueInvoice(id: number, now: Date = new Date(), role?: Role) {
  return prisma.$transaction(async (tx) => {
    await lockOrder(tx, id);
    const order = await tx.order.findUniqueOrThrow({
      where: { id },
      include: {
        items: { orderBy: { id: "asc" } },
        tradeIn: { include: { deviceModel: { select: { brand: true, name: true } } } },
      },
    });
    // Un vendeur n'ouvre que la facture d'une vente ou d'un échange du comptoir (lot 7) : la commande en
    // ligne d'un client porte son nom et son adresse. Refusé avant de prendre un numéro.
    if (role === "seller" && (order.type === "delivery" || order.type === "pickup")) {
      throw new AppError(403, "Accès refusé");
    }
    const blocker = invoiceBlocker(order);
    if (blocker) {
      throw new AppError(409, blocker);
    }

    let { invoiceNumber, invoiceYear, invoiceIssuedAt } = order;
    if (invoiceNumber === null || invoiceYear === null || invoiceIssuedAt === null) {
      invoiceYear = Number(algiersDate(now).slice(0, 4));
      // Une seule requête atomique : « crée la ligne de l'année à 1, ou ajoute 1, et rends la valeur ».
      const [row] = await tx.$queryRaw<{ value: number }[]>`
        INSERT INTO invoice_counters (year, value) VALUES (${invoiceYear}, 1)
        ON CONFLICT (year) DO UPDATE SET value = invoice_counters.value + 1
        RETURNING value`;
      invoiceNumber = row.value;
      invoiceIssuedAt = now;
      await tx.order.update({ where: { id }, data: { invoiceNumber, invoiceYear, invoiceIssuedAt } });
    }

    const settings = await tx.invoiceSettings.findUniqueOrThrow({ where: { id: 1 } });
    const movements = await tx.moneyMovement.findMany({
      where: { orderId: id, kind: { not: "return_fee" } },
      select: { amount: true, method: true, kind: true },
    });
    const paymentMovements = movements.filter((movement) => (PAYMENT_KINDS as readonly string[]).includes(movement.kind));
    const lines = order.items.map((item) => ({
      name: item.name,
      options: item.options,
      condition: item.condition,
      conditionReport: item.conditionReport,
      warrantyMonths: item.warrantyMonths,
      quantity: item.quantity,
      // Le prix catalogue au moment de la commande, le prix accordé, et le total de la ligne.
      listPrice: item.isGift ? 0 : (item.listPrice ?? item.unitPrice),
      unitPrice: item.unitPrice,
      lineTotal: item.unitPrice * item.quantity,
      isGift: item.isGift,
    }));
    // Les prix du magasin sont TTC : la TVA, quand elle est allumée, se sépare du total.
    const excludingTax = Math.round(order.total / (1 + settings.vatRate / 100));

    return {
      number: formatInvoiceNumber(invoiceYear, invoiceNumber),
      year: invoiceYear,
      issuedAt: invoiceIssuedAt,
      shop: {
        name: settings.shopName,
        legalForm: settings.legalForm,
        address: settings.address,
        phones: settings.phones,
        email: settings.email,
        instagram: settings.instagram,
        registerNumber: settings.registerNumber,
        nif: settings.nif,
        nis: settings.nis,
        taxArticle: settings.taxArticle,
        rib: settings.rib,
      },
      order: {
        id: order.id,
        number: order.number,
        dailyNumber: order.dailyNumber,
        businessDate: order.businessDate.toISOString().slice(0, 10),
        type: order.type,
        status: order.status,
        createdAt: order.createdAt,
      },
      customer: {
        fullName: order.fullName,
        phone: order.phone,
        wilaya: order.wilaya,
        commune: order.commune,
        address: order.address,
      },
      // null tant que rien n'est payé (une livraison se paie à la réception).
      payment:
        paymentMovements.length === 0
          ? null
          : {
              methods: [...new Set(paymentMovements.map((movement) => movement.method))],
              paid: movements.reduce((sum, movement) => sum + movement.amount, 0),
            },
      lines,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      total: order.total,
      totalInWords: amountInWords(order.total),
      discount: priceReduction(order.items),
      vat: settings.vatEnabled ? { rate: settings.vatRate, excludingTax, amount: order.total - excludingTax } : null,
      tradeIn: order.tradeIn
        ? {
            modelName: `${order.tradeIn.deviceModel.brand} ${order.tradeIn.deviceModel.name}`,
            color: order.tradeIn.color,
            price: order.tradeIn.price,
          }
        : null,
      difference: order.tradeIn ? order.total - order.tradeIn.price : null,
      limitationsAccepted: order.limitationsAccepted,
      note: order.note,
      warrantyTerms: settings.warrantyTerms,
      footerNote: settings.footerNote,
    };
  });
}
