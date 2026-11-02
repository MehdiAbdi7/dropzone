import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { validate } from "../../middlewares/validate.js";
import { escapeLike } from "../../utils/escapeLike.js";
import { paginate, paginationMeta, paginationQuery } from "../../utils/pagination.js";

// La liste des clients du back-office, en lecture seule.
const listQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

async function getCustomers(_req: Request, res: Response) {
  const query = res.locals.query as z.infer<typeof listQuerySchema>;
  const contains = query.q ? escapeLike(query.q) : undefined;
  const where: Prisma.UserWhereInput = {
    role: "customer",
    OR: contains
      ? [
          { email: { contains, mode: "insensitive" } },
          { lastName: { contains, mode: "insensitive" } },
          { phone: { contains } },
        ]
      : undefined,
  };
  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginate(query.page, query.limit),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        addressWilaya: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);
  res.json({ data: users, pagination: paginationMeta(query.page, query.limit, total) });
}

export const userAdminRouter = Router();
userAdminRouter.get("/customers", validate({ query: listQuerySchema }), getCustomers);
