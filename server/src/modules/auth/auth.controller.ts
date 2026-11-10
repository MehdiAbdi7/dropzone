import type { Request, Response } from "express";
import { getProfile, login, register, updateProfile } from "./auth.service.js";
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
