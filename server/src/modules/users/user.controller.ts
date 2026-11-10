import type { Request, Response } from "express";
import type { CustomerListQuery } from "./user.schema.js";
import { listCustomers } from "./user.service.js";

export async function getCustomers(_req: Request, res: Response) {
  const { users, pagination } = await listCustomers(res.locals.query as CustomerListQuery);
  res.json({ data: users, pagination });
}
