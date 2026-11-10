import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { fillSeries } from "../src/scripts/lib/series.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

const appleModel = (name: string, releaseYear = 2026) =>
  prisma.deviceModel.create({
    data: {
      brand: "Apple",
      name,
      slug: `apple-${name.toLowerCase().replace(/ /g, "-")}`,
      kind: "phone",
      releaseYear,
    },
  });

describe("Créer, renommer et supprimer une série", () => {
  it("crée une série sous une marque", async () => {
    const response = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      name: "iPhone 18",
      slug: "iphone-18",
      brandId: catalog.iphoneBrand.id,
      coverUrl: null,
    });
  });

  it("refuse un doublon dans la même marque", async () => {
    await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    const response = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    expect(response.status).toBe(409);
  });

  it("refuse un nom sans lettre latine (le slug serait vide)", async () => {
    const response = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "سلسلة" });
    expect(response.status).toBe(400);
  });

  it("renomme une série et recalcule son slug", async () => {
    const created = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    const response = await admin
      .patch(`/admin/series/${created.body.data.id}`)
      .send({ name: "iPhone 18 (2026)" });
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      name: "iPhone 18 (2026)",
      slug: "iphone-18-2026",
    });
  });

  it("refuse l'envoi d'une couverture sans image", async () => {
    const created = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    const response = await admin.post(
      `/admin/series/${created.body.data.id}/cover`,
    );
    expect(response.status).toBe(400);
  });

  it("supprime une série : ses modèles en vente reviennent dans l'alerte « sans série »", async () => {
    await fillSeries(prisma);
    const series = await prisma.series.findFirstOrThrow({
      where: { slug: "iphone-15" },
    });

    expect((await admin.delete(`/admin/series/${series.id}`)).status).toBe(204);

    const response = await admin.get(
      `/admin/catalog/brands/${catalog.iphoneBrand.id}`,
    );
    expect(response.body.data.unassigned).toEqual([
      {
        deviceModelId: catalog.iphone.id,
        name: "iPhone 15 Pro Max",
        productId: catalog.phone.id,
      },
    ]);
  });
});

describe("Ranger les modèles d'une série", () => {
  it("refuse un modèle d'un autre fabricant", async () => {
    const created = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    const response = await admin
      .put(`/admin/series/${created.body.data.id}/models`)
      .send({ modelIds: [catalog.galaxy.id] });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe(
      "Ce modèle n'est pas de cette marque",
    );
    const galaxy = await prisma.deviceModel.findUniqueOrThrow({
      where: { id: catalog.galaxy.id },
    });
    expect(galaxy.seriesId).toBeNull();
  });

  it("range les modèles dans l'ordre donné, et sort ceux qui n'y sont plus", async () => {
    const created = await admin
      .post(`/admin/brands/${catalog.iphoneBrand.id}/series`)
      .send({ name: "iPhone 18" });
    const url = `/admin/series/${created.body.data.id}/models`;
    const pro = await appleModel("iPhone 18 Pro");
    const proMax = await appleModel("iPhone 18 Pro Max");

    expect(
      (await admin.put(url).send({ modelIds: [pro.id, proMax.id] })).status,
    ).toBe(204);
    const ranged = await prisma.deviceModel.findMany({
      where: { id: { in: [pro.id, proMax.id] } },
      orderBy: { id: "asc" },
      select: { seriesId: true, seriesPosition: true },
    });
    expect(ranged).toEqual([
      { seriesId: created.body.data.id, seriesPosition: 0 },
      { seriesId: created.body.data.id, seriesPosition: 1 },
    ]);

    expect((await admin.put(url).send({ modelIds: [proMax.id] })).status).toBe(
      204,
    );
    expect(
      (await prisma.deviceModel.findUniqueOrThrow({ where: { id: pro.id } }))
        .seriesId,
    ).toBeNull();
    expect(
      (await prisma.deviceModel.findUniqueOrThrow({ where: { id: proMax.id } }))
        .seriesPosition,
    ).toBe(0);
  });

  // Décision de Mehdi du 05/11 : les couleurs d'un modèle sont ses couleurs officielles dans
  // le monde, sans rapport avec le stock ; la lueur, c'est le gérant qui la choisit parmi elles.
  it("enregistre les couleurs officielles d'un modèle, seulement des couleurs de la liste", async () => {
    await prisma.choice.createMany({
      data: [
        { group: "color", label: "Argent", hex: "#d9d9de" },
        { group: "color", label: "Orange cosmique", hex: "#f47d3c" },
      ],
    });
    const url = `/admin/models/${catalog.iphone.id}`;

    const response = await admin
      .patch(url)
      .send({ colors: ["Argent", "Orange cosmique", "Argent"] });
    expect(response.status).toBe(200);
    // L'ordre donné est gardé (c'est celui des pastilles), le doublon retiré.
    expect(response.body.data.colors).toEqual(["Argent", "Orange cosmique"]);
    expect(
      (await admin.patch(url).send({ colors: ["Couleur inventée"] })).status,
    ).toBe(400);
  });

  it("choisit la lueur parmi les couleurs officielles du modèle, et l'oublie si sa couleur est retirée", async () => {
    await prisma.choice.createMany({
      data: [
        { group: "color", label: "Argent", hex: "#d9d9de" },
        { group: "color", label: "Orange cosmique", hex: "#f47d3c" },
        { group: "color", label: "Burgundy", hex: "#6b1f2e" },
      ],
    });
    await prisma.deviceModel.update({
      where: { id: catalog.iphone.id },
      data: { colors: ["Argent", "Orange cosmique"] },
    });
    const url = `/admin/models/${catalog.iphone.id}`;

    expect(
      (await admin.patch(url).send({ posterColor: "Orange cosmique" })).body
        .data.posterColor,
    ).toBe("Orange cosmique");
    // Burgundy est dans la liste « Couleurs », mais ce modèle n'existe pas en Burgundy.
    expect(
      (await admin.patch(url).send({ posterColor: "Burgundy" })).status,
    ).toBe(400);
    expect((await admin.patch(url).send({})).status).toBe(400);
    // Retirer l'orange des couleurs du modèle fait revenir la lueur par défaut.
    expect(
      (await admin.patch(url).send({ colors: ["Argent"] })).body.data
        .posterColor,
    ).toBeNull();
    expect(
      (await admin.patch(url).send({ posterColor: null })).body.data
        .posterColor,
    ).toBeNull();
  });
});

describe("Les compteurs du Catalogue", () => {
  it("compte marques, séries, modèles, produits et stock par catégorie, brouillons compris", async () => {
    await fillSeries(prisma);
    const response = await admin.get("/admin/catalog");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      // 3 neufs de l'iPhone et 2 du brouillon Galaxy Z Flip6 (son propre modèle et sa série) ; 2 affaires en stock.
      expect.objectContaining({
        slug: "smartphones",
        brandCount: 2,
        seriesCount: 3,
        modelCount: 3,
        productCount: 2,
        newStock: 5,
        dealCount: 2,
      }),
      expect.objectContaining({
        slug: "accessoires",
        brandCount: 1,
        seriesCount: 0,
        modelCount: 0,
        productCount: 2,
        newStock: 15,
        dealCount: 0,
      }),
    ]);
  });

  it("compte chaque marque d'une catégorie", async () => {
    await fillSeries(prisma);
    const response = await admin.get(
      `/admin/catalog/categories/${catalog.phones.id}`,
    );
    expect(response.body.data.category).toMatchObject({
      id: catalog.phones.id,
      name: "Smartphones",
    });
    expect(response.body.data.brands).toEqual([
      expect.objectContaining({
        slug: "iphone",
        seriesCount: 1,
        productCount: 1,
        newStock: 3,
        dealCount: 2,
      }),
      expect.objectContaining({
        slug: "samsung",
        seriesCount: 2,
        productCount: 1,
        newStock: 2,
        dealCount: 0,
      }),
    ]);
  });

  it("donne les séries d'une marque avec leur stock", async () => {
    await fillSeries(prisma);
    const response = await admin.get(
      `/admin/catalog/brands/${catalog.iphoneBrand.id}`,
    );
    expect(response.body.data.brand).toMatchObject({
      slug: "iphone",
      category: { slug: "smartphones", kind: "phone" },
    });
    expect(response.body.data.series).toEqual([
      expect.objectContaining({
        name: "iPhone 15",
        coverUrl: null,
        modelCount: 1,
        modelIds: [catalog.iphone.id],
        newStock: 3,
        dealCount: 2,
      }),
    ]);
    expect(response.body.data.unassigned).toEqual([]);
  });

  it("donne une série avec ses modèles, leur produit et les modèles qu'on peut y ajouter", async () => {
    await fillSeries(prisma);
    const plus = await appleModel("iPhone 15 Plus", 2023);
    const series = await prisma.series.findFirstOrThrow({
      where: { slug: "iphone-15" },
    });

    const response = await admin.get(`/admin/catalog/series/${series.id}`);
    expect(response.status).toBe(200);
    expect(response.body.data.series).toMatchObject({
      name: "iPhone 15",
      // Le fabricant et le type servent au formulaire « Nouveau modèle ».
      brand: { slug: "iphone", makerName: "Apple" },
      category: { slug: "smartphones", kind: "phone" },
    });
    expect(response.body.data.models).toEqual([
      expect.objectContaining({
        id: catalog.iphone.id,
        name: "iPhone 15 Pro Max",
        seriesPosition: 0,
        product: expect.objectContaining({
          id: catalog.phone.id,
          newStock: 3,
          dealCount: 2,
          soldOutColors: [],
        }),
      }),
    ]);
    // Ni le Galaxy (autre fabricant), ni le Pro Max (déjà rangé).
    expect(response.body.data.candidates).toEqual([
      { id: plus.id, name: "iPhone 15 Plus", releaseYear: 2023 },
    ]);
  });

  it("donne au Catalogue les couleurs officielles d'un modèle, pas celles du stock", async () => {
    await fillSeries(prisma);
    await prisma.deviceModel.update({
      where: { id: catalog.iphone.id },
      data: { colors: ["Titane naturel", "Titane bleu"] },
    });
    const series = await prisma.series.findFirstOrThrow({
      where: { slug: "iphone-15" },
    });
    const response = await admin.get(`/admin/catalog/series/${series.id}`);
    expect(response.body.data.models[0].colors).toEqual([
      "Titane naturel",
      "Titane bleu",
    ]);
  });

  // Le 05/11, Mehdi voyait « Neuf scellé : 2 en stock » sur son iPhone 17 Pro sans savoir
  // que la fiche était un brouillon, absent de la boutique.
  it("dit si la fiche d'un modèle est publiée ou en brouillon", async () => {
    await fillSeries(prisma);
    const series = await prisma.series.findFirstOrThrow({
      where: { slug: "iphone-15" },
    });
    const url = `/admin/catalog/series/${series.id}`;
    expect((await admin.get(url)).body.data.models[0].product.status).toBe(
      "published",
    );

    await prisma.product.update({
      where: { id: catalog.phone.id },
      data: { status: "draft" },
    });
    expect((await admin.get(url)).body.data.models[0].product.status).toBe(
      "draft",
    );
  });

  it("refuse le Catalogue à un client", async () => {
    const { agent: client } = await loginAs("customer");
    expect((await client.get("/admin/catalog")).status).toBe(403);
  });
});
