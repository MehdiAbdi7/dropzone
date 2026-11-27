import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../src/config/cloudinary.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : rien ne quitte le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  VARIANT_FOLDER: "dropzone/variants",
  isCloudinaryReady: vi.fn(() => true),
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/photo.webp", publicId: "dropzone/variants/photo" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// Les photos et la vidéo d'une variante, ajoutées depuis le back-office (26/11, demande de Mehdi : la vidéo de la story
// Instagram d'un téléphone). Une photo traverse l'API (4 Mo au plus). La vidéo, depuis le 27/11, est le lien d'un Reel
// Instagram : rien n'est envoyé, l'API vérifie la forme du lien et n'en garde que l'adresse propre. Une variante épuisée
// refuse tout, les plafonds sont de 8 photos et 1 vidéo.
beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  await createCatalog();
});

const fake = Buffer.from("fichier");
const variantId = (sku: string) => prisma.productVariant.findUniqueOrThrow({ where: { sku } }).then((variant) => variant.id);
const photo = { filename: "photo.png", contentType: "image/png" };
const mediaOf = (id: number) => prisma.variantMedia.findMany({ where: { variantId: id }, orderBy: { position: "asc" } });
const seed = (id: number, kind: "photo" | "video", position: number) =>
  prisma.variantMedia.create({ data: { variantId: id, kind, url: `https://x/${position}`, publicId: `pid-${id}-${kind}-${position}`, position } });
const reelLink = "https://www.instagram.com/reel/DgPh-ZvNLX9/";
const postReel = (agent: Awaited<ReturnType<typeof loginAs>>["agent"], id: number, url = reelLink) =>
  agent.post(`/admin/variants/${id}/media/reel`).send({ url });

describe("POST /admin/variants/:id/media (une photo)", () => {
  it("ajoute une photo à la dernière position", async () => {
    const id = await variantId("IP-R-DEAL");
    await seed(id, "photo", 0);
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, photo);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ kind: "photo", url: "https://x/photo.webp", position: 1, posterUrl: null });
    expect((await mediaOf(id)).map((item) => item.position)).toEqual([0, 1]);
    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
  });

  it("limite la largeur d'une photo à 1600 px à l'envoi (la bande passante est la contrainte, pas la finesse)", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    await agent.post(`/admin/variants/${id}/media`).attach("media", fake, photo).expect(201);

    expect(uploadToCloudinary).toHaveBeenCalledWith(expect.any(Buffer), "dropzone/variants", { maxWidth: 1600 });
  });

  it("refuse l'envoi sur une variante épuisée, sans appeler Cloudinary", async () => {
    const id = await variantId("IP-R-SOLD");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, photo);

    expect(response.status).toBe(409);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
    expect(await mediaOf(id)).toHaveLength(0);
  });

  it("refuse une neuvième photo", async () => {
    const id = await variantId("IP-R-DEAL");
    for (let position = 0; position < 8; position++) await seed(id, "photo", position);
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, photo);

    expect(response.status).toBe(409);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it("refuse un PDF", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, { filename: "a.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(400);
  });

  it("refuse un fichier vidéo : la vidéo est un lien de Reel Instagram", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, { filename: "story.mp4", contentType: "video/mp4" });

    expect(response.status).toBe(400);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it("refuse proprement une photo au-dessus de 4 Mo (413, pas 500)", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", Buffer.alloc(4 * 1024 * 1024 + 1), photo);

    expect(response.status).toBe(413);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it("répond 404 pour une variante inconnue", async () => {
    const { agent } = await loginAs("admin");

    const response = await agent.post("/admin/variants/999999/media").attach("media", fake, photo);

    expect(response.status).toBe(404);
  });

  it("répond 403 à un vendeur", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("seller");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, photo);

    expect(response.status).toBe(403);
  });
});

describe("POST /admin/variants/:id/media/reel (la vidéo : le lien d'un Reel Instagram)", () => {
  it("enregistre l'adresse propre du Reel, sans vignette à nous et sans rien envoyer à Cloudinary", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await postReel(agent, id, `${reelLink}?igsh=abc123&utm_source=ig_web_copy_link`);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ kind: "video", url: reelLink, posterUrl: null });
    const [saved] = await mediaOf(id);
    expect(saved).toMatchObject({ kind: "video", url: reelLink, publicId: null });
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it("refuse une story, un autre site et ce qui n'est pas un lien (400), sans rien écrire", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    for (const url of ["https://www.instagram.com/stories/dropzone.officiel/3812345678901234567/", "https://youtu.be/abc", "pas un lien"]) {
      expect((await postReel(agent, id, url)).status).toBe(400);
    }
    expect(await mediaOf(id)).toHaveLength(0);
  });

  it("refuse une variante épuisée (409)", async () => {
    const id = await variantId("IP-R-DEAL");
    await prisma.productVariant.update({ where: { id }, data: { stock: 0 } });
    const { agent } = await loginAs("admin");

    expect((await postReel(agent, id)).status).toBe(409);
    expect(await mediaOf(id)).toHaveLength(0);
  });

  it("refuse une deuxième vidéo (409) et garde la première", async () => {
    const id = await variantId("IP-R-DEAL");
    await seed(id, "video", 0);
    const { agent } = await loginAs("admin");

    expect((await postReel(agent, id)).status).toBe(409);
    expect(await mediaOf(id)).toHaveLength(1);
  });

  it("deux liens en même temps : une seule vidéo est gardée", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const [first, second] = await Promise.all([postReel(agent, id), postReel(agent, id, "https://www.instagram.com/reel/AbCdE12345/")]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await mediaOf(id)).toHaveLength(1);
  });

  it("répond 404 pour une variante inconnue et 403 à un vendeur", async () => {
    const admin = await loginAs("admin");
    expect((await postReel(admin.agent, 999999)).status).toBe(404);
    const seller = await loginAs("seller");
    expect((await postReel(seller.agent, await variantId("IP-R-DEAL"))).status).toBe(403);
  });
});

describe("DELETE /admin/variants/:id/media/:mediaId", () => {
  it("retire un lien de Reel de la base sans rien demander à Cloudinary", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");
    const created = await postReel(agent, id);

    await agent.delete(`/admin/variants/${id}/media/${created.body.data.id}`).expect(204);

    expect(await mediaOf(id)).toHaveLength(0);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("retire le média de la base et de Cloudinary (une vidéo avec son type)", async () => {
    const id = await variantId("IP-R-DEAL");
    const item = await seed(id, "video", 0);
    const { agent } = await loginAs("admin");

    const response = await agent.delete(`/admin/variants/${id}/media/${item.id}`);

    expect(response.status).toBe(204);
    expect(await mediaOf(id)).toHaveLength(0);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(`pid-${id}-video-0`, "video");
  });

  it("répond 404 pour un média d'une autre variante", async () => {
    const id = await variantId("IP-R-DEAL");
    const other = await variantId("IP-R-WIFI");
    const item = await seed(other, "photo", 0);
    const { agent } = await loginAs("admin");

    const response = await agent.delete(`/admin/variants/${id}/media/${item.id}`);

    expect(response.status).toBe(404);
    expect(await mediaOf(other)).toHaveLength(1);
  });
});

describe("PUT /admin/variants/:id/media/order", () => {
  it("change l'ordre des médias", async () => {
    const id = await variantId("IP-R-DEAL");
    const first = await seed(id, "photo", 0);
    const second = await seed(id, "photo", 1);
    const { agent } = await loginAs("admin");

    const response = await agent.put(`/admin/variants/${id}/media/order`).send({ ids: [second.id, first.id] });

    expect(response.status).toBe(200);
    expect((await mediaOf(id)).map((item) => item.id)).toEqual([second.id, first.id]);
  });

  it("refuse une liste qui contient le média d'une autre variante", async () => {
    const id = await variantId("IP-R-DEAL");
    const mine = await seed(id, "photo", 0);
    const foreign = await seed(await variantId("IP-R-WIFI"), "photo", 0);
    const { agent } = await loginAs("admin");

    const response = await agent.put(`/admin/variants/${id}/media/order`).send({ ids: [mine.id, foreign.id] });

    expect(response.status).toBe(400);
  });
});
