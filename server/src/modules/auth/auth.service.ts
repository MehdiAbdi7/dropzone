import bcrypt from "bcryptjs";
import { prisma } from "../../config/db.js";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
import type { RegisterInput } from "./auth.schema.js";

const SALT_ROUNDS = 10;
const WRONG_CREDENTIALS = "Email ou mot de passe incorrect";

// Un hash calculé une fois, comparé quand l'email n'existe pas : la réponse prend
// le même temps, on ne devine pas qu'un compte existe en chronométrant.
const DUMMY_HASH = bcrypt.hashSync("dropzone-dummy-password", SALT_ROUNDS);

export async function register(input: RegisterInput) {
  const { password, ...data } = input;
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    return await prisma.user.create({ data: { ...data, passwordHash } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Un compte existe déjà avec cet email");
    }
    throw error;
  }
}

export async function getProfile(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new AppError(401, "Connexion requise");
  }
  return user;
}

export async function updateProfile(id: number, data: Prisma.UserUpdateInput) {
  return prisma.user.update({ where: { id }, data });
}

// Vérifie le mot de passe actuel de celui qui demande un changement sensible (email, mot de passe). Un
// mauvais mot de passe est une erreur 400, pas 401 : le client n'est pas déconnecté, il se corrige.
async function requireCurrentPassword(id: number, password: string) {
  const user = await prisma.user.findUnique({ where: { id }, omit: { passwordHash: false } });
  if (!user) {
    throw new AppError(401, "Connexion requise");
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(400, "Le mot de passe actuel est incorrect");
  }
  return user;
}

export async function changePassword(id: number, currentPassword: string, newPassword: string) {
  const user = await requireCurrentPassword(id, currentPassword);
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    throw new AppError(400, "Choisissez un mot de passe différent de l'actuel");
  }
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(newPassword, SALT_ROUNDS) } });
}

export async function changeEmail(id: number, currentPassword: string, email: string) {
  const user = await requireCurrentPassword(id, currentPassword);
  if (user.email === email) {
    throw new AppError(400, "C'est déjà l'email de ce compte");
  }
  try {
    return await prisma.user.update({ where: { id }, data: { email } });
  } catch (error) {
    // L'index unique de la base décide : même email écrit autrement, ou deux demandes en même temps.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Un compte existe déjà avec cet email");
    }
    throw error;
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    omit: { passwordHash: false },
  });
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  // Un compte désactivé répond comme un mauvais mot de passe : rien n'indique qu'il existe.
  if (!user || !valid || user.disabled) {
    // Le même message que l'email ou le mot de passe soit faux.
    throw new AppError(401, WRONG_CREDENTIALS);
  }
  const { passwordHash: _hash, ...safeUser } = user;
  return safeUser;
}
