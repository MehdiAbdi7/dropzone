import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { deleteFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary } from "../src/config/cloudinary.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : rien ne quitte le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/photo.webp", publicId: "dropzone/products/photo" })),
  uploadVideoToCloudinary: vi.fn(async () => ({ url: "https://x/video/upload/story.mp4", publicId: "dropzone/variants/story" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// Les photos et la vidéo d'une variante, ajoutées depuis le back-office (26/11, demande de Mehdi : la vidéo de la story
// Instagram d'un téléphone). Une variante épuisée refuse l'envoi, les plafonds sont de 8 photos et 1 vidéo.
beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  await createCatalog();
});

const fake = Buffer.from("fichier");
const variantId = (sku: string) => prisma.productVariant.findUniqueOrThrow({ where: { sku } }).then((variant) => variant.id);
const photo = { filename: "photo.png", contentType: "image/png" };
const video = { filename: "story.mp4", contentType: "video/mp4" };
const mediaOf = (id: number) => prisma.variantMedia.findMany({ where: { variantId: id }, orderBy: { position: "asc" } });
const seed = (id: number, kind: "photo" | "video", position: number) =>
  prisma.variantMedia.create({ data: { variantId: id, kind, url: `https://x/${position}`, publicId: `pid-${kind}-${position}`, position } });

describe("POST /admin/variants/:id/media", () => {
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

  it("ajoute une vidéo avec sa vignette en .jpg, sans passer par l'envoi des photos", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, video);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ kind: "video", posterUrl: "https://x/video/upload/story.jpg" });
    expect(uploadVideoToCloudinary).toHaveBeenCalledTimes(1);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
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

  it("deux vidéos envoyées en même temps : une seule est gardée, l'autre est supprimée de Cloudinary", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");
    // Les deux envois passent la vérification des plafonds avant que l'un ait fini : la deuxième vidéo n'arrive pas
    // en base, c'est la vérification faite sous verrou, juste avant l'enregistrement, qui la refuse.
    let calls = 0;
    let open!: () => void;
    const gate = new Promise<void>((resolve) => {
      open = resolve;
    });
    vi.mocked(uploadVideoToCloudinary).mockImplementation(async () => {
      const number = ++calls;
      if (number === 2) open();
      await gate;
      return { url: `https://x/video/upload/v${number}.mp4`, publicId: `dropzone/variants/v${number}` };
    });

    const [first, second] = await Promise.all([
      agent.post(`/admin/variants/${id}/media`).attach("media", fake, video),
      agent.post(`/admin/variants/${id}/media`).attach("media", fake, video),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await mediaOf(id)).toHaveLength(1);
    expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(expect.stringMatching(/^dropzone\/variants\/v[12]$/), "video");
  });

  it("refuse une deuxième vidéo", async () => {
    const id = await variantId("IP-R-DEAL");
    await seed(id, "video", 0);
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, video);

    expect(response.status).toBe(409);
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled();
  });

  it("refuse un PDF", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", fake, { filename: "a.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(400);
  });

  it("refuse proprement un fichier au-dessus de 50 Mo (413, pas 500)", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media`).attach("media", Buffer.alloc(50 * 1024 * 1024 + 1), video);

    expect(response.status).toBe(413);
    expect(uploadVideoToCloudinary).not.toHaveBeenCalled();
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

describe("DELETE /admin/variants/:id/media/:mediaId", () => {
  it("retire le média de la base et de Cloudinary (une vidéo avec son type)", async () => {
    const id = await variantId("IP-R-DEAL");
    const item = await seed(id, "video", 0);
    const { agent } = await loginAs("admin");

    const response = await agent.delete(`/admin/variants/${id}/media/${item.id}`);

    expect(response.status).toBe(204);
    expect(await mediaOf(id)).toHaveLength(0);
    expect(deleteFromCloudinary).toHaveBeenCalledWith("pid-video-0", "video");
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
