import { resetPasswordProblem } from "@/features/admin/customers/resetPassword";
import type { Role } from "@/types/api";

// La page Comptes (lot 7) : ce que le formulaire refuse tout de suite, en français, avant d'appeler l'API (qui
// refuserait de toute façon, avec les mêmes règles).

export type StaffRole = Exclude<Role, "customer">;

// Du plus haut au plus bas. Le libellé est ce que l'écran affiche ; la valeur est celle de la base.
export const STAFF_ROLES: StaffRole[] = ["admin", "order_manager", "seller"];
export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrateur",
  order_manager: "Responsable commande",
  seller: "Vendeur",
};

// Vers quel rôle on peut changer un compte déjà créé : jamais vers « admin ». On devient administrateur à la
// création du compte seulement (sinon un admin pourrait rétrograder un autre admin, lui donner un mot de passe,
// puis le re-promouvoir : il connaîtrait le mot de passe d'un autre administrateur). Pour faire d'un compte
// un administrateur, on en crée un nouveau.
export function roleChoices(current: StaffRole): Exclude<StaffRole, "admin">[] {
  return (["order_manager", "seller"] as const).filter((role) => role !== current);
}

export type AccountInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: StaffRole;
  password: string;
};

// Ce qu'on envoie à l'API : sans téléphone s'il est vide (il est facultatif pour le personnel).
export type AccountPayload = Omit<AccountInput, "phone"> & { phone?: string };

export type AccountCheck = { ok: true; value: AccountPayload } | { ok: false; errors: Partial<Record<keyof AccountInput, string>> };

// Un email sans espace, avec un @ et un domaine pointé : la même exigence que l'API, sans prétendre tout valider.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Un numéro algérien (fixe ou mobile), comme à l'inscription : 0 puis 2 à 7, puis huit chiffres.
const PHONE = /^0[2-7]\d{8}$/;

export function validateAccount(input: AccountInput): AccountCheck {
  const errors: Partial<Record<keyof AccountInput, string>> = {};
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const phone = input.phone.replace(/[\s.-]/g, "");

  if (firstName.length < 2) errors.firstName = "Le prénom : 2 caractères au minimum.";
  if (lastName.length < 2) errors.lastName = "Le nom : 2 caractères au minimum.";
  if (!EMAIL.test(email)) errors.email = "Saisissez un email valide, par exemple nom@exemple.dz.";
  if (phone !== "" && !PHONE.test(phone)) errors.phone = "Un numéro algérien, par exemple 0555 12 34 56 (facultatif).";
  if (!STAFF_ROLES.includes(input.role)) errors.role = "Choisissez un rôle.";
  const passwordIssue = resetPasswordProblem(input.password);
  if (passwordIssue) errors.password = passwordIssue;

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { firstName, lastName, email, role: input.role, password: input.password, ...(phone ? { phone } : {}) } };
}
