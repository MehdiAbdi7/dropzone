import type { Request, Response } from "express";
import { getInvoiceSettings, issueInvoice, saveInvoiceSettings } from "./invoice.service.js";

export async function getSettings(_req: Request, res: Response) {
  res.json({ data: await getInvoiceSettings() });
}

export async function putSettings(req: Request, res: Response) {
  res.json({ data: await saveInvoiceSettings(req.body) });
}

// POST : la première ouverture attribue le numéro (un effet de bord), les suivantes sont sans effet.
export async function postInvoice(req: Request, res: Response) {
  res.json({ data: await issueInvoice(Number(req.params.id), new Date(), res.locals.user!.role) });
}
