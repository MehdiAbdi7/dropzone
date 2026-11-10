import { prisma } from "../../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { escapeLike } from "../../utils/escapeLike.js";
import { paginate, paginationMeta } from "../../utils/pagination.js";
import type { CustomerListQuery } from "./user.schema.js";

export async function listCustomers(query: CustomerListQuery) {
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
  return { users, pagination: paginationMeta(query.page, query.limit, total) };
}
