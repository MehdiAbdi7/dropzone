import type { ComponentType } from "react";
import {
  CashIcon,
  DocumentIcon,
  GridIcon,
  HomeIcon,
  PackageIcon,
  StoreIcon,
  UsersIcon,
} from "@/components/ui/icons";

// Le plan du back-office (14/11) : sept sections, chacune avec ses sous-onglets. Un seul fichier le
// décrit ; la barre latérale, la barre du bas et les sous-onglets le lisent. Les pages gardent leur
// adresse : rien ne casse, les favoris et les liens du tableau de bord continuent de marcher.
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
  // Dans la barre du bas ; les autres sections sont dans le panneau « Plus ».
  primary?: boolean;
  // La page affichée appartient à cette section.
  owns: (path: string) => boolean;
  tabs?: NavTab[];
};

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const anyUnder = (path: string, prefixes: string[]) => prefixes.some((prefix) => under(path, prefix));

export const SECTIONS: NavSection[] = [
  { key: "accueil", label: "Tableau de bord", short: "Accueil", icon: HomeIcon, href: "/admin", primary: true, owns: (path) => path === "/admin" },
  {
    key: "ventes",
    label: "Ventes",
    icon: CashIcon,
    href: "/admin/caisse",
    primary: true,
    owns: (path) => anyUnder(path, ["/admin/caisse", "/admin/vente"]),
    tabs: [
      { label: "Caisse", href: "/admin/caisse", match: (path) => under(path, "/admin/caisse") },
      { label: "Vente au magasin", href: "/admin/vente", match: (path) => under(path, "/admin/vente") },
    ],
  },
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
      { label: "Magasin", href: "/admin/commandes?type=in_store", match: (path, params) => path === "/admin/commandes" && params.get("type") === "in_store" },
    ],
  },
  {
    key: "catalogue",
    label: "Catalogue",
    icon: GridIcon,
    href: "/admin/catalogue",
    primary: true,
    owns: (path) => anyUnder(path, ["/admin/catalogue", "/admin/produits"]),
    tabs: [
      { label: "Par catégorie", href: "/admin/catalogue", match: (path) => under(path, "/admin/catalogue") },
      { label: "Tous les produits", href: "/admin/produits", match: (path) => under(path, "/admin/produits") },
    ],
  },
  { key: "historique", label: "Historique", icon: DocumentIcon, href: "/admin/historique", owns: (path) => under(path, "/admin/historique") },
  { key: "clients", label: "Clients", icon: UsersIcon, href: "/admin/clients", owns: (path) => under(path, "/admin/clients") },
  {
    key: "personnalisation",
    label: "Personnalisation",
    icon: StoreIcon,
    href: "/admin/accueil",
    owns: (path) => anyUnder(path, ["/admin/accueil", "/admin/listes"]),
    tabs: [
      { label: "Boutique", href: "/admin/accueil", match: (path) => under(path, "/admin/accueil") },
      { label: "Listes", href: "/admin/listes", match: (path) => under(path, "/admin/listes") },
    ],
  },
];

// Les entrées du menu ☰ de la barre du haut : ce qui n'est pas une section.
export const SETTINGS_HREF = "/admin/reglages";

export function sectionFor(path: string): NavSection | undefined {
  return SECTIONS.find((section) => section.owns(path));
}

export function activeTab(section: NavSection, path: string, params: URLSearchParams): NavTab | undefined {
  return section.tabs?.find((tab) => tab.match(path, params));
}

// La liste où retrouver une commande d'un type : le retour de sa page de détail.
export function ordersListHref(type: "delivery" | "pickup" | "in_store"): string {
  return type === "delivery" ? "/admin/livraisons" : `/admin/commandes?type=${type}`;
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
