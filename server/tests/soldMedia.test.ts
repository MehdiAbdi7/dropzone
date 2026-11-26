import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { deleteFromCloudinary, isCloudinaryReady, listVariantVideos } from "../src/config/cloudinary.js";
import { prisma } from "../src/config/db.js";
import {
  destroyMediaFiles,
  purgeSoldMedia,
  retryMediaOrphans,
  startMediaSweep,
  sweepMedia,
  sweepStrayVideos,
} from "../src/modules/products/soldMedia.service.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(),
  isCloudinaryReady: vi.fn(() => true),
  deleteFromCloudinary: vi.fn(async () => undefined),
  listVariantVideos: vi.fn(async () => []),
}));

// Ce qui se vend se supprime (26/11, décision de Mehdi, précisée le même jour) : les photos et la vidéo d'une variante
// partent quand la VENTE est faite, pas quand une commande prend le dernier exemplaire. Une commande en attente, une
// réservation (deux jours ou illimitée) ou une livraison en cours gardent les médias : si le client ne vient pas, la
// réservation expire, l'article revient en vente et doit retrouver ses photos et sa vidéo. La vente est faite quand
// la commande est payée : vente au comptoir, échange ou remplacement (récupérée tout de suite), réservation
// récupérée, livraison encaissée. Un neuf à plusieurs exemplaires garde ses médias jusqu'au dernier.
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  vi.clearAllMocks();
  // `clearAllMocks` n'efface pas ce qu'un test a imposé (un échec de Cloudinary, une liste de vidéos) : on le remet à zéro
  // pour qu'un test ne déteigne pas sur le suivant.
  vi.mocked(deleteFromCloudinary).mockReset();
  vi.mocked(deleteFromCloudinary).mockResolvedValue(undefined);
  vi.mocked(listVariantVideos).mockReset();
  vi.mocked(listVariantVideos).mockResolvedValue([]);
  vi.mocked(isCloudinaryReady).mockReset();
  vi.mocked(isCloudinaryReady).mockReturnValue(true);
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

async function counterSale(sku: string) {
  const { agent } = await loginAs("admin");
  await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  await agent
    .post("/admin/sales")
    .send({ fullName: "Amine Test", phone: "0555 12 34 56", method: "cash", lines: [{ sku, quantity: 1 }] })
    .expect(201);
}

describe("une vente faite (payée)", () => {
  it("vente au comptoir : supprime les médias tout de suite, base et Cloudinary", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);

    await counterSale("IP-R-DEAL");

    await vi.waitFor(async () => expect(await mediaCount(id)).toBe(0));
    await expectFilesDestroyed("a");
  });

  it("un échec de Cloudinary n'empêche pas la vente et les lignes sont quand même supprimées", async () => {
    vi.mocked(deleteFromCloudinary).mockRejectedValue(new Error("Cloudinary indisponible"));
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);

    await counterSale("IP-R-DEAL");

    await vi.waitFor(async () => expect(await mediaCount(id)).toBe(0));
  });

  it("un échec de Cloudinary laisse une trace, et le balayage suivant réessaie jusqu'à réussir", async () => {
    vi.mocked(deleteFromCloudinary).mockRejectedValue(new Error("Cloudinary indisponible"));
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);
    await counterSale("IP-R-DEAL");
    await vi.waitFor(async () => expect(await prisma.mediaOrphan.count()).toBe(2));

    // Cloudinary revient : le balayage réessaie, supprime les fichiers et efface la trace.
    vi.mocked(deleteFromCloudinary).mockResolvedValue(undefined);
    expect(await retryMediaOrphans()).toBe(2);

    expect(await prisma.mediaOrphan.count()).toBe(0);
    expect(deleteFromCloudinary).toHaveBeenCalledWith("photo-a", "photo");
    expect(deleteFromCloudinary).toHaveBeenCalledWith("video-a", "video");
  });

  it("un fichier dont la suppression échoue encore garde sa trace pour le balayage d'après", async () => {
    await prisma.mediaOrphan.create({ data: { publicId: "reste", kind: "video" } });
    vi.mocked(deleteFromCloudinary).mockRejectedValue(new Error("Cloudinary indisponible"));

    expect(await retryMediaOrphans()).toBe(0);

    expect(await prisma.mediaOrphan.count()).toBe(1);
  });

  it("une commande du site payée à la livraison (encaissée) supprime les médias", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);
    await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]).then((response) => expect(response.status).toBe(201));
    await settle();
    await prisma.order.updateMany({ data: { status: "collected" } });

    await purgeSoldMedia();

    expect(await mediaCount(id)).toBe(0);
    await expectFilesDestroyed("a");
  });
});

describe("une commande qui n'est pas encore une vente", () => {
  it("une commande du site en attente garde les médias, même après une écriture de l'API", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);

    const response = await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);
    await settle();

    expect(response.status).toBe(201);
    expect(await mediaCount(id)).toBe(2);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("chaque état en cours garde les médias (confirmée, expédiée, livrée, réservée) ; récupérée les supprime", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);
    await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);
    await settle();

    for (const status of ["confirmed", "shipped", "delivered", "reserved"] as const) {
      await prisma.order.updateMany({ data: { status } });
      expect(await purgeSoldMedia(), status).toBe(0);
      expect(await mediaCount(id), status).toBe(2);
    }

    await prisma.order.updateMany({ data: { status: "picked_up" } });
    expect(await purgeSoldMedia()).toBe(2);
  });

  it("une commande annulée ou expirée qui remet le stock garde les médias", async () => {
    const id = await variantId("IP-R-DEAL");
    await seedMedia(id);
    await previewThenOrder([{ sku: "IP-R-DEAL", quantity: 1 }]);
    await settle();
    await prisma.order.updateMany({ data: { status: "cancelled" } });
    await prisma.productVariant.update({ where: { id }, data: { stock: 1 } });

    expect(await purgeSoldMedia()).toBe(0);

    expect(await mediaCount(id)).toBe(2);
  });
});

describe("un stock qui ne tombe pas à 0", () => {
  it("un neuf à 3 exemplaires dont on prend un garde ses médias", async () => {
    const id = await variantId("IP-NEW-256");
    await seedMedia(id);

    await counterSale("IP-NEW-256");
    await settle();

    expect(await mediaCount(id)).toBe(2);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("une écriture publique (aperçu d'un panier) ne lance aucune suppression", async () => {
    const id = await variantId("IP-R-SOLD");
    await seedMedia(id);

    await request(app).post("/orders/preview").send({ items: [{ sku: "IP-R-WIFI", quantity: 1 }] }).expect(200);
    await settle();

    expect(await mediaCount(id)).toBe(2);
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

  it("mettre le stock d'une variante à 0, sans commande en cours, supprime ses médias", async () => {
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
  it("supprime les médias d'une variante à 0 sans commande en cours, sans toucher aux autres (filet de sécurité)", async () => {
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

  it("deux balayages en même temps ne détruisent chaque fichier qu'une fois", async () => {
    await seedMedia(await variantId("IP-R-SOLD"));

    const counts = await Promise.all([purgeSoldMedia(), purgeSoldMedia()]);

    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(2);
    await vi.waitFor(() => expect(deleteFromCloudinary).toHaveBeenCalledTimes(2));
  });
});

// Une vidéo part directement du navigateur chez Cloudinary : si l'onglet se ferme avant l'enregistrement, elle reste là sans
// ligne en base. Le balayage la retrouve et la supprime, mais jamais une vidéo enregistrée, ni une vidéo toute récente (son
// envoi est peut-être en cours : l'enregistrement n'a pas encore eu lieu).
describe("sweepStrayVideos", () => {
  const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000);

  it("supprime une vieille vidéo sans ligne, garde celle d'une variante, celle qui a une trace et la récente", async () => {
    await prisma.variantMedia.create({
      data: { variantId: await variantId("IP-R-DEAL"), kind: "video", url: "https://x/a.mp4", publicId: "dropzone/variants/enregistree", position: 0 },
    });
    await prisma.mediaOrphan.create({ data: { publicId: "dropzone/variants/tracee", kind: "video" } });
    vi.mocked(listVariantVideos).mockResolvedValue([
      { publicId: "dropzone/variants/perdue", createdAt: hoursAgo(3) },
      { publicId: "dropzone/variants/enregistree", createdAt: hoursAgo(3) },
      { publicId: "dropzone/variants/tracee", createdAt: hoursAgo(3) },
      { publicId: "dropzone/variants/recente", createdAt: hoursAgo(0.1) },
    ]);

    expect(await sweepStrayVideos()).toBe(1);

    expect(deleteFromCloudinary).toHaveBeenCalledTimes(1);
    expect(deleteFromCloudinary).toHaveBeenCalledWith("dropzone/variants/perdue", "video");
  });

  it("ne fait rien quand Cloudinary ne liste rien", async () => {
    expect(await sweepStrayVideos()).toBe(0);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("garde-fou : au-delà de 5 vidéos perdues d'un coup, ne supprime rien (une instance branchée sur une autre base les verrait toutes perdues)", async () => {
    vi.mocked(listVariantVideos).mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({ publicId: `dropzone/variants/v${index}-x`, createdAt: hoursAgo(3) })),
    );

    expect(await sweepStrayVideos()).toBe(0);

    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });

  it("jusqu'à 5 vidéos perdues, les supprime", async () => {
    vi.mocked(listVariantVideos).mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({ publicId: `dropzone/variants/v${index}-x`, createdAt: hoursAgo(3) })),
    );

    expect(await sweepStrayVideos()).toBe(5);
  });
});

// Une instance sans clés Cloudinary peut être branchée sur la vraie base (le PC lit Neon) : elle ne peut rien supprimer chez
// Cloudinary, mais elle ne doit ni perdre la trace des fichiers à supprimer, ni effacer celles qui existent déjà.
describe("Cloudinary non configuré", () => {
  it("garde une trace de chaque fichier au lieu de les perdre en silence", async () => {
    vi.mocked(isCloudinaryReady).mockReturnValue(false);

    await destroyMediaFiles([{ publicId: "dropzone/variants/v1-a", kind: "video" }]);

    expect(deleteFromCloudinary).not.toHaveBeenCalled();
    expect((await prisma.mediaOrphan.findMany()).map((item) => item.publicId)).toEqual(["dropzone/variants/v1-a"]);
  });

  it("n'efface aucune trace existante", async () => {
    vi.mocked(isCloudinaryReady).mockReturnValue(false);
    await prisma.mediaOrphan.create({ data: { publicId: "reste", kind: "photo" } });

    expect(await retryMediaOrphans()).toBe(0);

    expect(await prisma.mediaOrphan.count()).toBe(1);
    expect(deleteFromCloudinary).not.toHaveBeenCalled();
  });
});

describe("sweepMedia", () => {
  it("chaque étape est indépendante : une étape qui échoue n'empêche pas les suivantes", async () => {
    const calls: string[] = [];
    const failing = async () => {
      calls.push("échec");
      throw new Error("base indisponible");
    };
    const after = async () => {
      calls.push("suite");
    };

    await sweepMedia([failing, after]);

    expect(calls).toEqual(["échec", "suite"]);
  });
});

describe("startMediaSweep", () => {
  it("lance le balayage à intervalle régulier", async () => {
    const purge = vi.fn(async () => 0);

    const timers = startMediaSweep(20, purge);
    await vi.waitFor(() => expect(purge.mock.calls.length).toBeGreaterThanOrEqual(2));
    timers.stop();
  });

  it("fait un premier tour peu après le démarrage (un redéploiement remet le compteur d'une heure à zéro)", async () => {
    const sweep = vi.fn(async () => 0);

    const timers = startMediaSweep(60_000, sweep, 30);
    await vi.waitFor(() => expect(sweep).toHaveBeenCalledTimes(1));
    timers.stop();
  });
});
