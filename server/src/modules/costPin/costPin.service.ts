import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";

// Le code à 4 chiffres des prix d'achat (27/11, demande de Mehdi). Le back-office cache par défaut tout ce qui révèle un
// prix d'achat (le prix lui-même, la marge, le bénéfice) : un client qui regarde l'écran du vendeur ne le voit pas. L'admin
// choisit le code à la main (Réglages) et le donne à ses employés ; taper le code montre les prix, un bouton les recache.
// Sans code réglé, la protection est coupée : rien n'est caché (le comportement d'avant).

// Le code est gardé chiffré (scrypt avec un sel au hasard), jamais en clair : lire la base ne donne pas le code d'un coup.
// Quatre chiffres ne font que 10 000 possibilités : un code volé avec la base se retrouve vite. Le vrai garde-fou est la
// limite d'essais de la route de vérification (rateLimiters.ts).
const KEY_LENGTH = 32;

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, KEY_LENGTH).toString("hex")}`;
}

export function pinMatches(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  // `timingSafeEqual` : la comparaison dure autant de temps que le code soit juste ou faux.
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

async function storedHash(): Promise<string | null> {
  const settings = await prisma.storeSettings.findUniqueOrThrow({ where: { id: 1 }, select: { costPinHash: true } });
  return settings.costPinHash;
}

// Un code est-il réglé ? (Le back-office n'en cache les prix que si oui.)
export async function isCostPinSet(): Promise<boolean> {
  return (await storedHash()) !== null;
}

export async function setCostPin(pin: string): Promise<void> {
  await prisma.storeSettings.update({ where: { id: 1 }, data: { costPinHash: hashPin(pin) } });
}

export async function clearCostPin(): Promise<void> {
  await prisma.storeSettings.update({ where: { id: 1 }, data: { costPinHash: null } });
}

// Le code tapé est-il le bon ? Sans code réglé, il n'y a rien à déverrouiller : refusé clairement plutôt que « bon » par erreur.
export async function checkCostPin(pin: string): Promise<void> {
  const stored = await storedHash();
  if (stored === null) {
    throw new AppError(409, "Aucun code n'est réglé");
  }
  if (!pinMatches(pin, stored)) {
    throw new AppError(401, "Code incorrect");
  }
}
