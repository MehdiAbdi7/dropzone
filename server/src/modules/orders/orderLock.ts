import type { Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

// Verrouille la commande pour la durée de la transaction. Toute écriture qui touche au stock ou à
// l'argent d'une commande (modifier, supprimer, changer l'état) commence par là : une deuxième
// écriture simultanée attend, puis relit l'état déjà modifié. Sans ce verrou, deux clics
// ajusteraient le stock deux fois à partir du même état de départ (une annulation qui croise une
// modification rendrait les anciennes lignes, pas les nouvelles).
export async function lockOrder(tx: Tx, id: number) {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM orders WHERE id = ${id} FOR UPDATE`;
  if (rows.length === 0) {
    throw new AppError(404, "Commande introuvable");
  }
}
