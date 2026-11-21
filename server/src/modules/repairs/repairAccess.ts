import type { Role } from "../../generated/prisma/client.js";
import type { Status } from "./repairRules.js";

// Ce que chaque rôle peut faire DANS une fiche (atelier, étape 5, cahier §14). La table des droits décide de la route
// (middlewares/access.ts) ; la route est la même pour le technicien et le vendeur, le geste peut différer : ces règles
// pures, testées seules, sont appliquées par le contrôleur.
//
// Depuis le 21/11 (décision de Mehdi : chaque rôle a toutes les infos de sa page, seul l'admin a tout) : le technicien
// fixe le prix de son travail. Il crée et modifie toute la fiche, la main-d'œuvre comprise, propose le devis, enregistre
// l'accord ou le refus du client, et fait avancer la réparation jusqu'à Prêt. Un seul geste reste à la vente : rendre
// l'appareil, parce qu'il encaisse dans la caisse du jour.
const WORKSHOP_ROLES: Role[] = ["technician", "seller", "order_manager", "admin"];

export function canMoveTo(role: Role, target: Status): boolean {
  if (role === "technician") return target !== "returned";
  return WORKSHOP_ROLES.includes(role);
}

export const patchAllowed = (role: Role): boolean => WORKSHOP_ROLES.includes(role);

export const createAllowed = (role: Role): boolean => WORKSHOP_ROLES.includes(role);

export const SALES_ONLY = "Ce geste est réservé à la vente";
