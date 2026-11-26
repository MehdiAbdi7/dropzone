import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFromCloudinary } from "../src/config/cloudinary.js";
import { prisma } from "../src/config/db.js";
import { purgeSoldMedia, startMediaSweep } from "../src/modules/products/soldMedia.service.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(),
  uploadVideoToCloudinary: vi.fn(),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// Ce qui se vend se supprime (26/11, décision de Mehdi) : dès que le stock d'une variante tombe à 0, ses photos et sa
// vidéo disparaissent de la base et de Cloudinary. Une occasion est presque toujours un seul exemplaire : la vidéo est
// faite pour lui. Un neuf à plusieurs exemplaires garde ses médias jusqu'au dernier.
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  catalog = await createCatalog();
});

const variantId = (sku: string) => prisma.productVariant.findUniqueOrThrow({ where: { sku } }).then((variant) => variant.id);
const mediaCount = (id: number) => prisma.variantMedia.count({ where: { variantId: id } });
const settle = () => new Promise((resolve) => setTimeout(resolve, 250));

// Une photo et une vidéo posées sur la variante.
async function seedMedia(id: number, tag = "a") {
  await prisma.variantMedia.createMany({
    data: [
      { variantId: id, kind: "photo", url: `https://x/${tag}.webp`, publicId: `photo-${tag}`, position: 0 },
      { variantId: id, kind: "video", url: `https://x/${tag}.mp4`, publicId: `video-${tag}`, position: 1 },
    ],
  });
}

const expectFilesDestroyed = async (tag: string) => {
  await vi.waitFor(() => {
    expect(deleteFromCloudinary).toHaveBeenCalledWith(`photo-${tag}`, "photo");
    expect(deleteFromCloudinary).toHaveBeenCalledWith(`video-${tag}`, "video");
  });
};

describe("une vente qui prend le dernier exemplaire", () => {
  it("commande du site : supprime les médias, base et Cloudinary", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);

    const response = await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);

    expect(response.status).toBe(201);
    await vi.waitFor(async () => expect(await mediaCount(id)).toBe(0));
    await expectFilesDestroyed("a");
  });

  it("vente au comptoir : fait de même", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);
    const { agent } = await loginAs("admin");
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);

    await agent
      .post("/admin/sales")
      .send({ fullName: "Amine Test", phone: "0555 12 34 56", method: "cash", lines: [{ sku: "IP-R-DEAL", quantity: 1 }] })
      .expect(201);

    await vi.waitFor(async () => expect(await mediaCount(id)).toBe(0));
    await expectFilesDestroyed("a");
  });

  it("un échec de Cloudinary n'empêche pas la vente et les lignes sont quand même supprimées", async () => {
    vi.mocked(deleteFromCloudinary).mockRejectedValue(new Error("Cloudinary indisponible"));
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);

    const response = await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);

    expect(response.status).toBe(201);
    await vi.waitFor(async () => expect(await mediaCount(id)).toBe(0));
  });
});

describe("un stock qui ne tombe pas à 0", () => {
  it("un neuf à 3 exemplaires dont on prend un garde ses médias", async () => {
    const id = await variantId("IP-NEW-256");
    await seedMedia(id);

    await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
    await settle();

    expect(await mediaCount(id)).toBe(2);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("une simple lecture ne supprime rien", async () => {
    const id = await variantId("IP-R-SOLD");
    await seedMedia(id);

    const { agent } = await loginAs("admin");
    await agent.get("/admin/products").expect(200);
    await settle();

    expect(await mediaCount(id)).toBe(2);
  });
});

describe("la fiche produit du back-office", () => {
  // Un Galaxy à deux variantes, avec le corps du formulaire qui les décrit.
  async function galaxy() {
    const product = await prisma.product.create({
      data: {
        name: "Galaxy S24 Ultra",
        slug: "galaxy-s24-ultra",
        description: "Grand écran",
        categoryId: catalog.phones.id,
        deviceModelId: catalog.galaxy.id,
        brandId: catalog.samsungBrand.id,
        status: "published",
        variants: {
          create: [
            { sku: "S24U-A", price: 170000, stock: 2, warrantyMonths: 12 },
            { sku: "S24U-B", price: 175000, stock: 1, warrantyMonths: 12 },
          ],
        },
      },
      select: { id: true, variants: { select: { id: true, sku: true }, orderBy: { sku: "asc" } } },
    });
    const body = (variants: { id: number; sku: string; stock: number }[]) => ({
      name: "Galaxy S24 Ultra",
      description: "Grand écran",
      categoryId: catalog.phones.id,
      deviceModelId: catalog.galaxy.id,
      brandId: catalog.samsungBrand.id,
      status: "published",
      variants: variants.map((variant) => ({ ...variant, price: 170000, condition: "new", warrantyMonths: 12 })),
    });
    return { product, body };
  }

  it("mettre le stock d'une variante à 0 supprime ses médias", async () => {
    const { product, body } = await galaxy();
    const [first, second] = product.variants;
    await seedMedia(first.id);
    const { agent } = await loginAs("admin");

    await agent
      .patch(`/admin/products/${product.id}`)
      .send(body([{ ...first, stock: 0 }, { ...second, stock: 1 }]))
      .expect(200);

    await vi.waitFor(async () => expect(await mediaCount(first.id)).toBe(0));
    await expectFilesDestroyed("a");
  });

  it("retirer une variante du formulaire supprime ses fichiers Cloudinary", async () => {
    const { product, body } = await galaxy();
    const [first, second] = product.variants;
    await seedMedia(second.id, "b");
    const { agent } = await loginAs("admin");

    await agent.patch(`/admin/products/${product.id}`).send(body([{ ...first, stock: 2 }])).expect(200);

    await expectFilesDestroyed("b");
    expect(await prisma.variantMedia.count()).toBe(0);
  });

  it("supprimer un produit supprime les fichiers de ses variantes", async () => {
    const { product } = await galaxy();
    await seedMedia(product.variants[0].id, "c");
    const { agent } = await loginAs("admin");

    await agent.delete(`/admin/products/${product.id}`).expect(204);

    await expectFilesDestroyed("c");
  });
});

describe("purgeSoldMedia", () => {
  it("supprime les médias d'une variante à 0 posés à la main, sans toucher aux autres (filet de sécurité)", async () => {
    const sold = await variantId("IP-R-SOLD");
    const inStock = await variantId("IP-R-WIFI");
    await seedMedia(sold, "sold");
    await seedMedia(inStock, "stock");

    const count = await purgeSoldMedia();

    expect(count).toBe(2);
    expect(await mediaCount(sold)).toBe(0);
    expect(await mediaCount(inStock)).toBe(2);
    await expectFilesDestroyed("sold");
  });

  it("ne rend 0 et n'appelle pas Cloudinary quand il n'y a rien à supprimer", async () => {
    expect(await purgeSoldMedia()).toBe(0);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });
});

describe("startMediaSweep", () => {
  it("lance le balayage à intervalle régulier", async () => {
    const purge = vi.fn(async () => 0);

    const timer = startMediaSweep(20, purge);
    await vi.waitFor(() => expect(purge.mock.calls.length).toBeGreaterThanOrEqual(2));
    clearInterval(timer);
  });
});
