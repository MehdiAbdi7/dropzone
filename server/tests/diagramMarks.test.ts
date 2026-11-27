import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { diagramMarksSchema, keepMarksOf } from "../src/modules/products/diagramMarks.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Les points posés à la main sur le dessin d'un reconditionné (27/11, demande de Mehdi). Une pièce remplacée ou un défaut
// ajouté à la main n'est dans aucune zone du dessin : le gérant clique pour le placer, et la position reste sur la variante.

describe("diagramMarksSchema", () => {
  it("sans point, c'est « aucun » (anciens envois, imports)", () => {
    expect(diagramMarksSchema.parse(undefined)).toEqual({ parts: {}, defects: {} });
    expect(diagramMarksSchema.parse({})).toEqual({ parts: {}, defects: {} });
  });

  it("accepte un point dans le dessin (220 sur 200), bords compris", () => {
    const marks = { parts: { "Verre de l'écran": { x: 55, y: 110 } }, defects: { "Bouton cassé": { x: 220, y: 0 } } };
    expect(diagramMarksSchema.parse(marks)).toEqual(marks);
  });

  it("refuse un point hors du dessin", () => {
    expect(diagramMarksSchema.safeParse({ parts: {}, defects: { Rayure: { x: 221, y: 10 } } }).success).toBe(false);
    expect(diagramMarksSchema.safeParse({ parts: {}, defects: { Rayure: { x: 10, y: -1 } } }).success).toBe(false);
    expect(diagramMarksSchema.safeParse({ parts: {}, defects: { Rayure: { x: "10", y: 10 } } }).success).toBe(false);
  });

  it("refuse plus de 15 points dans une famille", () => {
    const many = Object.fromEntries(Array.from({ length: 16 }, (_, index) => [`Défaut ${index}`, { x: 10, y: 10 }]));
    expect(diagramMarksSchema.safeParse({ parts: {}, defects: many }).success).toBe(false);
  });
});

describe("keepMarksOf", () => {
  it("ne garde que les points des valeurs encore sur la fiche", () => {
    const marks = {
      parts: { "Verre de l'écran": { x: 55, y: 110 }, "Vieille pièce": { x: 1, y: 1 } },
      defects: { "Bouton cassé": { x: 100, y: 70 }, "Vieux défaut": { x: 2, y: 2 } },
    };
    expect(keepMarksOf(marks, { replacedParts: ["Verre de l'écran"], defects: ["Bouton cassé"] })).toEqual({
      parts: { "Verre de l'écran": { x: 55, y: 110 } },
      defects: { "Bouton cassé": { x: 100, y: 70 } },
    });
  });
});

describe("Points sur le dessin, de l'enregistrement à la boutique", () => {
  let catalog: Awaited<ReturnType<typeof createCatalog>>;
  let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

  beforeEach(async () => {
    await resetDb();
    catalog = await createCatalog();
    ({ agent: admin } = await loginAs("admin"));
  });

  const marks = {
    parts: { "Verre de l'écran": { x: 55, y: 110 } },
    defects: { "Bouton volume cassé": { x: 100, y: 70 } },
  };

  const refurbished = {
    sku: "S24U-R-002",
    options: { Stockage: "256 Go", Couleur: "Noir" },
    price: 169000,
    stock: 1,
    condition: "refurbished",
    grade: 9,
    batteryHealth: 94,
    replacedParts: ["Verre de l'écran"],
    compatibleParts: [],
    defects: ["Bouton volume cassé"],
    diagramMarks: marks,
    withBox: false,
    warrantyMonths: 6,
  };

  const body = (variant: Record<string, unknown> = refurbished) => ({
    name: "Samsung Galaxy S24 Ultra",
    description: "Titane et S Pen",
    categoryId: catalog.phones.id,
    deviceModelId: catalog.galaxy.id,
    specs: { Écran: "6,8 pouces" },
    status: "published",
    variants: [variant],
  });

  it("garde les points d'une occasion et les rend à la boutique et au back-office", async () => {
    const created = await admin.post("/admin/products").send(body());
    expect(created.status).toBe(201);

    const shop = await request(app).get(`/products/${created.body.data.slug}`);
    const shown = shop.body.data.variants.find((variant: { sku: string }) => variant.sku === "S24U-R-002");
    expect(shown.diagramMarks).toEqual(marks);

    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.variants[0].diagramMarks).toEqual(marks);
  });

  it("retire le point d'une valeur retirée de la fiche, et garde les autres", async () => {
    const created = await admin.post("/admin/products").send(body());
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    const saved = detail.body.data.variants[0];

    // Le gérant décoche le défaut : son point ne doit pas rester (il reviendrait à une mauvaise place s'il le recoche).
    const updated = await admin
      .patch(`/admin/products/${created.body.data.id}`)
      .send(body({ ...refurbished, id: saved.id, defects: [] }));
    expect(updated.status).toBe(200);

    const after = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(after.body.data.variants[0].diagramMarks).toEqual({ parts: marks.parts, defects: {} });
  });

  it("un neuf scellé n'a pas de point", async () => {
    const created = await admin.post("/admin/products").send(
      body({ sku: "S24U-256", options: { Stockage: "256 Go" }, price: 215000, stock: 3, warrantyMonths: 12, diagramMarks: marks }),
    );
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.variants[0].diagramMarks).toEqual({ parts: {}, defects: {} });
  });

  it("sans point envoyé, la variante n'en a aucun", async () => {
    const { diagramMarks: _ignored, ...withoutMarks } = refurbished;
    const created = await admin.post("/admin/products").send(body(withoutMarks));
    expect(created.status).toBe(201);
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(detail.body.data.variants[0].diagramMarks).toEqual({ parts: {}, defects: {} });
  });

  it("refuse un point hors du dessin (400)", async () => {
    const response = await admin
      .post("/admin/products")
      .send(body({ ...refurbished, diagramMarks: { parts: {}, defects: { "Bouton volume cassé": { x: 500, y: 70 } } } }));
    expect(response.status).toBe(400);
  });
});
