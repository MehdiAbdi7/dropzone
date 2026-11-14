// La remise à zéro des commandes et de l'historique (demande de Mehdi : « quand je finis les tests,
// un script qui efface tout ça »). À lancer une fois les essais finis, avant la vraie mise en service.
// Utilisé par `npm run orders:reset`.
//
// Efface : les commandes et leurs articles, les mouvements d'argent (encaissements, frais de retour),
// les traces de modification, les journées de caisse et leurs réouvertures, les numéros du jour.
// Ne touche pas : catalogue, comptes, listes, horaires du magasin.
// Rejouable : un deuxième passage ne change rien.
import { type Tx } from "../../config/db.js";
import { restockItems } from "../../modules/orders/reservations.js";

export type ResetReport = {
  orders: number;
  movements: number;
  events: number;
  cashDays: number;
  // Les appareils remis en stock (voir plus bas).
  restockedUnits: number;
};

// Ces trois états ont déjà rendu leurs articles au stock (annulée, retrait expiré, colis retourné).
// Toute autre commande, même vendue ou encaissée, a ses articles « sortis » : ce sont des essais, donc
// on les remet pour que la boutique retrouve son vrai stock. `keepStock` : ne rien remettre, si le
// stock a déjà été corrigé à la main entre-temps (sinon il serait compté deux fois).
const STOCK_ALREADY_BACK = ["cancelled", "expired", "returned"] as const;

export async function resetOrders(db: Tx, { keepStock }: { keepStock: boolean }): Promise<ResetReport> {
  let restockedUnits = 0;
  if (!keepStock) {
    const items = await db.orderItem.findMany({
      where: { order: { status: { notIn: [...STOCK_ALREADY_BACK] } } },
      select: { sku: true, quantity: true, productId: true },
    });
    await restockItems(db, items);
    restockedUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Les lignes d'une commande partent avec elle (CASCADE). Les autres tables ne pointent pas vers les
  // commandes par une clé étrangère : on les vide chacune.
  const orders = await db.order.deleteMany();
  const movements = await db.moneyMovement.deleteMany();
  const events = await db.orderEvent.deleteMany();
  const cashDays = await db.cashDay.deleteMany();
  await db.cashReopening.deleteMany();
  await db.dailyCounter.deleteMany();

  return { orders: orders.count, movements: movements.count, events: events.count, cashDays: cashDays.count, restockedUnits };
}
