import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { PASSWORD, resetDb } from "./helpers.js";

// Le lot 7 (17/11) : deux rôles de plus pour le personnel du magasin, et un compte qu'on peut désactiver.
beforeEach(resetDb);

const newUser = (role: "seller" | "order_manager", email: string) =>
  prisma.user.create({
    data: { firstName: "Sami", lastName: "Test", email, phone: "0555123456", role, passwordHash: PASSWORD },
  });

describe("rôles du personnel et compte désactivable", () => {
  it("accepte les rôles vendeur et responsable commande", async () => {
    expect((await newUser("seller", "vendeur@test.dz")).role).toBe("seller");
    expect((await newUser("order_manager", "responsable@test.dz")).role).toBe("order_manager");
  });

  it("un compte n'est pas désactivé par défaut", async () => {
    expect((await newUser("seller", "vendeur@test.dz")).disabled).toBe(false);
  });
});
