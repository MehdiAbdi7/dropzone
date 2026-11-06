import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : l'envoi rend une adresse sans quitter le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/socle.webp", publicId: "dropzone/stage/socle" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// Les photos du socle de l'accueil (06/11) : des emplacements fixes, une photo libre dans
// chacun, envoyée depuis la page Accueil du back-office.
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  await prisma.stageSlot.deleteMany();
  ({ agent: admin } = await loginAs("admin"));
});

const send = (stage: string, slot: string) =>
  admin
    .post(`/admin/stage/${stage}/${slot}/photo`)
    .attach("image", Buffer.from("fake"), { filename: "photo.png", contentType: "image/png" });

describe("GET /stage", () => {
  it("donne chaque emplacement du hero et du bandeau, vide au départ", async () => {
    const response = await request(app).get("/stage");
    expect(response.status).toBe(200);
    expect(response.body.data.hero).toEqual({
      laptop: null,
      phone: null,
      tablet: null,
      accessory1: null,
      accessory2: null,
      accessory3: null,
      accessory4: null,
    });
    expect(response.body.data.deal).toEqual({ left: null, center: null, right: null });
  });
});

describe("La photo d'un emplacement", () => {
  it("range la photo envoyée, que la boutique lit ensuite", async () => {
    expect((await send("hero", "laptop")).status).toBe(200);
    const response = await request(app).get("/stage");
    expect(response.body.data.hero.laptop).toBe("https://x/socle.webp");
  });

  it("remplace la photo d'un emplacement déjà rempli", async () => {
    await send("deal", "center");
    await send("deal", "center");
    expect(await prisma.stageSlot.count()).toBe(1);
  });

  it("refuse un emplacement qui n'existe pas", async () => {
    expect((await send("hero", "toaster")).status).toBe(400);
    expect((await send("cuisine", "laptop")).status).toBe(400);
  });

  it("retire la photo : l'emplacement redevient vide", async () => {
    await send("hero", "phone");
    expect((await admin.delete("/admin/stage/hero/phone/photo")).status).toBe(204);
    expect((await request(app).get("/stage")).body.data.hero.phone).toBeNull();
  });

  it("est réservé à l'admin", async () => {
    expect((await request(app).delete("/admin/stage/hero/phone/photo")).status).toBe(401);
  });
});
