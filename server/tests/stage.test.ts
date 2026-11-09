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
    // Sans place choisie : x, y, w et z à null, le front prend la place de départ.
    expect(response.body.data.hero.laptop).toEqual({ url: "https://x/socle.webp", label: null, x: null, y: null, w: null, z: null });
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
    expect((await request(app).put("/admin/stage/hero/layout").send({ slots: [] })).status).toBe(401);
  });
});

// Des emplacements en plus des 7 + 3 nommés (06/11, demande de Mehdi) : `extra-1`, `extra-2`…
describe("Les emplacements en plus", () => {
  it("accepte une photo dans un emplacement en plus, que la boutique lit avec les autres", async () => {
    expect((await send("hero", "extra-1")).status).toBe(200);
    expect((await send("deal", "extra-12")).status).toBe(200);
    const { data } = (await request(app).get("/stage")).body;
    expect(data.hero["extra-1"]).toMatchObject({ url: "https://x/socle.webp" });
    expect(data.deal["extra-12"]).toMatchObject({ url: "https://x/socle.webp" });
    // Un emplacement en plus sans photo n'existe pas : il n'est pas listé.
    expect(data.hero["extra-2"]).toBeUndefined();
  });

  it("refuse un nom d'emplacement mal formé", async () => {
    expect((await send("hero", "extra-0")).status).toBe(400);
    expect((await send("hero", "extra-abc")).status).toBe(400);
    expect((await send("hero", "extra-100")).status).toBe(400);
  });

  it("limite à 20 emplacements en plus par socle", async () => {
    await prisma.stageSlot.createMany({
      data: Array.from({ length: 20 }, (_, i) => ({ stage: "hero", slot: `extra-${i + 1}`, url: "https://x/a.webp" })),
    });
    expect((await send("hero", "extra-21")).status).toBe(409);
    // Remplacer la photo d'un emplacement qui existe reste possible.
    expect((await send("hero", "extra-3")).status).toBe(200);
  });

  it("se place comme les autres, et disparaît quand on retire sa photo", async () => {
    await send("hero", "extra-1");
    expect((await admin.put("/admin/stage/hero/layout").send({ slots: [{ slot: "extra-1", x: 1, y: 2, w: 20, z: 5 }] })).status).toBe(204);
    expect((await request(app).get("/stage")).body.data.hero["extra-1"]).toMatchObject({ x: 1, w: 20 });
    await admin.delete("/admin/stage/hero/extra-1/photo");
    expect((await request(app).get("/stage")).body.data.hero["extra-1"]).toBeUndefined();
  });

  it("permet de modifier l'intitulé d'un emplacement ajouté", async () => {
    await send("hero", "extra-1");
    const response = await admin.patch("/admin/stage/hero/extra-1/label").send({ label: " Support casque " });
    expect(response.status).toBe(204);
    expect((await request(app).get("/stage")).body.data.hero["extra-1"].label).toBe("Support casque");
  });

  it("permet de renommer un emplacement fixe vide, puis de le remplir sans perdre son nom", async () => {
    const response = await admin.patch("/admin/stage/hero/laptop/label").send({ label: "PC gaming" });
    expect(response.status).toBe(204);
    expect((await request(app).get("/stage")).body.data.labels.hero.laptop).toBe("PC gaming");
    await send("hero", "laptop");
    expect((await request(app).get("/stage")).body.data.hero.laptop).toMatchObject({ label: "PC gaming" });
  });

  it("refuse un intitulé vide ou trop long", async () => {
    await send("hero", "extra-1");
    expect((await admin.patch("/admin/stage/hero/extra-1/label").send({ label: " " })).status).toBe(400);
    expect((await admin.patch("/admin/stage/hero/extra-1/label").send({ label: "a".repeat(61) })).status).toBe(400);
  });
});

// Déplacer et redimensionner les photos à la souris ou au doigt (06/11).
describe("PUT /admin/stage/:stage/layout", () => {
  it("enregistre la place, la taille et l'ordre de chaque photo", async () => {
    await send("hero", "phone");
    await send("hero", "laptop");
    const response = await admin.put("/admin/stage/hero/layout").send({
      slots: [
        { slot: "phone", x: 55.5, y: 12, w: 40, z: 3 },
        { slot: "laptop", x: 10, y: 30, w: 70, z: 1 },
      ],
    });
    expect(response.status).toBe(204);
    const { hero } = (await request(app).get("/stage")).body.data;
    expect(hero.phone).toMatchObject({ x: 55.5, y: 12, w: 40, z: 3 });
    expect(hero.laptop).toMatchObject({ x: 10, y: 30, w: 70, z: 1 });
  });

  it("remet la place de départ avec des valeurs nulles", async () => {
    await send("hero", "phone");
    await admin.put("/admin/stage/hero/layout").send({ slots: [{ slot: "phone", x: 5, y: 5, w: 30, z: 2 }] });
    await admin.put("/admin/stage/hero/layout").send({ slots: [{ slot: "phone", x: null, y: null, w: null, z: null }] });
    expect((await request(app).get("/stage")).body.data.hero.phone).toMatchObject({ x: null, w: null });
  });

  it("ignore un emplacement sans photo, refuse un emplacement inconnu ou une taille hors bornes", async () => {
    expect((await admin.put("/admin/stage/hero/layout").send({ slots: [{ slot: "tablet", x: 1, y: 1, w: 30, z: 1 }] })).status).toBe(204);
    expect(await prisma.stageSlot.count()).toBe(0);
    expect((await admin.put("/admin/stage/hero/layout").send({ slots: [{ slot: "left", x: 1, y: 1, w: 30, z: 1 }] })).status).toBe(400);
    expect((await admin.put("/admin/stage/hero/layout").send({ slots: [{ slot: "phone", x: 1, y: 1, w: 500, z: 1 }] })).status).toBe(400);
  });
});
