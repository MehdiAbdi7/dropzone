// Crée le premier compte admin. Aucune route de l'API ne permet de devenir admin :
// seul ce script, lancé par quelqu'un qui a accès au serveur, le peut.
//   ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run create-admin
// (les deux variables peuvent aussi être dans le .env)
import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password || password.length < 8) {
  console.error("ADMIN_EMAIL et ADMIN_PASSWORD (8 caractères au minimum) sont obligatoires.");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 10);
const admin = await prisma.user.upsert({
  where: { email },
  update: { role: "admin", passwordHash },
  create: {
    email,
    passwordHash,
    role: "admin",
    firstName: "Admin",
    lastName: "DropZone",
    phone: "0550000000",
  },
});
console.log(`Compte admin prêt : ${admin.email}`);
await prisma.$disconnect();
