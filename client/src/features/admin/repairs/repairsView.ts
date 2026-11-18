// La logique de la page Réparations (18/11, atelier étape 2) : fonctions pures, sans écran ni réseau. Les bornes sont
// celles de l'API (server/src/modules/repairs/repair.schema.ts) ; l'API reste la référence.

export type RepairStatus = "received" | "quote" | "in_repair" | "ready" | "to_return" | "returned";

export const REPAIR_STATUS_LABELS: Record<RepairStatus, string> = {
  received: "Reçu",
  quote: "Devis à valider",
  in_repair: "En réparation",
  ready: "Prêt",
  to_return: "À rendre sans réparation",
  returned: "Rendu",
};

// Le circuit complet, dans l'ordre : la frise de la fenêtre d'une fiche.
const CIRCUIT: RepairStatus[] = ["received", "quote", "in_repair", "ready", "returned"];

// `skipped` : l'étape n'aura pas lieu (pas de devis sous garantie). `exit` : le devis est refusé, l'appareil sort du
// circuit de réparation.
export type RepairStepState = "done" | "current" | "upcoming" | "skipped" | "exit";
export type RepairStep = { status: RepairStatus; label: string; state: RepairStepState };

export function repairSteps(status: RepairStatus, underWarranty: boolean): RepairStep[] {
  const step = (target: RepairStatus, state: RepairStepState): RepairStep => ({ status: target, label: REPAIR_STATUS_LABELS[target], state });

  // Un devis refusé : « À rendre sans réparation » prend la place de la réparation et de l'étape Prêt.
  if (status === "to_return") {
    return [step("received", "done"), step("quote", "done"), step("to_return", "exit"), step("returned", "upcoming")];
  }

  const at = CIRCUIT.indexOf(status);
  const last = CIRCUIT.length - 1;
  return CIRCUIT.map((target, index) => {
    if (target === "quote" && underWarranty) return step(target, "skipped");
    // La dernière étape, une fois atteinte, est finie : rien ne vient après.
    if (index < at || (index === at && at === last)) return step(target, "done");
    return step(target, index === at ? "current" : "upcoming");
  });
}

export const repairNumber = (number: number): string => `R-${number}`;

// « R-1001 », « r 1001 » ou « 1001 » : on envoie le numéro seul ; tout autre texte part tel quel (nom, téléphone).
export function parseRepairSearch(text: string): string {
  const trimmed = text.trim();
  return /^r[-\s]?\d+$/i.test(trimmed) ? trimmed.replace(/^r[-\s]?/i, "") : trimmed;
}

const MAX_PRICE = 10_000_000;

export type RepairDraft = { fullName: string; phone: string; deviceName: string; issue: string; laborPrice: number | null };

// La saisie d'une fiche, dite en français avant l'envoi. Une main-d'œuvre vide est `null` (le devis n'est pas
// encore fixé) ; `NaN` vient d'un champ dont le texte n'est pas un nombre.
export function repairDraftProblem(draft: RepairDraft): string | null {
  const name = draft.fullName.trim();
  if (name.length < 3) return "Le nom et le prénom du client : 3 caractères au minimum.";
  if (name.length > 80) return "Le nom du client : 80 caractères au maximum.";
  if (!/^0[2-7]\d{8}$/.test(draft.phone.replace(/[\s.-]/g, ""))) return "Le téléphone du client : un numéro algérien à 10 chiffres.";
  const device = draft.deviceName.trim();
  if (device.length < 2) return "L'appareil : 2 caractères au minimum.";
  if (device.length > 80) return "L'appareil : 80 caractères au maximum.";
  const issue = draft.issue.trim();
  if (issue.length < 3) return "La panne décrite par le client : 3 caractères au minimum.";
  if (issue.length > 500) return "La panne : 500 caractères au maximum.";
  if (draft.laborPrice !== null && !(Number.isInteger(draft.laborPrice) && draft.laborPrice >= 0 && draft.laborPrice <= MAX_PRICE)) {
    return "La main-d'œuvre : un nombre entier de dinars, de 0 à 10 000 000.";
  }
  return null;
}

const dayMonthYear = (day: string) => day.split("-").reverse().join("/");

// La garantie d'une fiche en une phrase, avec la date de fin quand on la connaît.
export function warrantyLabel(repair: { underWarranty: boolean; warrantyEndsAt: string | null; warrantyForcedOff: boolean }): string {
  if (repair.underWarranty && repair.warrantyEndsAt) return `Sous garantie jusqu'au ${dayMonthYear(repair.warrantyEndsAt)}`;
  if (repair.warrantyForcedOff) return "Hors garantie (forcée)";
  if (repair.warrantyEndsAt) return `Hors garantie (finie le ${dayMonthYear(repair.warrantyEndsAt)})`;
  return "Hors garantie";
}

// Ce que le client paie : les pièces au prix de vente plus la main-d'œuvre (même calcul que l'API ; sous garantie
// l'écran dit « gratuit » à la place).
export function repairTotal(repair: { laborPrice: number | null; parts: { quantity: number; unitPrice: number }[] }): number {
  return (repair.laborPrice ?? 0) + repair.parts.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
}

// Le texte du bouton qui fait passer la fiche d'une étape à une autre.
export function actionLabel(from: RepairStatus, to: RepairStatus, underWarranty: boolean): string {
  if (to === "quote") return "Proposer le devis";
  if (to === "in_repair") {
    if (from === "quote") return "Devis accepté : réparer";
    return underWarranty ? "Commencer la réparation" : "Client d'accord : réparer";
  }
  if (to === "to_return") return "Devis refusé";
  if (to === "ready") return "Réparation terminée";
  if (to === "returned") return "Rendre l'appareil";
  return REPAIR_STATUS_LABELS[to];
}
