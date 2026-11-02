import { formatPrice } from "@/lib/format";

// Une estimation affichée seulement : le vrai calcul est fait par le serveur
// (server/src/config/shipping.ts), qui fait foi.
export const FREE_SHIPPING_FROM = 10_000;
const SHIPPING_FEE = 600;

export const FREE_SHIPPING_LABEL = `Livraison offerte dès ${formatPrice(FREE_SHIPPING_FROM)} d'articles, sinon ${formatPrice(SHIPPING_FEE)}.`;
