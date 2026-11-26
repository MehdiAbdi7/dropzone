import { PICKUP_STEPS } from "@/config/catalog";
import type { OrderDetail } from "@/types/api";

// Les étapes d'une réservation sur la page de suivi, selon son mode (26/11). Deux jours : réservée jusqu'à la fermeture
// du magasin le jour choisi, puis l'appareil revient en vente. Illimitée : pas de jour choisi, donc pas de délai ni de
// remise en vente toute seule (le magasin annule à la main) ; le client passe quand il veut et règle le reste, l'avance
// étant déduite. Une commande d'avant le mode (null ou absent) garde le texte des deux jours.
export function pickupSteps(mode: OrderDetail["reservationMode"]): typeof PICKUP_STEPS {
  if (mode !== "unlimited") {
    return PICKUP_STEPS;
  }
  return PICKUP_STEPS.map((step) =>
    step.status === "reserved"
      ? { ...step, text: "Appareil réservé à votre nom, sans date limite. Vous le récupérez quand vous voulez et réglez le reste au magasin." }
      : step,
  );
}
