// Réinitialiser le mot de passe d'un client depuis la page Clients (15/11). Même règle que l'API : 8 caractères au
// minimum, 72 au plus (bcrypt ignore la fin).
export function resetPasswordProblem(password: string): string | null {
  if (password.length < 8) return "Le mot de passe : 8 caractères au minimum.";
  if (password.length > 72) return "Le mot de passe : 72 caractères au plus.";
  return null;
}

// Sans les caractères qu'on confond à la lecture ou au téléphone : 0 O o, 1 l I.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

// Un mot de passe de 10 caractères tirés au hasard par le navigateur (`crypto`, pas `Math.random`). Le tirage
// écarte les octets qui favoriseraient les premiers caractères (256 n'est pas un multiple de la taille de
// l'alphabet), pour que chaque caractère ait la même chance.
export function generatePassword(length = 10): string {
  const limit = 256 - (256 % ALPHABET.length);
  let password = "";
  while (password.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (byte < limit && password.length < length) password += ALPHABET[byte % ALPHABET.length];
    }
  }
  return password;
}
