import type { Request, Response } from "express";
import { changeEmail, changePassword, getProfile, login, register, updateProfile } from "./auth.service.js";
import { clearTokenCookie, setTokenCookie } from "./token.js";

export async function postRegister(req: Request, res: Response) {
  const user = await register(req.body);
  setTokenCookie(res, user.id, user.role);
  res.status(201).json({ data: user });
}

export async function postLogin(req: Request, res: Response) {
  const user = await login(req.body.email, req.body.password);
  setTokenCookie(res, user.id, user.role);
  res.json({ data: user });
}

export function postLogout(_req: Request, res: Response) {
  clearTokenCookie(res);
  res.status(204).end();
}

export async function getMe(_req: Request, res: Response) {
  res.json({ data: await getProfile(res.locals.user!.id) });
}

export async function patchMe(req: Request, res: Response) {
  res.json({ data: await updateProfile(res.locals.user!.id, req.body) });
}

// Mon compte : le mot de passe et l'email, avec le mot de passe actuel. Pas de nouveau cookie : la session
// ouverte reste valable (elle ne porte ni l'email ni le mot de passe).
export async function patchPassword(req: Request, res: Response) {
  await changePassword(res.locals.user!.id, req.body.currentPassword, req.body.newPassword);
  res.json({ data: { changed: true } });
}

export async function patchEmail(req: Request, res: Response) {
  res.json({ data: await changeEmail(res.locals.user!.id, req.body.currentPassword, req.body.email) });
}
