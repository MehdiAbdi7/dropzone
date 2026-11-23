import type { OrderStatus, OrderType } from "@/types/api";

// La logique de « Mon compte » (23/11), à part de l'écran pour être testée.

// La mini-frise d'une carte de commande : les étapes que le client attend, celle atteinte, et le ton du badge.
// « ongoing » : en cours ; « done » : finie ; « stopped » : annulée, retournée ou expirée (pas de frise).
export type OrderProgress = { steps: string[]; reached: number; tone: "ongoing" | "done" | "stopped" };

const DELIVERY: { label: string; statuses: OrderStatus[] }[] = [
  { label: "Reçue", statuses: ["pending"] },
  { label: "Confirmée", statuses: ["confirmed"] },
  { label: "Expédiée", statuses: ["shipped"] },
  // « Encaissée » est une étape du magasin (l'argent est arrivé) : pour le client, le colis est livré.
  { label: "Livrée", statuses: ["delivered", "collected"] },
];
const PICKUP: { label: string; statuses: OrderStatus[] }[] = [
  { label: "Réservée", statuses: ["reserved"] },
  { label: "Récupérée", statuses: ["picked_up"] },
];
const STOPPED: OrderStatus[] = ["cancelled", "returned", "expired"];

export function orderProgress(type: OrderType, status: OrderStatus): OrderProgress {
  if (STOPPED.includes(status)) return { steps: [], reached: -1, tone: "stopped" };
  const steps = type === "delivery" ? DELIVERY : type === "pickup" ? PICKUP : null;
  // Un achat ou un échange au magasin se termine au comptoir : rien à suivre.
  if (!steps) return { steps: [], reached: -1, tone: "done" };
  const reached = steps.findIndex((step) => step.statuses.includes(status));
  return { steps: steps.map((step) => step.label), reached, tone: reached === steps.length - 1 ? "done" : "ongoing" };
}

// Le bouton « Enregistrer » ne s'allume que si un champ a vraiment changé (les espaces autour ne comptent pas,
// le serveur les retire).
export function profileChanged<T extends Record<string, string>>(saved: T, form: T): boolean {
  return (Object.keys(saved) as (keyof T)[]).some((key) => saved[key].trim() !== form[key].trim());
}
