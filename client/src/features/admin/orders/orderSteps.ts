import { STATUS_LABELS } from "@/config/catalog";
import type { OrderStatus, OrderType } from "@/types/api";

// Le circuit d'une commande, pour la frise de la fenêtre (Commandes). Une livraison avance de pastille
// en pastille ; un retrait n'en a que deux. Une vente au magasin n'a pas d'étapes (elle est encaissée
// sur place) : pas de frise. Annulée, Retournée et Expirée sont des sorties : pas des étapes, mais
// une pastille rouge ajoutée au bout.
export type StepState = "done" | "current" | "upcoming" | "exit";
export type OrderStep = { status: OrderStatus; label: string; state: StepState };

const DELIVERY_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "À confirmer" },
  { status: "confirmed", label: "En préparation" },
  { status: "shipped", label: "Expédiée" },
  { status: "delivered", label: "Livrée" },
  { status: "collected", label: "Encaissée" },
];

const PICKUP_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "reserved", label: "Réservée" },
  { status: "picked_up", label: "Récupérée" },
];

export function orderSteps(type: OrderType, status: OrderStatus): OrderStep[] {
  const base = type === "delivery" ? DELIVERY_STEPS : type === "pickup" ? PICKUP_STEPS : [];
  const at = base.findIndex((step) => step.status === status);

  // Une sortie : on ne sait pas de quelle étape la commande est partie (une annulation peut venir de
  // « À confirmer » comme d'« Expédiée »), donc toutes les étapes restent grises.
  if (at === -1) {
    if (base.length === 0) return [];
    return [...base.map((step) => ({ ...step, state: "upcoming" as const })), { status, label: STATUS_LABELS[status], state: "exit" as const }];
  }

  const last = base.length - 1;
  return base.map((step, index) => ({
    ...step,
    // La dernière étape, une fois atteinte, est finie : rien ne vient après (pas de « en cours »).
    state: index < at || (index === at && at === last) ? "done" : index === at ? "current" : "upcoming",
  }));
}

// La pastille sur laquelle la fenêtre s'ouvre : l'étape en cours, la dernière si tout est fini, la
// sortie si la commande est sortie du circuit.
export function initialStep(steps: OrderStep[]): number {
  const current = steps.findIndex((step) => step.state === "current" || step.state === "exit");
  return current === -1 ? steps.length - 1 : current;
}

// Le badge placé devant une commande dans le tableau : où elle en est, d'un coup d'œil. « 3/5 ·
// Expédiée » pour une étape du circuit ; le nom seul pour une sortie (annulée, retournée, expirée) ou
// une vente au magasin, qui n'ont pas de position.
export function stepBadge(type: OrderType, status: OrderStatus): string {
  const steps = orderSteps(type, status);
  const at = steps.findIndex((step) => step.status === status);
  if (at === -1 || steps[at].state === "exit") return STATUS_LABELS[status];
  const total = steps.filter((step) => step.state !== "exit").length;
  return `${at + 1}/${total} · ${steps[at].label}`;
}
