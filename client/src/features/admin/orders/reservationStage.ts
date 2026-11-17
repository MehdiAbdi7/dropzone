// L'étape d'une réservation illimitée avec avance BaridiMob (18/11), vue du magasin : « call » (le magasin doit
// encore appeler le client et lui envoyer le numéro), « advance » (le numéro est envoyé, le magasin attend
// l'avance), « confirmed » (l'avance est reçue : la réservation est confirmée, « en cours »). null pour une
// réservation de deux jours, qui n'a pas d'avance.
export type UnlimitedStage = "call" | "advance" | "confirmed";

type ReservationInfo = {
  reservationMode?: "two_days" | "unlimited" | null;
  baridiSharedAt?: string | null;
  advancePaidAt?: string | null;
};

export function unlimitedStage(order: ReservationInfo): UnlimitedStage | null {
  if (order.reservationMode !== "unlimited") return null;
  if (order.advancePaidAt) return "confirmed";
  return order.baridiSharedAt ? "advance" : "call";
}

const LABELS: Record<UnlimitedStage, string> = {
  call: "À appeler",
  advance: "Attente de l'avance",
  confirmed: "Avance reçue",
};

export const unlimitedStageLabel = (stage: UnlimitedStage): string => LABELS[stage];

// Dans la liste des réservations : « nouvelle » ou « en cours ». Une réservation de deux jours passe en cours quand
// elle est vue (le « Vu » de l'alerte) ; une illimitée quand son avance est reçue.
export function isOngoingReservation(order: ReservationInfo & { id: number }, acknowledged: number[]): boolean {
  const stage = unlimitedStage(order);
  return stage === null ? acknowledged.includes(order.id) : stage === "confirmed";
}
