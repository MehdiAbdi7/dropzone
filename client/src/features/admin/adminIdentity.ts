import type { Role } from "@/types/api";

// Qui est connecté, montré dans la barre latérale et la barre du haut du back-office (19/11).

// Les initiales de l'avatar : la première lettre du prénom et du nom. « ? » quand on n'a aucun nom.
export function initialsOf(firstName: string, lastName: string): string {
  const letters = [firstName, lastName].map((part) => [...part.trim()][0]?.toUpperCase() ?? "").join("");
  return letters === "" ? "?" : letters;
}

// Les initiales d'un client à partir de son nom complet (20/11, listes de commandes) : le premier et le dernier mot.
export function nameInitials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  return initialsOf(words[0] ?? "", words.length > 1 ? words[words.length - 1] : "");
}

// « jeudi 19 novembre » : le jour à Alger (le fuseau est fixé, sinon un navigateur à l'étranger changerait de jour
// à une autre heure que le magasin).
export function todayLabel(now: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Algiers" }).format(now);
}

const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  order_manager: "Responsable commande",
  seller: "Vendeur",
  technician: "Technicien",
  customer: "Client",
};

export const roleLabel = (role: Role): string => ROLE_LABELS[role];
