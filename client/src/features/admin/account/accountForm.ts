// Mon compte du back-office : ce que la page refuse tout de suite, en français, avant d'appeler l'API (qui
// refuserait de toute façon, avec les mêmes règles : 8 caractères au minimum, 72 au plus car bcrypt ignore
// la fin). Le premier problème seulement ; null = on peut envoyer.

export function passwordProblem(input: { current: string; next: string; confirm: string }): string | null {
  if (input.current === "") return "Saisissez votre mot de passe actuel.";
  if (input.next.length < 8) return "Le nouveau mot de passe : 8 caractères au minimum.";
  if (input.next.length > 72) return "Le nouveau mot de passe : 72 caractères au plus.";
  if (input.next !== input.confirm) return "Les deux mots de passe ne sont pas identiques.";
  if (input.next === input.current) return "Choisissez un mot de passe différent de l'actuel.";
  return null;
}

// Un email sans espace, avec un @ et un domaine pointé : la même exigence que l'API, sans prétendre tout valider.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailProblem(input: { current: string; email: string; currentEmail: string }): string | null {
  if (input.current === "") return "Saisissez votre mot de passe actuel.";
  const email = input.email.trim();
  if (!EMAIL.test(email)) return "Saisissez un email valide, par exemple nom@exemple.dz.";
  if (email.toLowerCase() === input.currentEmail.toLowerCase()) return "C'est déjà l'email de ce compte.";
  return null;
}
