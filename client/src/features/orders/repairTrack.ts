import { STORE_INFO } from "@/config/storeInfo";
import { formatDate, formatPrice } from "@/lib/format";
import { repairSteps, type RepairStatus, type RepairStepState } from "@/features/admin/repairs/repairsView";
import type { SlipRows } from "./slipRows";

// Le suivi d'une réparation sur /suivi (18/11, atelier étape 4). Ce que le serveur renvoie au client : jamais un
// coût, une note du technicien, ni son nom ou son téléphone (voir server/src/modules/repairs/repairTrack.service.ts).
export type RepairTracking = {
  number: number;
  deviceName: string;
  deviceColor: string | null;
  status: RepairStatus;
  refused: boolean;
  underWarranty: boolean;
  warrantyEndsAt: string | null;
  // null : le devis n'est pas encore fixé, ou la réparation est sous garantie.
  price: number | null;
  // Le devis en détail (21/11) : la main-d'œuvre à part, chaque pièce avec son prix de vente, jamais un coût. null à
  // « Reçu », sous garantie et si le devis est refusé.
  quote: { labor: number; items: { name: string; quantity: number; unitPrice: number }[]; total: number } | null;
  returnedOn: string | null;
  // La première date de chaque étape traversée.
  steps: { status: RepairStatus; at: string }[];
};

// Le champ du numéro (21/11) : « R- » est écrit d'avance et ne s'enlève pas, le client tape seulement les chiffres. Un
// numéro collé avec son « R- » (ou des espaces) est réduit à ses chiffres ; au plus 10, le plus grand entier de la base.
export const trackNumberDigits = (text: string): string => text.replace(/\D/g, "").slice(0, 10);

// « R-1001 », « r 1001 » ou « 1001 » donnent 1001 ; tout le reste, `NaN` (on n'envoie rien au serveur).
export function parseTrackNumber(text: string): number {
  const match = /^(?:r[-\s]?)?(\d{1,10})$/i.exec(text.trim());
  const number = match ? Number(match[1]) : Number.NaN;
  // Au-delà d'un entier PostgreSQL, le serveur refuserait : on le dit avant l'envoi.
  return number >= 1 && number <= 2_147_483_647 ? number : Number.NaN;
}

// La phrase qui dit au client ce qu'il doit savoir ; null quand la frise suffit (Reçu, En réparation).
export function trackStateText(status: RepairStatus): string | null {
  switch (status) {
    case "quote":
      // Depuis le 21/11 le client répond lui-même à son devis, ou appelle le magasin pour en parler.
      return "Un devis vous attend : lisez-le ci-dessous, puis acceptez-le ou refusez-le. Vous pouvez aussi appeler le magasin.";
    case "ready":
      return "Votre appareil est prêt, vous pouvez venir le récupérer.";
    case "to_return":
      return "Votre appareil est à récupérer, sans réparation.";
    case "returned":
      return "Votre appareil vous a été rendu.";
    default:
      return null;
  }
}

export function trackPriceText(tracking: Pick<RepairTracking, "underWarranty" | "price" | "status">): string {
  if (tracking.underWarranty) return "Sous garantie, gratuit";
  if (tracking.price === null) return "Le prix vous sera communiqué après le diagnostic.";
  if (tracking.price === 0) return "Aucun frais";
  return `${tracking.status === "returned" ? "Payé" : "À payer"} : ${formatPrice(tracking.price)}`;
}

// Pourquoi l'étape Devis n'a pas eu lieu : sous garantie, ou parce que le client était d'accord au dépôt. Dire
// « sous garantie » pour une réparation payante ferait croire au client qu'elle est gratuite.
export const trackSkippedText = (underWarranty: boolean): string => (underWarranty ? "Sans devis (sous garantie)" : "Accepté au dépôt");

const dayMonthYear = (day: string) => day.split("-").reverse().join("/");

// La garantie, pour le client : la date de fin seulement quand il est sous garantie (jamais pour un appareil hors garantie).
export function trackWarrantyText(tracking: Pick<RepairTracking, "underWarranty" | "warrantyEndsAt">): string {
  return tracking.underWarranty && tracking.warrantyEndsAt ? `Sous garantie jusqu'au ${dayMonthYear(tracking.warrantyEndsAt)}` : "Hors garantie";
}

// La frise du suivi : celle du back-office, avec la date de chaque étape atteinte.
export function trackSteps(tracking: RepairTracking): { label: string; state: RepairStepState; date: string | null }[] {
  const dates = new Map(tracking.steps.map((step) => [step.status, step.at]));
  return repairSteps(
    tracking.status,
    tracking.underWarranty,
    tracking.steps.map((step) => step.status),
  ).map((step) => ({ label: step.label, state: step.state, date: step.state === "done" || step.state === "current" || step.state === "exit" ? (dates.get(step.status) ?? null) : null }));
}

// Le devis lu par le client (21/11), prêt à afficher : une ligne par pièce (son nom, × la quantité, son prix de vente
// à l'unité quand il y en a plusieurs), puis la main-d'œuvre à part, puis le total.
export type QuoteRows = { lines: { label: string; detail: string | null; price: string }[]; total: string };

export function quoteRows(quote: NonNullable<RepairTracking["quote"]>): QuoteRows {
  const lines = quote.items.map((item) => ({
    // Une espace insécable après « × » : la quantité ne se détache pas du nom sur une ligne étroite (téléphone).
    label: item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name,
    detail: item.quantity > 1 ? `${formatPrice(item.unitPrice)} l'unité` : null,
    price: formatPrice(item.unitPrice * item.quantity),
  }));
  lines.push({ label: "Main-d'œuvre", detail: null, price: quote.labor === 0 ? "Offerte" : formatPrice(quote.labor) });
  return { lines, total: formatPrice(quote.total) };
}

// Le client répond à son devis seulement à « Devis à valider », hors garantie, avec un détail à lire : jamais ailleurs.
export const canDecide = (tracking: Pick<RepairTracking, "status" | "underWarranty" | "quote">): boolean =>
  tracking.status === "quote" && !tracking.underWarranty && tracking.quote !== null;

// Le bon de réparation existe une fois le devis accepté (ou accepté au dépôt) : en réparation, prêt ou rendu. Pas sous
// garantie (rien à valider), ni quand le devis est refusé.
export const repairSlipAvailable = (tracking: Pick<RepairTracking, "status" | "underWarranty" | "refused" | "quote">): boolean =>
  !tracking.underWarranty && !tracking.refused && tracking.quote !== null && ["in_repair", "ready", "returned"].includes(tracking.status);

// Les numéros du magasin, à donner au client pour qu'il appelle (les mêmes que le pied de page).
export const storePhones = (): { label: string; number: string }[] => [
  { label: "Smartphones", number: STORE_INFO.phones.smartphones },
  { label: "PC portables", number: STORE_INFO.phones.laptops },
];

// Ce que dit le bon de réparation, sans React ni dessin (testé à part) : le MÊME format que le bon de commande, pour que
// l'image se dessine avec le même code (slipImage.ts). Pas de livraison ; le magasin le remet avec la facture.
export function repairSlipRows(tracking: RepairTracking): SlipRows {
  const quote = tracking.quote ?? { labor: 0, items: [], total: 0 };
  const agreed = tracking.steps.find((step) => step.status === "in_repair") ?? tracking.steps.at(-1);
  const phones = storePhones()
    .map((phone) => `${phone.label} ${phone.number}`)
    .join(", ");
  return {
    shop: STORE_INFO.name,
    city: STORE_INFO.city,
    title: "BON DE RÉPARATION",
    number: `R-${tracking.number}`,
    date: agreed ? formatDate(agreed.at) : "",
    where: `${tracking.deviceName}${tracking.deviceColor ? ` · ${tracking.deviceColor}` : ""}`,
    items: [
      ...quote.items.map((item) => ({ title: `${item.quantity} × ${item.name}`, detail: "", price: formatPrice(item.unitPrice * item.quantity) })),
      { title: "Main-d'œuvre", detail: "", price: quote.labor === 0 ? "Offerte" : formatPrice(quote.labor) },
    ],
    shipping: null,
    total: formatPrice(quote.total),
    payNote: "À payer au magasin, à la remise de l'appareil",
    footer: `Ce bon n'est pas une facture : le magasin vous la remet avec l'appareil. Une question ? Appelez le magasin : ${phones}. Pour suivre la réparation, indiquez ce numéro et votre téléphone sur la page « Suivi ».`,
  };
}
