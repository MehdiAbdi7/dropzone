import { formatPrice } from "@/lib/format";
import { repairSteps, type RepairStatus, type RepairStepState } from "@/features/admin/repairs/repairsView";

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
  returnedOn: string | null;
  // La première date de chaque étape traversée.
  steps: { status: RepairStatus; at: string }[];
};

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
      return "Un devis vous attend : le magasin vous appelle.";
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
