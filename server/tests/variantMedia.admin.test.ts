import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { deleteFromCloudinary, getUploadedVideo, signVideoUpload, uploadToCloudinary } from "../src/config/cloudinary.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : rien ne quitte le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  VARIANT_FOLDER: "dropzone/variants",
  isCloudinaryReady: vi.fn(() => true),
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/photo.webp", publicId: "dropzone/variants/photo" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
  signVideoUpload: vi.fn((variantId: number) => ({
    cloudName: "demo",
    apiKey: "123",
    timestamp: 1_700_000_000,
    signature: "signature",
    publicId: `dropzone/variants/v${variantId}-abc`,
    format: "mp4",
    allowedFormats: "mp4,mov,webm",
    overwrite: "false",
    transformation: "c_limit,q_auto,w_720",
  })),
  getUploadedVideo: vi.fn(async () => ({ url: "https://x/video/upload/story.mp4", bytes: 8_000_000, duration: 15, width: 720 })),
  listVariantVideos: vi.fn(async () => []),
}));

// Les photos et la vidéo d'une variante, ajoutées depuis le back-office (26/11, demande de Mehdi : la vidéo de la story
// Instagram d'un téléphone). Une photo traverse l'API (4 Mo au plus) ; une vidéo part directement du navigateur chez
// Cloudinary : l'API signe l'envoi (identifiant choisi par elle, formats limités) puis enregistre ce que Cloudinary a
// reçu, après avoir vérifié sa taille, sa durée et qu'elle a bien une image. Une variante épuisée refuse tout, les
// plafonds sont de 8 photos et 1 vidéo.
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
// L'identifiant d'une vidéo envoyée pour la variante `id` : celui que l'API a signé (`v<id>-…`).
const videoId = (id: number, suffix = "story") => `dropzone/variants/v${id}-${suffix}`;
const registerVideo = (agent: Awaited<ReturnType<typeof loginAs>>["agent"], id: number, publicId = videoId(id)) =>
  agent.post(`/admin/variants/${id}/media/video`).send({ publicId });

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

  it("refuse une vidéo envoyée par ici : elle part directement chez Cloudinary", async () => {
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

describe("POST /admin/variants/:id/media/video-upload (signer l'envoi direct d'une vidéo)", () => {
  it("rend les paramètres signés, avec un identifiant choisi par l'API et lié à la variante", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await agent.post(`/admin/variants/${id}/media/video-upload`).expect(200);

    expect(signVideoUpload).toHaveBeenCalledWith(id);
    expect(response.body.data).toEqual({
      cloudName: "demo",
      apiKey: "123",
      timestamp: 1_700_000_000,
      signature: "signature",
      publicId: `dropzone/variants/v${id}-abc`,
      format: "mp4",
      allowedFormats: "mp4,mov,webm",
      overwrite: "false",
      transformation: "c_limit,q_auto,w_720",
    });
  });

  it("refuse de signer pour une variante épuisée", async () => {
    const id = await variantId("IP-R-SOLD");
    const { agent } = await loginAs("admin");

    await agent.post(`/admin/variants/${id}/media/video-upload`).expect(409);

    expect(signVideoUpload).not.toHaveBeenCalled();
  });

  it("refuse de signer quand la variante a déjà sa vidéo", async () => {
    const id = await variantId("IP-R-DEAL");
    await seed(id, "video", 0);
    const { agent } = await loginAs("admin");

    await agent.post(`/admin/variants/${id}/media/video-upload`).expect(409);

    expect(signVideoUpload).not.toHaveBeenCalled();
  });

  it("répond 404 pour une variante inconnue et 403 à un vendeur", async () => {
    const admin = await loginAs("admin");
    await admin.agent.post("/admin/variants/999999/media/video-upload").expect(404);
    const seller = await loginAs("seller");
    await seller.agent.post(`/admin/variants/${await variantId("IP-R-DEAL")}/media/video-upload`).expect(403);
  });
});

describe("POST /admin/variants/:id/media/video (enregistrer la vidéo envoyée)", () => {
  it("enregistre la vidéo avec l'adresse que Cloudinary a reçue (jamais celle du navigateur) et sa vignette", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id);

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ kind: "video", url: "https://x/video/upload/story.mp4", posterUrl: "https://x/video/upload/story.jpg" });
    expect(getUploadedVideo).toHaveBeenCalledWith(videoId(id));
    expect(await mediaOf(id)).toHaveLength(1);
  });

  it("refuse un identifiant hors du dossier des variantes, sans rien supprimer", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id, "dropzone/products/autre");

    expect(response.status).toBe(400);
    expect(getUploadedVideo).not.toHaveBeenCalled();
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("refuse l'identifiant signé pour une AUTRE variante, sans rien supprimer", async () => {
    const id = await variantId("IP-R-DEAL");
    const other = await variantId("IP-R-WIFI");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id, videoId(other));

    expect(response.status).toBe(400);
    expect(getUploadedVideo).not.toHaveBeenCalled();
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("répond 404 quand Cloudinary n'a pas cette vidéo", async () => {
    vi.mocked(getUploadedVideo).mockResolvedValueOnce(null);
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id);

    expect(response.status).toBe(404);
    expect(await mediaOf(id)).toHaveLength(0);
  });

  it("refuse une vidéo de plus de 50 Mo (413) et la supprime de Cloudinary", async () => {
    vi.mocked(getUploadedVideo).mockResolvedValueOnce({ url: "https://x/video/upload/gros.mp4", bytes: 50 * 1024 * 1024 + 1, duration: 15, width: 720 });
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id, videoId(id, "gros"));

    expect(response.status).toBe(413);
    expect(await mediaOf(id)).toHaveLength(0);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(videoId(id, "gros"), "video");
  });

  it("refuse une vidéo de plus de 120 s (la compression à l'envoi cache sa vraie taille) et la supprime", async () => {
    vi.mocked(getUploadedVideo).mockResolvedValueOnce({ url: "https://x/video/upload/longue.mp4", bytes: 9_000_000, duration: 300, width: 720 });
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id, videoId(id, "longue"));

    expect(response.status).toBe(413);
    expect(await mediaOf(id)).toHaveLength(0);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(videoId(id, "longue"), "video");
  });

  it("refuse un fichier sans image (un son que Cloudinary range avec les vidéos) et le supprime", async () => {
    vi.mocked(getUploadedVideo).mockResolvedValueOnce({ url: "https://x/video/upload/son.mp4", bytes: 1_000_000, duration: 20, width: 0 });
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id, videoId(id, "son"));

    expect(response.status).toBe(400);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(videoId(id, "son"), "video");
  });

  it("refuse une deuxième vidéo (409) et supprime la nouvelle de Cloudinary, pas l'ancienne", async () => {
    const id = await variantId("IP-R-DEAL");
    await seed(id, "video", 0);
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id, videoId(id, "deuxieme"));

    expect(response.status).toBe(409);
    expect(await mediaOf(id)).toHaveLength(1);
    expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(videoId(id, "deuxieme"), "video");
  });

  it("refuse une variante épuisée (409) et supprime la vidéo de Cloudinary", async () => {
    const id = await variantId("IP-R-SOLD");
    const { agent } = await loginAs("admin");

    const response = await registerVideo(agent, id);

    expect(response.status).toBe(409);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(videoId(id), "video");
  });

  it("refuse d'enregistrer deux fois la même vidéo, sans jamais supprimer celle qui est déjà enregistrée", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");
    await registerVideo(agent, id).expect(201);

    const response = await registerVideo(agent, id);

    expect(response.status).toBe(409);
    expect(await mediaOf(id)).toHaveLength(1);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("la même vidéo enregistrée deux fois en même temps : une ligne, et le fichier du gagnant n'est jamais supprimé", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const [first, second] = await Promise.all([registerVideo(agent, id), registerVideo(agent, id)]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await mediaOf(id)).toHaveLength(1);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("deux enregistrements en même temps : une seule vidéo est gardée, l'autre est supprimée de Cloudinary", async () => {
    const id = await variantId("IP-R-DEAL");
    const { agent } = await loginAs("admin");

    const [first, second] = await Promise.all([registerVideo(agent, id, videoId(id, "a")), registerVideo(agent, id, videoId(id, "b"))]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(await mediaOf(id)).toHaveLength(1);
    expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
    expect(deleteFromCloudinary).toHaveBeenCalledWith(expect.stringMatching(/^dropzone\/variants\/v\d+-[ab]$/), "video");
  });

  it("répond 403 à un vendeur", async () => {
    const { agent } = await loginAs("seller");

    await registerVideo(agent, await variantId("IP-R-DEAL")).expect(403);
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
