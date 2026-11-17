import type { ComponentType } from "react";
import {
  CashIcon,
  ClipboardCheckIcon,
  DocumentIcon,
  GridIcon,
  HomeIcon,
  PackageIcon,
  StoreIcon,
  SwapIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Role } from "@/types/api";
import { canAccess } from "./access";

// Le plan du back-office (14/11) : huit sections, chacune avec ses sous-onglets. Un seul fichier le
// décrit ; la barre latérale, la barre du bas, le menu ☰ et les sous-onglets le lisent. Les pages
// gardent leur adresse : rien ne casse, les favoris et les liens du tableau de bord continuent de marcher.
// Chaque section est affichée à UN seul endroit : la barre latérale et la barre du bas pour le travail
// de tous les jours, le menu ☰ de la barre du haut pour la Caisse et la Personnalisation.
export type NavTab = {
  label: string;
  href: string;
  // L'onglet est celui de la page affichée (adresse et paramètres).
  match: (path: string, params: URLSearchParams) => boolean;
};

export type NavSection = {
  key: string;
  label: string;
  // Le libellé court de la barre du bas (sinon le libellé normal).
  short?: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  href: string;
  // Dans la barre du bas, sur téléphone ; les autres sections sont dans le panneau « Plus ».
  primary?: boolean;
  // Dans le menu ☰ de la barre du haut, et ni dans la barre latérale ni dans la barre du bas.
  inMenu?: boolean;
  // La page affichée appartient à cette section.
  owns: (path: string) => boolean;
  tabs?: NavTab[];
};

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const anyUnder = (path: string, prefixes: string[]) => prefixes.some((prefix) => under(path, prefix));

export const SECTIONS: NavSection[] = [
  { key: "accueil", label: "Tableau de bord", short: "Accueil", icon: HomeIcon, href: "/admin", primary: true, owns: (path) => path === "/admin" },
  // La vente au magasin et la caisse sont deux pages à part (demande de Mehdi du 14/11) : on y passe
  // toute la journée, au comptoir. Une vente au magasin n'a pas d'étapes : elle est encaissée sur place
  // et se retrouve dans l'Historique (onglet Magasin), où l'admin peut la modifier ou l'annuler.
  // La vente au magasin et l'échange (lot 5) sont les deux gestes du comptoir : une section, deux onglets.
  {
    key: "vente",
    label: "Vente au magasin",
    short: "Ventes",
    icon: SwapIcon,
    href: "/admin/vente",
    primary: true,
    owns: (path) => anyUnder(path, ["/admin/vente", "/admin/echange"]),
    tabs: [
      { label: "Vente", href: "/admin/vente", match: (path) => under(path, "/admin/vente") },
      { label: "Échange", href: "/admin/echange", match: (path) => under(path, "/admin/echange") },
    ],
  },
  { key: "caisse", label: "Caisse", icon: CashIcon, href: "/admin/caisse", inMenu: true, owns: (path) => under(path, "/admin/caisse") },
  {
    key: "commandes",
    label: "Commandes",
    icon: PackageIcon,
    href: "/admin/livraisons",
    primary: true,
    owns: (path) => anyUnder(path, ["/admin/commandes", "/admin/livraisons"]),
    tabs: [
      { label: "Livraisons", href: "/admin/livraisons", match: (path) => under(path, "/admin/livraisons") },
      { label: "Retraits", href: "/admin/commandes?type=pickup", match: (path, params) => path === "/admin/commandes" && params.get("type") === "pickup" },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: GridIcon,
    href: "/admin/catalogue",
    primary: true,
    owns: (path) => anyUnder(path, ["/admin/catalogue", "/admin/produits", "/admin/reprises"]),
    tabs: [
      { label: "Par catégorie", href: "/admin/catalogue", match: (path) => under(path, "/admin/catalogue") },
      { label: "Tous les produits", href: "/admin/produits", match: (path) => under(path, "/admin/produits") },
      // Les téléphones repris en échange, à mettre en vente (lot 5).
      { label: "Reprises", href: "/admin/reprises", match: (path) => under(path, "/admin/reprises") },
    ],
  },
  { key: "historique", label: "Historique", icon: DocumentIcon, href: "/admin/historique", owns: (path) => under(path, "/admin/historique") },
  { key: "clients", label: "Clients", icon: UsersIcon, href: "/admin/clients", owns: (path) => under(path, "/admin/clients") },
  {
    key: "personnalisation",
    label: "Personnalisation",
    icon: StoreIcon,
    href: "/admin/accueil",
    inMenu: true,
    owns: (path) => anyUnder(path, ["/admin/accueil", "/admin/listes"]),
    tabs: [
      { label: "Boutique", href: "/admin/accueil", match: (path) => under(path, "/admin/accueil") },
      { label: "Listes", href: "/admin/listes", match: (path) => under(path, "/admin/listes") },
    ],
  },
  // Les comptes du personnel (lot 7) : qui se connecte au back-office, avec quel rôle. Admin seulement.
  { key: "comptes", label: "Comptes", icon: UsersIcon, href: "/admin/comptes", inMenu: true, owns: (path) => under(path, "/admin/comptes") },
];

// Les entrées du menu ☰ de la barre du haut : ce qui n'est pas une section.
export const SETTINGS_HREF = "/admin/reglages";
// Mon compte (15/11) : nom, téléphone, email de connexion et mot de passe de celui qui est connecté.
export const ACCOUNT_HREF = "/admin/compte";

// Qui s'affiche où : le menu ☰ (Caisse, Personnalisation), la barre latérale (tout le reste), la barre
// du bas du téléphone (Accueil, Ventes, Commandes au milieu, Catalogue) et son panneau « Plus » (ce qui
// reste : Historique, Clients).
export const MENU_SECTIONS = SECTIONS.filter((section) => section.inMenu);
export const NAV_SECTIONS = SECTIONS.filter((section) => !section.inMenu);
export const BOTTOM_PRIMARY = NAV_SECTIONS.filter((section) => section.primary);
export const BOTTOM_MORE = NAV_SECTIONS.filter((section) => !section.primary);

// La barre du bas du téléphone (lot 7) est propre à chaque rôle. Avec les seules sections permises, le vendeur
// n'aurait eu qu'un bouton et le responsable deux : une barre presque vide, la Caisse et les Réglages cachés
// dans le menu ☰ tout en haut. Chacun a donc trois entrées, celles qu'il utilise toute la journée, avec son
// geste principal au milieu, en relief : le vendeur vend, le responsable suit les commandes.
export type BottomItem = { key: string; label: string; href: string; icon: NavSection["icon"] };

const itemOf = (key: string): BottomItem => {
  const section = SECTIONS.find((candidate) => candidate.key === key);
  if (!section) throw new Error(`Section inconnue : ${key}`);
  return { key, label: section.short ?? section.label, href: section.href, icon: section.icon };
};
// Les Réglages ne sont pas une section (ils vivent dans le menu ☰) : une entrée à part, pour le vendeur.
const SETTINGS_ITEM: BottomItem = { key: "reglages", label: "Réglages", href: SETTINGS_HREF, icon: ClipboardCheckIcon };

export function bottomBarFor(role: Role): { items: BottomItem[]; featured: string; more: NavSection[] } {
  if (role === "seller") return { items: [itemOf("caisse"), itemOf("vente"), SETTINGS_ITEM], featured: "vente", more: [] };
  if (role === "order_manager") return { items: [itemOf("vente"), itemOf("commandes"), itemOf("caisse")], featured: "commandes", more: [] };
  // L'admin garde la barre d'avant : quatre entrées, « Plus » pour le reste.
  return { items: BOTTOM_PRIMARY.map((section) => itemOf(section.key)), featured: "commandes", more: BOTTOM_MORE };
}

// L'entrée de la barre du bas à allumer pour la page affichée : sa section, ou Réglages.
export function activeBottomKey(path: string): string | undefined {
  return sectionFor(path)?.key ?? (under(path, SETTINGS_HREF) ? "reglages" : undefined);
}

// Les sections qu'un rôle peut ouvrir (lot 7) : celles dont la page d'entrée lui est permise (access.ts).
// Un seul endroit décide des droits ; le menu ne les redit pas.
export const isVisibleTo = (role: Role) => (section: NavSection) => canAccess(role, section.href);

export function visibleSections(role: Role): NavSection[] {
  return SECTIONS.filter(isVisibleTo(role));
}

export function sectionFor(path: string): NavSection | undefined {
  return SECTIONS.find((section) => section.owns(path));
}

export function activeTab(section: NavSection, path: string, params: URLSearchParams): NavTab | undefined {
  return section.tabs?.find((tab) => tab.match(path, params));
}

// La liste où retrouver une commande d'un type : le retour de sa page de détail. Une vente au magasin
// n'a pas de liste de suivi (pas d'étapes) : on la retrouve dans l'Historique, onglet Magasin. Un échange
// (lot 5) non plus : onglet Échanges.
export function ordersListHref(type: "delivery" | "pickup" | "in_store" | "exchange"): string {
  if (type === "delivery") return "/admin/livraisons";
  if (type === "pickup") return "/admin/commandes?type=pickup";
  if (type === "exchange") return "/admin/historique?type=exchange";
  return "/admin/historique?type=in_store";
}

const PICKUP_STATUSES = ["reserved", "picked_up", "expired"];

// Un état de commande mène à l'onglet où l'on gère cet état : les états d'une livraison (y compris
// « Annulée ») sur Livraisons, ceux d'un retrait sur Retraits. Sert le tableau de bord et les
// anciens liens `/admin/commandes?status=…`.
export function ordersHref(status?: string): string {
  if (!status) return "/admin/livraisons";
  if (PICKUP_STATUSES.includes(status)) return `/admin/commandes?type=pickup&status=${status}`;
  return `/admin/livraisons?status=${status}`;
}
