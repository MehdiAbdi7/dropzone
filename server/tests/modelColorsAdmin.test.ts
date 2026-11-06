import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Cloudinary simulé : l'envoi rend une adresse sans quitter le PC.
vi.mock("../src/config/cloudinary.js", () => ({
  uploadToCloudinary: vi.fn(async () => ({ url: "https://x/envoyee.webp", publicId: "dropzone/colors/envoyee" })),
  deleteFromCloudinary: vi.fn(async () => undefined),
}));

// Les pages Couleur du back-office (étape Couleur, 05/11) : Catalogue › modèle › couleur,
// et l'ajout d'un exemplaire directement dans une couleur.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

const setColor = (sku: string, Couleur: string) =>
  prisma.productVariant.update({ where: { sku }, data: { options: { Stockage: "256 Go", Couleur } } });

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
  // L'iPhone 15 Pro Max en trois couleurs : 3 neufs et une affaire en Titane naturel,
  // une affaire en Titane bleu, rien en Titane noir (l'affaire vendue ne compte pas).
  await prisma.deviceModel.update({
    where: { id: catalog.iphone.id },
    data: { colors: ["Titane naturel", "Titane bleu", "Titane noir"] },
  });
  await setColor("IP-NEW-256", "Titane naturel");
  await setColor("IP-R-DEAL", "Titane naturel");
  await setColor("IP-R-WIFI", "Titane bleu");
  await setColor("IP-R-SOLD", "Titane noir");
});

// Un modèle rangé dans la série « iPhone 15 » de la marque iPhone, sans fiche produit.
async function modelWithoutProduct() {
  const series = await prisma.series.create({ data: { brandId: catalog.iphoneBrand.id, name: "iPhone 15", slug: "iphone-15" } });
  return prisma.deviceModel.create({
    data: {
      brand: "Apple",
      name: "iPhone 15 Pro",
      slug: "apple-iphone-15-pro",
      kind: "phone",
      seriesId: series.id,
      colors: ["Titane naturel", "Titane bleu"],
    },
  });
}

const newUnit = (color: string) => ({
  color,
  sku: "IP15P-256-N",
  options: { Stockage: "256 Go" },
  price: 199000,
  stock: 2,
  warrantyMonths: 12,
});

describe("GET /admin/models/:id/colors", () => {
  it("donne chaque couleur du modèle avec sa photo et son stock", async () => {
    await prisma.modelColorPhoto.create({
      data: { deviceModelId: catalog.iphone.id, color: "Titane bleu", url: "https://x/bleu.webp" },
    });
    const response = await admin.get(`/admin/models/${catalog.iphone.id}/colors`);
    expect(response.status).toBe(200);
    expect(response.body.data.model).toMatchObject({ id: catalog.iphone.id, name: "iPhone 15 Pro Max", kind: "phone" });
    expect(response.body.data.productId).toBe(catalog.phone.id);
    expect(response.body.data.colors).toEqual([
      { name: "Titane naturel", photoUrl: null, newStock: 3, refurbishedCount: 1 },
      { name: "Titane bleu", photoUrl: "https://x/bleu.webp", newStock: 0, refurbishedCount: 1 },
      { name: "Titane noir", photoUrl: null, newStock: 0, refurbishedCount: 0 },
    ]);
  });

  it("répond 401 sans connexion et 404 pour un modèle inconnu", async () => {
    expect((await request(app).get(`/admin/models/${catalog.iphone.id}/colors`)).status).toBe(401);
    expect((await admin.get("/admin/models/9999/colors")).status).toBe(404);
  });
});

describe("GET /admin/models/:id/colors/:color", () => {
  it("donne les exemplaires de la couleur, neufs d'abord", async () => {
    const response = await admin.get(`/admin/models/${catalog.iphone.id}/colors/${encodeURIComponent("Titane naturel")}`);
    expect(response.status).toBe(200);
    expect(response.body.data.color).toEqual({ name: "Titane naturel", photoUrl: null });
    expect(response.body.data.variants.map((v: { sku: string }) => v.sku)).toEqual(["IP-NEW-256", "IP-R-DEAL"]);
  });

  it("répond 404 pour une couleur que le modèle n'a pas", async () => {
    const response = await admin.get(`/admin/models/${catalog.iphone.id}/colors/Violet`);
    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Couleur inconnue pour ce modèle");
  });
});

describe("La photo d'une couleur", () => {
  it("refuse un envoi sans image", async () => {
    const response = await admin.post(`/admin/models/${catalog.iphone.id}/colors/${encodeURIComponent("Titane bleu")}/photo`);
    expect(response.status).toBe(400);
  });

  it("range la photo sous la couleur du modèle", async () => {
    const response = await admin
      .post(`/admin/models/${catalog.iphone.id}/colors/${encodeURIComponent("titane bleu")}/photo`)
      .attach("image", Buffer.from("fake"), { filename: "bleu.png", contentType: "image/png" });
    expect(response.status).toBe(200);
    const photo = await prisma.modelColorPhoto.findFirstOrThrow();
    expect(photo).toMatchObject({ color: "Titane bleu", url: "https://x/envoyee.webp" });
  });

  // Depuis une variante du formulaire produit (06/11) : « j'ajoute un iPhone rose, je mets
  // la photo de l'iPhone rose », avant même d'enregistrer la fiche.
  it("ajoute au modèle une couleur qu'il n'avait pas encore", async () => {
    const response = await admin
      .post(`/admin/models/${catalog.iphone.id}/colors/${encodeURIComponent("Rose")}/photo`)
      .attach("image", Buffer.from("fake"), { filename: "rose.png", contentType: "image/png" });
    expect(response.status).toBe(200);
    const model = await prisma.deviceModel.findUniqueOrThrow({ where: { id: catalog.iphone.id } });
    expect(model.colors).toEqual(["Titane naturel", "Titane bleu", "Titane noir", "Rose"]);
    expect(await prisma.modelColorPhoto.findFirstOrThrow()).toMatchObject({ color: "Rose" });
  });

  it("retire la photo d'une couleur", async () => {
    await prisma.modelColorPhoto.create({
      data: { deviceModelId: catalog.iphone.id, color: "Titane bleu", url: "https://x/bleu.webp" },
    });
    const url = `/admin/models/${catalog.iphone.id}/colors/${encodeURIComponent("Titane bleu")}/photo`;
    expect((await admin.delete(url)).status).toBe(204);
    expect(await prisma.modelColorPhoto.count()).toBe(0);
  });
});

describe("POST /admin/models/:id/variants", () => {
  it("ajoute un neuf dans la fiche du modèle, couleur imposée", async () => {
    const response = await admin
      .post(`/admin/models/${catalog.iphone.id}/variants`)
      .send({ ...newUnit("Titane noir"), sku: "IP-NEW-512", options: { Stockage: "512 Go", Couleur: "Rose" } });
    expect(response.status).toBe(201);
    expect(response.body.data.productId).toBe(catalog.phone.id);
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { sku: "IP-NEW-512" } });
    expect(variant.options).toEqual({ Stockage: "512 Go", Couleur: "Titane noir" });
  });

  it("crée la fiche publiée d'un modèle qui n'en a pas", async () => {
    const model = await modelWithoutProduct();
    const response = await admin.post(`/admin/models/${model.id}/variants`).send(newUnit("Titane bleu"));
    expect(response.status).toBe(201);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: response.body.data.productId } });
    expect(product).toMatchObject({
      name: "iPhone 15 Pro",
      status: "published",
      deviceModelId: model.id,
      brandId: catalog.iphoneBrand.id,
      categoryId: catalog.phones.id,
      minPrice: 199000,
    });
    expect(product.description).toBe(
      "iPhone 15 Pro chez DropZone : neuf scellé ou affaire testée, garantie et livraison dans 58 wilayas.",
    );
    expect((await request(app).get(`/products/${product.slug}`)).status).toBe(200);
  });

  it("refuse un modèle sans fiche et sans série", async () => {
    const model = await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 14", slug: "apple-iphone-14", kind: "phone", colors: ["Minuit"] },
    });
    const response = await admin.post(`/admin/models/${model.id}/variants`).send(newUnit("Minuit"));
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Rangez d'abord ce modèle dans une série");
  });

  it("refuse une affaire sans dire sa boîte", async () => {
    const response = await admin
      .post(`/admin/models/${catalog.iphone.id}/variants`)
      .send({ ...newUnit("Titane bleu"), condition: "refurbished", stock: 1, warrantyMonths: 6 });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body.error)).toContain("Dites si l'affaire a sa boîte d'origine");
  });

  it("ajoute au modèle une couleur nouvelle", async () => {
    const response = await admin.post(`/admin/models/${catalog.iphone.id}/variants`).send(newUnit("Titane blanc"));
    expect(response.status).toBe(201);
    const colors = await admin.get(`/admin/models/${catalog.iphone.id}/colors`);
    expect(colors.body.data.colors.map((c: { name: string }) => c.name)).toEqual([
      "Titane naturel",
      "Titane bleu",
      "Titane noir",
      "Titane blanc",
    ]);
  });

  it("refuse la référence d'un autre appareil", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { reference: "51057" } });
    const response = await admin
      .post(`/admin/models/${catalog.iphone.id}/variants`)
      .send({ ...newUnit("Titane bleu"), reference: "51057" });
    expect(response.status).toBe(409);
  });
});

// Relecture du 05/11 : la boutique compare les couleurs à l'identique ; l'API doit donc
// toujours écrire l'orthographe du modèle, et ne pas laisser retirer une couleur en stock.
describe("L'orthographe des couleurs, et le retrait d'une couleur en stock", () => {
  beforeEach(async () => {
    await prisma.choice.createMany({
      data: ["Titane naturel", "Titane bleu", "Titane noir"].map((label) => ({ group: "color" as const, label })),
    });
  });

  const colorOf = async (sku: string) =>
    ((await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).options as Record<string, string>).Couleur;

  it("écrit l'orthographe du modèle pour un exemplaire ajouté dans une couleur", async () => {
    const response = await admin.post(`/admin/models/${catalog.iphone.id}/variants`).send(newUnit("titane bleu"));
    expect(response.status).toBe(201);
    expect(await colorOf("IP15P-256-N")).toBe("Titane bleu");
  });

  it("écrit l'orthographe du modèle dans le formulaire produit", async () => {
    const product = await admin.get(`/admin/products/${catalog.phone.id}`);
    const body = {
      name: product.body.data.name,
      description: product.body.data.description,
      categoryId: catalog.phones.id,
      deviceModelId: catalog.iphone.id,
      brandId: catalog.iphoneBrand.id,
      status: "published",
      variants: [
        { sku: "IP-NEW-256", options: { Stockage: "256 Go", Couleur: "TITANE NATUREL " }, price: 245000, stock: 3, warrantyMonths: 12 },
      ],
    };
    expect((await admin.patch(`/admin/products/${catalog.phone.id}`).send(body)).status).toBe(200);
    expect(await colorOf("IP-NEW-256")).toBe("Titane naturel");
  });

  it("refuse de retirer d'un modèle une couleur que portent encore des exemplaires", async () => {
    const response = await admin.patch(`/admin/models/${catalog.iphone.id}`).send({ colors: ["Titane bleu", "Titane noir"] });
    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe(
      "La couleur « Titane naturel » est encore portée par 2 exemplaires : changez-les d'abord dans la fiche produit",
    );
  });

  it("laisse retirer une couleur sans exemplaire", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-R-SOLD" }, data: { options: { Couleur: "Titane bleu" } } });
    const response = await admin
      .patch(`/admin/models/${catalog.iphone.id}`)
      .send({ colors: ["Titane naturel", "Titane bleu"] });
    expect(response.status).toBe(200);
  });
});
