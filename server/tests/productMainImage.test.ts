import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { deleteFromCloudinary, uploadToCloudinary } from "../src/config/cloudinary.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : l'envoi rend une adresse sans quitter le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/nouvelle.webp", publicId: "dropzone/products/nouvelle" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// Changer la photo principale d'un produit d'un clic (24/11, demande de Mehdi : la photo du modèle à côté du titre de la
// fiche). La nouvelle photo prend la place de l'ancienne, qui est supprimée : le nombre de photos ne change pas.
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  catalog = await createCatalog();
});

const png = Buffer.from("fausse image");
const productId = () => prisma.product.findFirstOrThrow({ where: { slug: "iphone-15-pro-max" } }).then((product) => product.id);
const imagesOf = (id: number) => prisma.productImage.findMany({ where: { productId: id }, orderBy: { position: "asc" } });

describe("PUT /admin/products/:id/main-image", () => {
  it("remplace la première photo à sa place, supprime l'ancienne et garde les autres", async () => {
    const id = await productId();
    await prisma.productImage.createMany({
      data: [
        { productId: id, url: "https://x/ancienne.webp", publicId: "dropzone/products/ancienne", position: 0 },
        { productId: id, url: "https://x/deuxieme.webp", publicId: "dropzone/products/deuxieme", position: 1 },
      ],
    });
    const { agent } = await loginAs("admin");

    const response = await agent.put(`/admin/products/${id}/main-image`).attach("image", png, { filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    const images = await imagesOf(id);
    expect(images.map((image) => [image.url, image.position])).toEqual([
      ["https://x/nouvelle.webp", 0],
      ["https://x/deuxieme.webp", 1],
    ]);
    expect(deleteFromCloudinary).toHaveBeenCalledWith("dropzone/products/ancienne");
    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
  });

  it("sans photo, la nouvelle devient la première", async () => {
    const id = await productId();
    const { agent } = await loginAs("admin");

    const response = await agent.put(`/admin/products/${id}/main-image`).attach("image", png, { filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect((await imagesOf(id)).map((image) => [image.url, image.position])).toEqual([["https://x/nouvelle.webp", 0]]);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("garde le nombre de photos même quand le produit en a déjà le maximum", async () => {
    const id = await productId();
    await prisma.productImage.createMany({
      data: Array.from({ length: 6 }, (_, position) => ({ productId: id, url: `https://x/${position}.webp`, publicId: `p/${position}`, position })),
    });
    const { agent } = await loginAs("admin");

    const response = await agent.put(`/admin/products/${id}/main-image`).attach("image", png, { filename: "photo.png", contentType: "image/png" });

    expect(response.status).toBe(200);
    expect(await imagesOf(id)).toHaveLength(6);
  });

  it("refuse une requête sans image, un produit inconnu et un rôle qui n'est pas admin", async () => {
    const id = await productId();
    const admin = await loginAs("admin");
    expect((await admin.agent.put(`/admin/products/${id}/main-image`)).status).toBe(400);
    expect(
      (await admin.agent.put("/admin/products/999999/main-image").attach("image", png, { filename: "photo.png", contentType: "image/png" })).status,
    ).toBe(404);

    const seller = await loginAs("seller");
    expect(
      (await seller.agent.put(`/admin/products/${id}/main-image`).attach("image", png, { filename: "photo.png", contentType: "image/png" })).status,
    ).toBe(403);
    expect(catalog.iphone.id).toBeGreaterThan(0);
  });
});
