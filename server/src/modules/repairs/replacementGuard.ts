import type { Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

// La commande d'un remplacement sous garantie (atelier, étape 6) est liée à sa fiche : le stock de l'appareil donné,
// la reprise à 0 DA et l'argent de la fiche en dépendent. La modifier, la supprimer ou la facturer depuis les
// commandes ferait diverger la commande et la fiche : tout est refusé, avec le numéro de la fiche à ouvrir.
export async function refuseIfReplacement(tx: Tx, orderId: number): Promise<void> {
  const repair = await tx.repair.findUnique({ where: { replacementOrderId: orderId }, select: { number: true } });
  if (repair) {
    throw new AppError(409, `Cette commande est le remplacement de la réparation R-${repair.number} : elle ne se modifie, ne se supprime ni ne se facture ici`);
  }
}
