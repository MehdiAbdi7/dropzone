import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Les photos et la vidéo d'une variante dans les réponses de l'API (26/11) : le site les montre sous le téléphone, le
// back-office les gère. La vignette (`posterUrl`) n'existe que pour une vidéo.
beforeEach(async () => {
  await resetDb();
  await createCatalog();
  const deal = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-R-DEAL" } });
  await prisma.variantMedia.createMany({
    data: [
      { variantId: deal.id, kind: "video", url: "https://x/video/upload/story.mp4", publicId: "v", position: 1 },
      { variantId: deal.id, kind: "photo", url: "https://x/dos.webp", publicId: "p", position: 0 },
    ],
  });
});

const variantOf = (variants: { sku: string; media: unknown[] }[], sku: string) => variants.find((variant) => variant.sku === sku)!;

describe("GET /products/:slug", () => {
  it("rend les médias d'une variante dans l'ordre, la vignette seulement pour la vidéo", async () => {
    const response = await request(app).get("/products/iphone-15-pro-max").expect(200);

    expect(variantOf(response.body.data.variants, "IP-R-DEAL").media).toEqual([
      { kind: "photo", url: "https://x/dos.webp", posterUrl: null },
      { kind: "video", url: "https://x/video/upload/story.mp4", posterUrl: "https://x/video/upload/story.jpg" },
    ]);
  });

  it("rend media: [] pour une variante sans média", async () => {
    const response = await request(app).get("/products/iphone-15-pro-max").expect(200);

    expect(variantOf(response.body.data.variants, "IP-R-WIFI").media).toEqual([]);
  });

  it("ne montre pas les médias d'une variante à stock 0 (un neuf épuisé reste affiché, « Rupture de stock »)", async () => {
    const neuf = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-NEW-256" } });
    await prisma.variantMedia.create({ data: { variantId: neuf.id, kind: "photo", url: "https://x/neuf.webp", publicId: "n", position: 0 } });
    await prisma.productVariant.update({ where: { id: neuf.id }, data: { stock: 0 } });

    const response = await request(app).get("/products/iphone-15-pro-max").expect(200);

    expect(variantOf(response.body.data.variants, "IP-NEW-256").media).toEqual([]);
  });
});

describe("GET /admin/products/:id", () => {
  it("rend aussi les identifiants et la position des médias", async () => {
    const product = await prisma.product.findFirstOrThrow({ where: { slug: "iphone-15-pro-max" } });
    const { agent } = await loginAs("admin");

    const response = await agent.get(`/admin/products/${product.id}`).expect(200);

    const media = variantOf(response.body.data.variants, "IP-R-DEAL").media;
    expect(media).toEqual([
      { id: expect.any(Number), kind: "photo", url: "https://x/dos.webp", posterUrl: null, position: 0 },
      { id: expect.any(Number), kind: "video", url: "https://x/video/upload/story.mp4", posterUrl: "https://x/video/upload/story.jpg", position: 1 },
    ]);
  });
});
