import type { Request, Response } from "express";
import { createAccount, listAccounts, resetStaffPassword, updateAccount } from "./account.service.js";

export async function getAccounts(_req: Request, res: Response) {
  res.json({ data: await listAccounts() });
}

export async function postAccount(req: Request, res: Response) {
  res.status(201).json({ data: await createAccount(req.body) });
}

export async function patchAccount(req: Request, res: Response) {
  res.json({ data: await updateAccount(res.locals.user!.id, Number(req.params.id), req.body) });
}

export async function postAccountPassword(req: Request, res: Response) {
  await resetStaffPassword(Number(req.params.id), req.body.newPassword);
  res.json({ data: { changed: true } });
}
