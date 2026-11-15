import type { Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { applyPrices, PriceError } from "./negotiation.js";
import { priceCart } from "./order.service.js";

// Le ticket du comptoir, partagé par la vente au magasin (lot 3) et l'échange (lot 5) : le calcul est
// celui du site (`priceCart` : cadeaux d'une affaire, stock, limitations), puis les prix accordés
// par le vendeur. Sous la limite d'un entier de 32 bits de la base, avec de la marge pour les sommes.
export const MAX_TOTAL = 2_000_000_000;

export type TicketLine = { sku: string; quantity: number; unitPrice?: number };

// Vérifie le ticket et applique les prix accordés : un prix absent garde le prix catalogue. Les
// lignes du panier n'ont pas encore d'id : leur position en tient lieu pour `applyPrices`.
export async function priceTicket(tx: Tx, lines: TicketLine[], acceptLimitations: boolean) {
  const cart = await priceCart(tx, lines.map(({ sku, quantity }) => ({ sku, quantity })), "pickup");
  if (!cart.canOrder) {
    throw new AppError(409, "Le ticket contient un article indisponible ou une quantité trop grande", {
      unavailable: cart.unavailable,
      problems: cart.lines.filter((line) => line.problem).map((line) => ({ sku: line.sku, problem: line.problem })),
    });
  }
  if (cart.limitations.length > 0 && !acceptLimitations) {
    throw new AppError(400, "Le client doit accepter les limitations des appareils reconditionnés du ticket");
  }

  const requested = new Map<string, number>();
  for (const line of lines) {
    if (line.unitPrice === undefined) continue;
    if (requested.has(line.sku) && requested.get(line.sku) !== line.unitPrice) {
      throw new AppError(400, "Un article ne peut avoir qu'un seul prix sur le ticket");
    }
    requested.set(line.sku, line.unitPrice);
  }
  let priced;
  try {
    priced = applyPrices(
      cart.lines.map((line, index) => ({
        id: index,
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        listPrice: null,
        isGift: line.isGift,
      })),
      cart.lines.flatMap((line, index) =>
        !line.isGift && requested.has(line.sku) ? [{ id: index, unitPrice: requested.get(line.sku) as number }] : [],
      ),
    );
  } catch (error) {
    if (error instanceof PriceError) throw new AppError(400, error.message);
    throw error;
  }
  if (priced.subtotal > MAX_TOTAL) {
    throw new AppError(400, "Le total du ticket est trop élevé");
  }
  return { cart, priced };
}

// Les lignes de commande du ticket : le prix catalogue de chaque ligne payante, et qui a accordé le
// prix quand il diffère. `costs` : le prix d'achat du moment, figé sur chaque ligne (le bénéfice passé
// ne change jamais).
export function ticketItems(
  { cart, priced }: Awaited<ReturnType<typeof priceTicket>>,
  costs: Map<string, number | null>,
  userId: number,
) {
  return cart.lines.map((line, index) => {
    const priceLine = priced.lines[index];
    const listPrice = line.isGift ? null : (priceLine.listPrice ?? priceLine.unitPrice);
    return {
      productId: line.productId,
      sku: line.sku,
      name: line.name,
      options: line.options ?? {},
      condition: line.condition,
      conditionReport: line.conditionReport,
      warrantyMonths: line.warrantyMonths,
      unitPrice: priceLine.unitPrice,
      listPrice,
      grantedById: listPrice !== null && listPrice !== priceLine.unitPrice ? userId : null,
      quantity: line.quantity,
      isGift: line.isGift,
      unitCost: costs.get(line.sku) ?? null,
    };
  });
}
