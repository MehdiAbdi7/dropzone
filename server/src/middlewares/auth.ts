import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";
import type { Role } from "../generated/prisma/client.js";
import { TOKEN_COOKIE, verifyToken } from "../modules/auth/token.js";
import { AppError } from "../utils/AppError.js";

// Relit l'utilisateur en base à chaque requête : un compte supprimé ou un rôle
// retiré prend effet tout de suite, sans attendre l'expiration du jeton.
async function readUser(req: Request) {
  const token: unknown = req.cookies?.[TOKEN_COOKIE];
  if (typeof token !== "string") {
    return null;
  }
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, role: true, disabled: true, tokenVersion: true },
  });
  // Un compte désactivé (lot 7) est traité comme un compte supprimé : refusé dès la requête suivante. Une
  // session ouverte avant un changement de mot de passe ou une désactivation porte un ancien numéro de
  // version : refusée aussi, même si le compte est réactivé depuis.
  if (!user || user.disabled || user.tokenVersion !== payload.tokenVersion) {
    return null;
  }
  return { id: user.id, role: user.role };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await readUser(req);
  if (!user) {
    throw new AppError(401, "Connexion requise");
  }
  res.locals.user = user;
  next();
}

// Pour les routes ouvertes à tous, mais qui changent si le client est connecté
// (une commande est rattachée à son compte).
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  res.locals.user = (await readUser(req)) ?? undefined;
  next();
}

export function requireRole(role: Role) {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (res.locals.user?.role !== role) {
      throw new AppError(403, "Accès refusé");
    }
    next();
  };
}
