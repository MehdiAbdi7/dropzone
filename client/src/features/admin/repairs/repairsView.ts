// La logique de la page Réparations (18/11, atelier étape 2) : fonctions pures, sans écran ni réseau. Les bornes sont
// celles de l'API (server/src/modules/repairs/repair.schema.ts) ; l'API reste la référence.

import { PAYMENT_METHOD_LABELS } from "@/config/catalog";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod, Role } from "@/types/api";

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

// `visited` : les étapes déjà traversées (les étapes de la fiche). Elles disent ce qui s'est VRAIMENT passé : un devis
// refusé reste une sortie rouge même une fois l'appareil rendu, et un devis sauté (client d'accord au comptoir)
// reste sauté. Sans elles, on suppose que chaque étape passée a eu lieu.
export function repairSteps(status: RepairStatus, underWarranty: boolean, visited?: RepairStatus[]): RepairStep[] {
  const step = (target: RepairStatus, state: RepairStepState): RepairStep => ({ status: target, label: REPAIR_STATUS_LABELS[target], state });
  const refused = status === "to_return" || (visited?.includes("to_return") ?? false);

  // Un devis refusé : « À rendre sans réparation » prend la place de la réparation et de l'étape Prêt.
  if (refused) {
    return [step("received", "done"), step("quote", "done"), step("to_return", "exit"), step("returned", status === "returned" ? "done" : "upcoming")];
  }

  const at = CIRCUIT.indexOf(status);
  const last = CIRCUIT.length - 1;
  return CIRCUIT.map((target, index) => {
    if (target === "quote" && underWarranty) return step(target, "skipped");
    // Une étape passée que la fiche n'a jamais traversée a été sautée.
    if (target === "quote" && visited && index < at && !visited.includes("quote")) return step(target, "skipped");
    // La dernière étape, une fois atteinte, est finie : rien ne vient après.
    if (index < at || (index === at && at === last)) return step(target, "done");
    return step(target, index === at ? "current" : "upcoming");
  });
}

// La pastille sur laquelle la fenêtre s'ouvre : l'étape en cours, la sortie si le devis est refusé, la dernière si la
// fiche est rendue (comme `initialStep` des commandes).
export function initialRepairStep(steps: RepairStep[]): number {
  const current = steps.findIndex((step) => step.state === "current" || step.state === "exit");
  return current === -1 ? steps.length - 1 : current;
}

// Le badge placé devant une fiche dans la liste : où elle en est d'un coup d'œil, « 3/5 · En réparation ». Une étape
// sautée (pas de devis sous garantie) ne compte pas ; un devis refusé n'a pas de position, le nom seul.
export function repairStepBadge(status: RepairStatus, underWarranty: boolean): string {
  const steps = repairSteps(status, underWarranty).filter((step) => step.state !== "skipped");
  const at = steps.findIndex((step) => step.status === status);
  if (at === -1 || steps[at].state === "exit") return REPAIR_STATUS_LABELS[status];
  return `${at + 1}/${steps.length} · ${steps[at].label}`;
}

// Le client répond lui-même à son devis depuis la page Suivi (21/11) : l'événement de l'étape s'écrit SANS auteur
// (`userId` null), alors qu'un geste du magasin porte toujours le compte qui l'a fait. Seuls l'accord (« En réparation »)
// et le refus (« À rendre sans réparation ») sont des réponses du client.
type RepairEventLike = { status: RepairStatus; createdAt: string; userId: number | null };

export const answeredByClient = (event: RepairEventLike): boolean => event.userId === null && (event.status === "in_repair" || event.status === "to_return");

// La réponse du client, tant qu'elle est la DERNIÈRE chose arrivée à la fiche : le magasin le voit en haut de la fenêtre.
// Dès que le magasin a pris la suite (une pièce de plus, une autre étape), le bandeau s'efface.
export function clientDecision(events: RepairEventLike[]): { decision: "accept" | "refuse"; at: string } | null {
  const last = events.at(-1);
  if (!last || !answeredByClient(last)) return null;
  return { decision: last.status === "in_repair" ? "accept" : "refuse", at: last.createdAt };
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
  return laborProblem(draft.laborPrice);
}

// La main-d'œuvre seule (le champ du panneau « Reçu » et « Devis à valider ») : vide (`null`) = pas encore fixée ; `NaN`
// vient d'un champ dont le texte n'est pas un nombre.
export function laborProblem(laborPrice: number | null): string | null {
  if (laborPrice !== null && !(Number.isInteger(laborPrice) && laborPrice >= 0 && laborPrice <= MAX_PRICE)) {
    return "La main-d'œuvre : un nombre entier de dinars, de 0 à 10 000 000.";
  }
  return null;
}

// Le devis est prêt dès qu'il y a une main-d'œuvre (même 0 : « la réparation est gratuite ») ou une pièce : la même
// règle que l'API (hasQuote), qui refuse sinon de le proposer au client.
export const quoteReady = (repair: { laborPrice: number | null; parts: unknown[] }): boolean => repair.laborPrice !== null || repair.parts.length > 0;

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
// Un devis refusé ne compte que la main-d'œuvre (des frais de diagnostic).
export function repairTotal(repair: { laborPrice: number | null; parts: { quantity: number; unitPrice: number }[]; refused?: boolean }): number {
  if (repair.refused) return repair.laborPrice ?? 0;
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

// Le texte de la confirmation avant un passage qui ne se défait pas ; null quand le passage est sans risque. Un devis
// refusé remet les pièces déjà sorties au stock (on les nomme : il faut les retirer de l'appareil) ; rendre
// l'appareil fige la fiche.
export function confirmText(to: RepairStatus, lines: { name: string; quantity: number; consumed: boolean }[]): string | null {
  if (to === "to_return") {
    const out = lines.filter((line) => line.consumed);
    const base = "La fiche ne pourra plus que se rendre au client, sans réparation.";
    if (out.length === 0) return base;
    return `${base} Ces pièces déjà sorties retournent au stock : ${out.map((line) => `${line.name} × ${line.quantity}`).join(", ")}. Retirez-les de l'appareil.`;
  }
  if (to === "returned") return "Une fois l'appareil rendu, la fiche ne pourra plus se modifier.";
  return null;
}

// Le Rendu avec paiement (étape 3) : de l'argent à encaisser veut un moyen de paiement. Rien à payer (sous garantie,
// devis refusé sans frais), rien à choisir.
export function returnProblem(amountDue: number, method: PaymentMethod | null): string | null {
  if (amountDue > 0 && method === null) return "Choisissez le moyen de paiement.";
  return null;
}

// L'argent d'une fiche rendue dans l'Historique : ce que le client a payé (avec le moyen), ce que le magasin lui a rendu
// (remplacement moins cher, montant négatif, étape 6), ou rien.
export function historyAmountText(paidAmount: number, payMethod: PaymentMethod | null): string {
  const method = payMethod ? ` · ${PAYMENT_METHOD_LABELS[payMethod]}` : "";
  if (paidAmount > 0) return `${formatPrice(paidAmount)}${method}`;
  if (paidAmount < 0) return `Rendu au client ${formatPrice(-paidAmount)}${method}`;
  return "Rien payé";
}

// Ce que dit une fiche rendue : ce que le client a payé, avec quel moyen et quel jour ; null avant le Rendu.
export function paidText(repair: { paidAmount: number | null; payMethod: PaymentMethod | null; returnedOn: string | null }): string | null {
  if (repair.returnedOn === null || repair.paidAmount === null) return null;
  const day = dayMonthYear(repair.returnedOn);
  if (repair.paidAmount === 0 || repair.payMethod === null) return `Rendu sans paiement le ${day}`;
  // Un remplacement moins cher que l'appareil d'origine (étape 6) : le magasin a rendu de l'argent au client.
  if (repair.paidAmount < 0) return `Rendu au client ${formatPrice(-repair.paidAmount)} par ${PAYMENT_METHOD_LABELS[repair.payMethod]} le ${day}`;
  return `Payé ${formatPrice(repair.paidAmount)} par ${PAYMENT_METHOD_LABELS[repair.payMethod]} le ${day}`;
}

// Ce que chaque rôle voit et fait dans l'atelier (étape 5, cahier §11 et §14). C'est un choix d'AFFICHAGE : l'API
// refuse (403) tout ce que le rôle n'a pas, et retire de ses réponses l'argent du client (technicien) ou le prix
// d'achat (vendeur, responsable).
// - Le technicien avance la réparation et gère les pièces ; il voit leur prix d'achat, jamais l'argent du client.
// - Le vendeur et le responsable font la vente : fiche, devis, Rendu ; ils ne gèrent pas le stock.
// - L'admin fait tout.
export type RepairCapabilities = {
  createsRepair: boolean;
  editsRepair: boolean;
  seesClientMoney: boolean;
  deletesRepair: boolean;
  // Remplacer l'appareil sous garantie (étape 6) : un geste de vente, comme le Rendu.
  replacesDevice: boolean;
  createsPart: boolean;
  editsPart: boolean;
  seesPartCost: boolean;
  seesPartJournal: boolean;
};

export function repairCapabilities(role: Role): RepairCapabilities {
  const none: RepairCapabilities = {
    createsRepair: false,
    editsRepair: false,
    seesClientMoney: false,
    deletesRepair: false,
    replacesDevice: false,
    createsPart: false,
    editsPart: false,
    seesPartCost: false,
    seesPartJournal: false,
  };
  if (role === "admin") return Object.fromEntries(Object.keys(none).map((key) => [key, true])) as RepairCapabilities;
  // Le technicien (décision de Mehdi, 21/11 : chaque rôle a toutes les infos de sa page) fait toute la réparation : il
  // crée et modifie la fiche, fixe le prix, voit l'argent du client et le prix d'achat des pièces. Il ne supprime pas
  // une fiche, ne remplace pas un appareil (la caisse) et ne gère pas le stock (modifier une pièce, corriger).
  if (role === "technician") return { ...none, createsRepair: true, editsRepair: true, seesClientMoney: true, createsPart: true, seesPartCost: true, seesPartJournal: true };
  if (role === "seller" || role === "order_manager") return { ...none, createsRepair: true, editsRepair: true, seesClientMoney: true, replacesDevice: true };
  return none;
}

// Les passages d'étape proposés à ce rôle (comme canMoveTo côté API) : le technicien les a tous sauf Rendre l'appareil,
// qui encaisse dans la caisse du jour et reste à la vente.
export function allowedTargets(role: Role, targets: RepairStatus[]): RepairStatus[] {
  if (role !== "technician") return targets;
  return targets.filter((target) => target !== "returned");
}
