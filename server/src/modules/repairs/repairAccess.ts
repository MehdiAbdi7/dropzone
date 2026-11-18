import type { Role } from "../../generated/prisma/client.js";
import type { Status } from "./repairRules.js";

// Ce que chaque rôle peut faire DANS une fiche (atelier, étape 5, cahier §14). La table des droits décide de la route
// (middlewares/access.ts) ; la route est la même pour le technicien et le vendeur, le geste non : ces règles pures,
// testées seules, sont appliquées par le contrôleur.

// Le technicien fait avancer la réparation (En réparation, Prêt). Proposer le devis, le refuser et rendre l'appareil
// (donc encaisser) sont les gestes de la vente : le vendeur, le responsable commande et l'admin.
const TECHNICIAN_MOVES: Status[] = ["in_repair", "ready"];

export function canMoveTo(role: Role, target: Status): boolean {
  if (role === "technician") return TECHNICIAN_MOVES.includes(target);
  return role === "seller" || role === "order_manager" || role === "admin";
}

// Le technicien ne modifie que sa note : ni la main-d'œuvre (donc le devis), ni l'identité du client ou de l'appareil.
export function patchAllowed(role: Role, keys: string[]): boolean {
  if (role === "technician") return keys.every((key) => key === "note");
  return role === "seller" || role === "order_manager" || role === "admin";
}

export const SALES_ONLY = "Ce geste est réservé à la vente";
