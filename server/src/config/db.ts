import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// `omit` : le hash du mot de passe n'est jamais renvoyé, sauf si une requête
// le redemande explicitement (la connexion). L'équivalent du `select: false` de Mongoose.
export const prisma = new PrismaClient({
  adapter,
  omit: { user: { passwordHash: true } },
});

// Le type du client à l'intérieur d'une transaction (`prisma.$transaction(async (tx) => …)`) :
// le même client, sans les méthodes interdites dans une transaction. Une fonction qui
// reçoit un `Tx` accepte donc aussi `prisma` lui-même.
export type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">;

export async function connectDB(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  console.log("PostgreSQL connecté");
}
