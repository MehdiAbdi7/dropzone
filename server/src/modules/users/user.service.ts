import bcrypt from "bcryptjs";
import { prisma } from "../../config/db.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../../utils/AppError.js";
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

// Donne un nouveau mot de passe à un CLIENT (15/11) : il n'y a pas de « mot de passe oublié » par email, l'admin en
// choisit un et le lui donne. Jamais pour un compte administrateur : un administrateur change le sien dans
// « Mon compte », et cette route ne doit pas permettre de prendre un autre compte administrateur. Un compte
// administrateur répond comme un compte inconnu (404). Seul le mot de passe change ; le nouveau est chiffré.
export async function resetCustomerPassword(id: number, newPassword: string) {
  const customer = await prisma.user.findFirst({ where: { id, role: "customer" }, select: { id: true } });
  if (!customer) {
    throw new AppError(404, "Client introuvable");
  }
  // Les sessions déjà ouvertes avec l'ancien mot de passe sont coupées (lot 7).
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10), tokenVersion: { increment: 1 } },
  });
}
