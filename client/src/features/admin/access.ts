import type { Role } from "@/types/api";

// Ce que chaque rôle peut ouvrir dans le back-office (lot 7). C'est le reflet de la table de l'API
// (server/src/middlewares/access.ts) : ici on choisit seulement quoi afficher et où renvoyer. La vraie
// protection est dans l'API, qui refuse (403) toute route que le rôle n'a pas, quoi qu'affiche l'écran.
//
// Trois rôles en escalier : le vendeur ouvre le comptoir, le responsable commande y ajoute les commandes,
// l'admin ouvre tout.
// L'atelier (étape 5) : le vendeur et le responsable ouvrent les réparations (devis, Rendu), pas la page Pièces (stock).
const SELLER_PAGES = ["/admin/vente", "/admin/echange", "/admin/caisse", "/admin/reglages", "/admin/facture", "/admin/compte", "/admin/reparations"];
// Le technicien n'est pas dans l'escalier : l'atelier et son compte, rien d'autre.
const TECHNICIAN_PAGES = ["/admin/reparations", "/admin/pieces", "/admin/compte"];
const ORDER_MANAGER_PAGES = ["/admin/livraisons", "/admin/commandes"];

// Un chemin est sous une page si c'est elle ou l'un de ses sous-chemins : « /admin/vente-x » n'est pas
// « /admin/vente ».
const under = (path: string, page: string) => path === page || path.startsWith(`${page}/`);

export const isBackOffice = (role: Role) => role !== "customer";

export function canAccess(role: Role, path: string): boolean {
  if (role === "admin") return path === "/admin" || path.startsWith("/admin/");
  const pages =
    role === "order_manager" ? [...SELLER_PAGES, ...ORDER_MANAGER_PAGES] : role === "seller" ? SELLER_PAGES : role === "technician" ? TECHNICIAN_PAGES : [];
  return pages.some((page) => under(path, page));
}

// La première page de chaque rôle : celle où il arrive après sa connexion, et où on le renvoie quand il
// ouvre une page qui n'est pas pour lui.
export function homeFor(role: Role): string {
  switch (role) {
    case "seller":
      return "/admin/vente";
    case "order_manager":
      return "/admin/livraisons";
    case "technician":
      return "/admin/reparations";
    case "admin":
      return "/admin";
    default:
      return "/compte";
  }
}
