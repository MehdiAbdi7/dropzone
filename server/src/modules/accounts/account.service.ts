import bcrypt from "bcryptjs";
import { prisma } from "../../config/db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import type { CreateAccountInput, UpdateAccountInput } from "./account.schema.js";

const SALT_ROUNDS = 10;

// Ce qu'on montre d'un compte : jamais le hash du mot de passe.
const accountSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  disabled: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

// Le personnel : tout compte qui n'est pas un client.
export function listAccounts() {
  return prisma.user.findMany({
    where: { role: { not: "customer" } },
    orderBy: { createdAt: "asc" },
    select: accountSelect,
  });
}

export async function createAccount(input: CreateAccountInput) {
  const { password, phone, ...rest } = input;
  try {
    return await prisma.user.create({
      // La colonne du téléphone n'accepte pas null : un compte sans numéro en garde un vide.
      data: { ...rest, phone: phone ?? "", passwordHash: await bcrypt.hash(password, SALT_ROUNDS) },
      select: accountSelect,
    });
  } catch (error) {
    // L'index unique de la base décide : même email écrit autrement, ou deux demandes en même temps.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Un compte existe déjà avec cet email");
    }
    throw error;
  }
}

// Changer le rôle d'un compte ou le désactiver. Deux protections : on ne se retire pas ses propres droits, et
// il reste toujours un administrateur actif. La seconde est lue sous verrou : deux admins qui se désactivent
// l'un l'autre au même instant ne peuvent pas réussir tous les deux.
export async function updateAccount(actorId: number, id: number, input: UpdateAccountInput) {
  // Un changement de rôle ne mène jamais à « admin » (voir le schéma) : pour un admin, c'est toujours une perte.
  const losesAdmin = input.role !== undefined || input.disabled === true;
  if (id === actorId && losesAdmin) {
    throw new AppError(409, "Vous ne pouvez pas retirer vos propres droits ni désactiver votre propre compte");
  }
  return prisma.$transaction(async (tx) => {
    // Les administrateurs actifs, verrouillés dans un ordre fixe : une seule modification à la fois les touche.
    const activeAdmins = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM users WHERE role = 'admin'::"Role" AND disabled = false ORDER BY id FOR UPDATE`;
    const target = await tx.user.findFirst({ where: { id, role: { not: "customer" } }, select: { id: true, role: true, disabled: true } });
    if (!target) {
      throw new AppError(404, "Compte introuvable");
    }
    const wasActiveAdmin = activeAdmins.some((admin) => admin.id === target.id);
    if (wasActiveAdmin && losesAdmin && !activeAdmins.some((admin) => admin.id !== target.id)) {
      throw new AppError(409, "Il doit rester au moins un administrateur actif");
    }
    // Désactiver coupe aussi les sessions ouvertes : sans cela, réactiver le compte ferait revivre un ancien
    // cookie. Un simple changement de rôle les garde : le rôle est relu en base à chaque requête.
    const revoke = input.disabled === true ? { tokenVersion: { increment: 1 } } : {};
    return tx.user.update({ where: { id }, data: { ...input, ...revoke }, select: accountSelect });
  });
}

// Un nouveau mot de passe pour un vendeur ou un responsable. Jamais pour un client (il a sa route) ni pour un
// administrateur : un administrateur change le sien dans « Mon compte », et cette route ne doit pas permettre
// de prendre un autre compte administrateur. Dans ces deux cas, le compte répond comme un compte inconnu.
export async function resetStaffPassword(id: number, newPassword: string) {
  const account = await prisma.user.findFirst({ where: { id, role: { in: ["seller", "order_manager", "technician"] } }, select: { id: true } });
  if (!account) {
    throw new AppError(404, "Compte introuvable");
  }
  // Les sessions déjà ouvertes avec l'ancien mot de passe sont coupées.
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS), tokenVersion: { increment: 1 } },
  });
}
