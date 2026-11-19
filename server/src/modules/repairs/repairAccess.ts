import type { Role } from "../../generated/prisma/client.js";
import type { Status } from "./repairRules.js";

// Ce que chaque rôle peut faire DANS une fiche (atelier, étape 5, cahier §14). La table des droits décide de la route
// (middlewares/access.ts) ; la route est la même pour le technicien et le vendeur, le geste non : ces règles pures,
// testées seules, sont appliquées par le contrôleur.

// Le technicien fait avancer la réparation : Prêt, et En réparation SOUS GARANTIE (le client ne paie rien, il n'y a
// pas d'accord à recueillir). Hors garantie, « En réparation » est l'accord du client sur un devis que le technicien
// ne voit même pas : c'est la vente qui l'enregistre. Proposer le devis, le refuser et rendre l'appareil (donc
// encaisser) sont aussi les gestes de la vente : le vendeur, le responsable commande et l'admin.
export function canMoveTo(role: Role, target: Status, repair: { underWarranty: boolean }): boolean {
  if (role === "technician") return target === "ready" || (target === "in_repair" && repair.underWarranty);
  return role === "seller" || role === "order_manager" || role === "admin";
}

// Le technicien ne modifie que sa note : ni la main-d'œuvre (donc le devis), ni l'identité du client ou de l'appareil.
export function patchAllowed(role: Role, keys: string[]): boolean {
  if (role === "technician") return keys.every((key) => key === "note");
  return role === "seller" || role === "order_manager" || role === "admin";
}

// Créer une fiche : le technicien aussi (décision de Mehdi, 19/11), mais sans fixer ce que le client paiera : ni la
// main-d'œuvre, ni « forcer hors garantie » (qui rend la réparation payante). La vente les fixe ensuite dans la fiche.
const TECHNICIAN_FORBIDDEN_AT_CREATION = ["laborPrice", "forceOutOfWarranty"];

export function createAllowed(role: Role, keys: string[]): boolean {
  if (role === "technician") return !keys.some((key) => TECHNICIAN_FORBIDDEN_AT_CREATION.includes(key));
  return role === "seller" || role === "order_manager" || role === "admin";
}

export const SALES_ONLY = "Ce geste est réservé à la vente";
