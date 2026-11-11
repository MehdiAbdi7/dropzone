import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { deleteFromCloudinary } from "../src/config/cloudinary.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : l'envoi rend une adresse sans quitter le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/socle.webp", publicId: "dropzone/stage/socle" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// L'affichage des catégories (11/11) : une composition de photos par catégorie, réglée dans la
// section Personnalisation du back-office, et lue par l'accueil comme par la Boutique.
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];
let catalog: Awaited<ReturnType<typeof createCatalog>>;

beforeEach(async () => {
  vi.clearAllMocks();
  await resetDb();
  await prisma.stageSlot.deleteMany();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

const send = (stage: string, slot: string) =>
  admin
    .post(`/admin/stage/${stage}/${slot}/photo`)
    .attach("image", Buffer.from("fake"), { filename: "photo.png", contentType: "image/png" });

const categories = async () => (await request(app).get("/categories")).body.data as Record<string, any>[];
const bySlug = async (slug: string) => (await categories()).find((category) => category.slug === slug)!;

describe("GET /categories : ce que l'affichage lit", () => {
  it("donne le prix de départ de chaque catégorie, sur les produits publiés", async () => {
    // Le Galaxy Z Flip6 est en brouillon : seul l'iPhone (150 000 DA) compte.
    expect((await bySlug("smartphones")).minPrice).toBe(150000);
    expect((await bySlug("accessoires")).minPrice).toBe(1800);
  });

  it("n'a aucune composition au départ", async () => {
    expect((await bySlug("smartphones")).photos).toEqual([]);
  });

  it("met en avant la catégorie qui a le plus de produits publiés quand rien n'est réglé", async () => {
    // Accessoires : 2 produits publiés. Smartphones : 1 (le Flip6 est en brouillon).
    expect((await bySlug("accessoires")).featured).toBe(true);
    expect((await bySlug("smartphones")).featured).toBe(false);
  });

  it("donne la photo du produit publié le plus récent, pour une catégorie sans composition", async () => {
    expect((await bySlug("smartphones")).fallbackImage).toBeNull();
    await prisma.productImage.create({ data: { productId: catalog.phone.id, url: "https://x/iphone.webp", position: 0 } });
    expect((await bySlug("smartphones")).fallbackImage).toBe("https://x/iphone.webp");
  });
});

describe("La composition d'une catégorie", () => {
  it("range la photo envoyée sur le socle de la catégorie, que l'affichage lit ensuite", async () => {
    expect((await send(`category-${catalog.phones.id}`, "extra-1")).status).toBe(200);
    const phones = await bySlug("smartphones");
    expect(phones.photos).toEqual([{ slot: "extra-1", url: "https://x/socle.webp", x: null, y: null, w: null, z: null }]);
    // Le socle de l'accueil ne la voit pas.
    expect((await request(app).get("/stage")).body.data.hero.extra).toBeUndefined();
  });

  it("garde les photos dans l'ordre de leur numéro et rend la place réglée", async () => {
    const stage = `category-${catalog.phones.id}`;
    await send(stage, "extra-3");
    await send(stage, "extra-1");
    const layout = { slots: [{ slot: "extra-3", x: 10, y: 20, w: 40, z: 2 }] };
    expect((await admin.put(`/admin/stage/${stage}/layout`).send(layout)).status).toBe(204);
    const { photos } = await bySlug("smartphones");
    expect(photos.map((photo: any) => photo.slot)).toEqual(["extra-1", "extra-3"]);
    expect(photos[1]).toMatchObject({ x: 10, y: 20, w: 40, z: 2 });
  });

  it("refuse une catégorie qui n'existe pas", async () => {
    expect((await send("category-999", "extra-1")).status).toBe(404);
  });

  it("n'accepte que six emplacements, extra-1 à extra-6", async () => {
    const stage = `category-${catalog.phones.id}`;
    expect((await send(stage, "extra-6")).status).toBe(200);
    expect((await send(stage, "extra-7")).status).toBe(400);
    expect((await send(stage, "laptop")).status).toBe(400);
    expect((await send("category-abc", "extra-1")).status).toBe(400);
  });

  it("retire la photo d'un emplacement", async () => {
    const stage = `category-${catalog.phones.id}`;
    await send(stage, "extra-1");
    expect((await admin.delete(`/admin/stage/${stage}/extra-1/photo`)).status).toBe(204);
    expect((await bySlug("smartphones")).photos).toEqual([]);
  });

  it("disparaît avec la catégorie, photos de Cloudinary comprises", async () => {
    const empty = await prisma.category.create({ data: { name: "Montres", slug: "montres", kind: "watch" } });
    await send(`category-${empty.id}`, "extra-1");
    expect((await admin.delete(`/admin/categories/${empty.id}`)).status).toBe(204);
    expect(await prisma.stageSlot.count()).toBe(0);
    expect(deleteFromCloudinary).toHaveBeenCalledWith("dropzone/stage/socle");
  });

  it("est réservé à l'admin", async () => {
    const { agent: customer } = await loginAs("customer");
    const attach = customer
      .post(`/admin/stage/category-${catalog.phones.id}/extra-1/photo`)
      .attach("image", Buffer.from("fake"), { filename: "photo.png", contentType: "image/png" });
    expect((await attach).status).toBe(403);
  });
});

describe("La catégorie mise en avant", () => {
  const feature = (id: number, featured: boolean) => admin.patch(`/admin/categories/${id}`).send({ featured });

  it("est celle que le gérant choisit, une seule à la fois", async () => {
    expect((await feature(catalog.phones.id, true)).status).toBe(200);
    expect((await bySlug("smartphones")).featured).toBe(true);
    expect((await bySlug("accessoires")).featured).toBe(false);

    expect((await feature(catalog.accessories.id, true)).status).toBe(200);
    expect((await bySlug("smartphones")).featured).toBe(false);
    expect((await bySlug("accessoires")).featured).toBe(true);
    expect(await prisma.category.count({ where: { featured: true } })).toBe(1);
  });

  it("revient à la catégorie la plus fournie quand on retire le choix", async () => {
    await feature(catalog.phones.id, true);
    await feature(catalog.phones.id, false);
    expect((await bySlug("smartphones")).featured).toBe(false);
    expect((await bySlug("accessoires")).featured).toBe(true);
  });
});

// 11/11 : les marques n'ont plus de photo (choix de Mehdi : leur tuile montre leur logo).
describe("Les marques", () => {
  it("n'ont ni photo ni prix dans GET /categories", async () => {
    const iphone = (await bySlug("smartphones")).brands.find((brand: any) => brand.slug === "iphone");
    expect(Object.keys(iphone).sort()).toEqual(["logoUrl", "name", "productCount", "slug"]);
  });

  it("n'ont plus de route pour envoyer une photo", async () => {
    const response = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/photo`)
      .attach("image", Buffer.from("fake"), { filename: "p.png", contentType: "image/png" });
    expect(response.status).toBe(404);
  });
});
