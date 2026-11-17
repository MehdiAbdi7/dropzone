import type { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import { withoutCosts } from "../utils/withoutCosts.js";

// Les droits du back-office (lot 7, 17/11). Trois rôles en escalier : chacun a tout ce que le précédent a.
// Une seule table dit à partir de quel rôle chaque route est ouverte ; tout ce qui n'y figure pas est pour
// l'admin. Ainsi une route ajoutée demain sans y penser reste fermée au vendeur et au responsable.
export const ROLE_RANK: Record<Role, number> = {
  customer: 0,
  seller: 1,
  order_manager: 2,
  admin: 3,
};

export type AccessRule = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // L'adresse telle que la route la déclare, sans le préfixe `/admin` ; `:id` vaut un numéro.
  path: string;
  min: Role;
};

export const ACCESS_RULES: AccessRule[] = [
  // Vendeur : le comptoir (vente, échange, caisse), les réglages du magasin et la facture d'une vente.
  { method: "GET", path: "/cash/today", min: "seller" },
  { method: "POST", path: "/cash/open", min: "seller" },
  { method: "POST", path: "/cash/close", min: "seller" },
  { method: "POST", path: "/sales", min: "seller" },
  { method: "POST", path: "/exchanges", min: "seller" },
  { method: "GET", path: "/variants", min: "seller" },
  { method: "GET", path: "/invoice-settings", min: "seller" },
  { method: "PUT", path: "/invoice-settings", min: "seller" },
  { method: "PUT", path: "/store/hours", min: "seller" },
  // Un vendeur n'ouvre que la facture d'une vente ou d'un échange du comptoir : le service le vérifie.
  { method: "POST", path: "/orders/:id/invoice", min: "seller" },
  // Responsable commande : tout le vendeur, plus la page Commandes. Modifier et supprimer une commande
  // restent à l'admin (elles ne sont pas dans la table).
  { method: "GET", path: "/orders", min: "order_manager" },
  { method: "GET", path: "/orders/:id", min: "order_manager" },
  { method: "PATCH", path: "/orders/:id/status", min: "order_manager" },
  { method: "POST", path: "/orders/:id/pickup", min: "order_manager" },
  { method: "POST", path: "/orders/:id/baridi-number", min: "order_manager" },
  { method: "POST", path: "/orders/:id/advance-received", min: "order_manager" },
  { method: "POST", path: "/orders/:id/collect", min: "order_manager" },
  { method: "POST", path: "/orders/:id/return", min: "order_manager" },
  { method: "GET", path: "/deliveries/summary", min: "order_manager" },
];

// Chaque règle devient une expression : `:id` accepte un segment, une barre finale est tolérée, et
// l'adresse doit correspondre en entier (« /orders/12/status » n'est pas « /orders/:id »).
const COMPILED = ACCESS_RULES.map((rule) => ({
  rule,
  pattern: new RegExp(`^${rule.path.replace(/:[^/]+/g, "[^/]+")}/?$`),
}));

export function minRoleFor(method: string, path: string): Role {
  const found = COMPILED.find(({ rule, pattern }) => rule.method === method.toUpperCase() && pattern.test(path));
  return found ? found.rule.min : "admin";
}

// Monté sous `/admin`, après requireAuth : `req.path` est l'adresse sans le préfixe.
export function adminAccess(req: Request, res: Response, next: NextFunction) {
  const role: Role | undefined = res.locals.user?.role;
  if (!role) {
    throw new AppError(401, "Connexion requise");
  }
  if (ROLE_RANK[role] < ROLE_RANK[minRoleFor(req.method, req.path)]) {
    throw new AppError(403, "Accès refusé");
  }
  // Tout ce qui sort vers un non-admin est nettoyé des coûts et des bénéfices, ici, une seule fois : une
  // route ouverte demain au vendeur ne peut pas les laisser passer par oubli.
  if (role !== "admin") {
    const send = res.json.bind(res);
    res.json = (body) => send(withoutCosts(body));
  }
  next();
}
