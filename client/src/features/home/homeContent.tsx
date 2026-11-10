import {
  AlertIcon,
  CashIcon,
  ClipboardCheckIcon,
  DocumentIcon,
  EyeIcon,
  GlobeIcon,
  InstagramIcon,
  PackageIcon,
  StoreIcon,
  SwapIcon,
  TruckIcon,
} from "@/components/ui/icons";
import { FREE_SHIPPING_FROM } from "@/config/shipping";
import { STORE_INFO } from "@/config/storeInfo";
import { formatPrice } from "@/lib/format";
import type { Guarantee } from "./Guarantees";

// Les textes et les tailles de l'accueil. La page (app/(shop)/page.tsx) et ses parties
// (HomeSections) les lisent ici : un texte à changer se trouve à un seul endroit.

// Rien d'inventé : chaque garantie est un fait (règle du serveur, façon de vendre
// du magasin, chiffre relevé sur Instagram).
export const TOP_GUARANTEES: Guarantee[] = [
  {
    icon: <GlobeIcon />,
    title: "Sélectionnés d'Europe",
    text: "Smartphones, PC et tablettes",
  },
  {
    icon: <TruckIcon />,
    title: "Livraison dans les 58 wilayas",
    text: `Offerte dès ${formatPrice(FREE_SHIPPING_FROM)}`,
  },
  {
    icon: <CashIcon />,
    title: "Paiement à la livraison",
    text: "Vous payez en recevant",
  },
  {
    icon: <ClipboardCheckIcon />,
    title: "Affaires décrites",
    text: "Note, batterie, pièces et défauts",
  },
];

export const BOTTOM_GUARANTEES: Guarantee[] = [
  {
    icon: <StoreIcon />,
    title: `Magasin à ${STORE_INFO.town}`,
    text: STORE_INFO.city,
  },
  {
    icon: <PackageIcon />,
    title: "Suivi de commande",
    text: "Avec votre numéro et votre téléphone",
  },
  {
    icon: <InstagramIcon />,
    title: `${STORE_INFO.instagramFollowers} abonnés`,
    text: "Sur Instagram",
  },
  {
    icon: <DocumentIcon />,
    title: "Conditions claires",
    text: "Mentions légales et CGV",
  },
];

// Les trois familles de la fiche d'une affaire.
export const FAMILIES = [
  {
    title: "Limitations",
    icon: <AlertIcon />,
    tone: "bg-red-soft text-red",
    text: "Ce que l'appareil ne fait pas, par exemple « Wi-Fi seulement ». Toujours affiché en premier, et à accepter avant de commander.",
  },
  {
    title: "Pièces remplacées",
    icon: <SwapIcon />,
    tone: "bg-blue-soft text-blue-ink",
    text: "Caméra, batterie ou écran changés : d'origine ou compatibles, on vous le dit pièce par pièce.",
  },
  {
    title: "Défauts visibles",
    icon: <EyeIcon />,
    tone: "bg-amber-soft text-amber",
    text: "Une rayure, un cache arrière fissuré : rien qui gêne l'usage, souvent invisible sous une coque.",
  },
];

// La largeur des socles du hero et du bandeau des affaires.
export const HERO_STAGE = "mx-auto w-full max-w-[360px] sm:max-w-[460px] lg:max-w-[580px]";
export const DEALS_STAGE = "mx-auto w-full max-w-[300px] md:max-w-[380px]";
