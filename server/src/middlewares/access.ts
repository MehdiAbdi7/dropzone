import type { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/client.js";
import { AppError } from "../utils/AppError.js";
import { TECHNICIAN_COST_KEYS, withoutCosts } from "../utils/withoutCosts.js";

// Les droits du back-office (lot 7, 17/11). Trois rôles en escalier : chacun a tout ce que le précédent a.
// Une seule table dit à partir de quel rôle chaque route est ouverte ; tout ce qui n'y figure pas est pour
// l'admin. Ainsi une route ajoutée demain sans y penser reste fermée au vendeur et au responsable.
//
// Le technicien (atelier, étape 5) n'est PAS dans l'escalier : rang 0, comme un client, donc aucune règle à `min` ne
// le laisse passer. Ses routes sont des règles à liste explicite de rôles (`roles`).
export const ROLE_RANK: Record<Role, number> = {
  customer: 0,
  technician: 0,
  seller: 1,
  order_manager: 2,
  admin: 3,
};

export type AccessRule = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // L'adresse telle que la route la déclare, sans le préfixe `/admin` ; `:id` vaut un numéro.
  path: string;
  // Un rôle minimum dans l'escalier (vendeur < responsable < admin)...
  min?: Role;
  // ... ou une liste explicite de rôles, hors escalier (le technicien). L'admin passe toujours.
  roles?: Role[];
  // Les rôles qui gardent le prix d'achat (`unitCost`, `purchasePrice`, `partsCost`) dans la réponse de cette route :
  // le technicien voit le prix d'achat des pièces. Le bénéfice et la marge restent toujours retirés.
  costFor?: Role[];
  // Cette route garde le prix d'achat dans sa réponse même pour un non-admin (18/11). Une seule : la recherche
  // de variantes, pour que le vendeur connaisse sa limite en négociant. Bénéfice et marge restent nettoyés.
  showsCost?: true;
};

export const ACCESS_RULES: AccessRule[] = [
  // Vendeur : le comptoir (vente, échange, caisse), les réglages du magasin et la facture d'une vente.
  { method: "GET", path: "/cash/today", min: "seller" },
  { method: "POST", path: "/cash/open", min: "seller" },
  { method: "POST", path: "/cash/close", min: "seller" },
  { method: "POST", path: "/sales", min: "seller" },
  { method: "POST", path: "/exchanges", min: "seller" },
  // Une commande reçue par téléphone (19/11) : le vendeur la saisit, la page Commandes reste au responsable.
  { method: "POST", path: "/orders", min: "seller" },
  { method: "GET", path: "/variants", min: "seller", showsCost: true },
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

  // L'atelier (étape 5, cahier §11 et §14). Le technicien, le vendeur et le responsable voient les réparations et
  // choisissent leurs pièces ; QUEL passage d'étape et QUEL champ de la fiche sont permis à chacun se décide dans
  // le service (repairAccess.ts), la route étant la même. Supprimer une fiche, modifier une pièce, corriger un
  // stock : absents de la table, donc pour l'admin.
  // Créer une fiche et chercher la garantie de l'appareil : le technicien aussi (décision de Mehdi, 19/11). Il ne fixe
  // pas ce que le client paiera à la création : le contrôleur refuse la main-d'œuvre et « hors garantie forcé ».
  { method: "POST", path: "/repairs", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "GET", path: "/repairs/warranty", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "GET", path: "/repairs", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "GET", path: "/repairs/counts", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "GET", path: "/repairs/:id", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "PATCH", path: "/repairs/:id", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "POST", path: "/repairs/:id/status", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  // Remplacer l'appareil sous garantie (étape 6) : un geste de vente, l'argent et la reprise en dépendent. Le technicien
  // en est exclu parce qu'il n'est pas dans l'escalier `min: "seller"`.
  { method: "POST", path: "/repairs/:id/replace", min: "seller" },
  { method: "POST", path: "/repairs/:id/parts", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "PATCH", path: "/repairs/:id/parts/:lineId", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  { method: "DELETE", path: "/repairs/:id/parts/:lineId", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  // Les pièces : le vendeur et le responsable voient la liste (nom, prix de vente, stock) pour établir un devis,
  // sans le prix d'achat ; le technicien le voit, crée une pièce et enregistre un arrivage.
  { method: "GET", path: "/parts", roles: ["technician", "seller", "order_manager"], costFor: ["technician"] },
  // Les catégories de pièces (21/11) : ceux qui lisent les pièces lisent les catégories ; créer, renommer et supprimer
  // une catégorie est admin seul (aucune règle).
  { method: "GET", path: "/part-categories", roles: ["technician", "seller", "order_manager"] },
  { method: "POST", path: "/parts", roles: ["technician"], costFor: ["technician"] },
  { method: "POST", path: "/parts/:id/arrivals", roles: ["technician"], costFor: ["technician"] },
  { method: "GET", path: "/parts/:id/movements", roles: ["technician"], costFor: ["technician"] },
];

// Une règle laisse-t-elle passer ce rôle ? Une liste explicite d'abord (l'admin passe toujours), sinon l'escalier.
export function ruleAllows(rule: AccessRule, role: Role): boolean {
  if (role === "admin") return true;
  if (rule.roles) return rule.roles.includes(role);
  return rule.min !== undefined && ROLE_RANK[role] >= ROLE_RANK[rule.min];
}

// Chaque règle devient une expression : `:id` vaut un NUMÉRO (jamais un mot : « /repairs/warranty » n'est pas une
// fiche), une barre finale est tolérée, la casse est ignorée comme dans le routeur d'Express, et l'adresse doit
// correspondre en entier (« /orders/12/status » n'est pas « /orders/:id »). Sans ces deux précisions, « /repairs/WARRANTY »
// tombait sur la règle `/repairs/:id` (ouverte au technicien) pendant qu'Express exécutait la recherche de garantie.
const COMPILED = ACCESS_RULES.map((rule) => ({
  rule,
  pattern: new RegExp(`^${rule.path.replace(/:[^/]+/g, "\\d+")}/?$`, "i"),
}));

// La règle de la table qui couvre cette route, ou rien (alors la route est pour l'admin).
export function ruleFor(method: string, path: string): AccessRule | undefined {
  return COMPILED.find(({ rule, pattern }) => rule.method === method.toUpperCase() && pattern.test(path))?.rule;
}

export function minRoleFor(method: string, path: string): Role {
  return ruleFor(method, path)?.min ?? "admin";
}

// Le rôle peut-il appeler cette route ? Une route absente de la table est pour l'admin.
export function roleCanCall(role: Role, method: string, path: string): boolean {
  const rule = ruleFor(method, path);
  return rule ? ruleAllows(rule, role) : role === "admin";
}

// Monté sous `/admin`, après requireAuth : `req.path` est l'adresse sans le préfixe.
export function adminAccess(req: Request, res: Response, next: NextFunction) {
  const role: Role | undefined = res.locals.user?.role;
  if (!role) {
    throw new AppError(401, "Connexion requise");
  }
  if (!roleCanCall(role, req.method, req.path)) {
    throw new AppError(403, "Accès refusé");
  }
  // Tout ce qui sort vers un non-admin est nettoyé, ici, une seule fois : une route ouverte demain au vendeur ne
  // peut pas laisser passer un coût par oubli. Le prix d'achat reste pour les rôles que la règle nomme (`costFor`,
  // le technicien) et pour la recherche de variantes (`showsCost`) ; le bénéfice et la marge jamais. Le technicien
  // voit l'argent du client de l'atelier (main-d'œuvre, prix, total) : il fixe le prix de son travail (21/11).
  if (role !== "admin") {
    const rule = ruleFor(req.method, req.path);
    const keepsCosts = rule?.showsCost === true || (rule?.costFor?.includes(role) ?? false);
    const send = res.json.bind(res);
    res.json = (body) => {
      const clean = keepsCosts ? (rule?.showsCost ? body : withoutCosts(body, TECHNICIAN_COST_KEYS)) : withoutCosts(body);
      return send(clean);
    };
  }
  next();
}
