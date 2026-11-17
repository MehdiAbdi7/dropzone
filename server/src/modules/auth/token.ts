import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../../config/env.js";
import type { Role } from "../../generated/prisma/client.js";

export const TOKEN_COOKIE = "token";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

// httpOnly : le JavaScript de la page ne peut pas lire le jeton (protège d'un vol par XSS).
// sameSite lax : grâce au relais /api du front, le navigateur ne parle qu'à un seul domaine.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

// `tv` : le numéro de version des sessions du compte au moment de la connexion. Absent des jetons émis avant
// le lot 7 : il vaut alors 0, comme la colonne `users.token_version` de départ.
type TokenPayload = { sub: string; role: Role; tv?: number };

function signToken(userId: number, role: Role, tokenVersion: number): string {
  return jwt.sign({ role, tv: tokenVersion }, env.JWT_SECRET, { subject: String(userId), expiresIn: "7d" });
}

export function verifyToken(token: string): { id: number; role: Role; tokenVersion: number } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    return { id: Number(payload.sub), role: payload.role, tokenVersion: payload.tv ?? 0 };
  } catch {
    return null;
  }
}

export function setTokenCookie(res: Response, userId: number, role: Role, tokenVersion: number) {
  res.cookie(TOKEN_COOKIE, signToken(userId, role, tokenVersion), { ...cookieOptions, maxAge: SEVEN_DAYS });
}

export function clearTokenCookie(res: Response) {
  res.clearCookie(TOKEN_COOKIE, cookieOptions);
}
