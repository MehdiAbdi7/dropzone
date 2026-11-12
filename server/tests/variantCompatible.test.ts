import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Les téléphones compatibles d'une variante (12/11) : chaque taille d'un verre a sa liste,
// réglée dans le back-office et montrée par la fenêtre de la Boutique.
let catalog: Awaited<ReturnType<typeof createCatalog>>;
let admin: Awaited<ReturnType<typeof loginAs>>["agent"];

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
  ({ agent: admin } = await loginAs("admin"));
});

const glass = (variants: unknown[]) => ({
  name: "Verre incassable Full glue 9H",
  description: "Verre collé sur tout l'écran",
  categoryId: catalog.accessories.id,
  status: "published",
  variants,
});

const size = (value: string, sku: string, compatibleModelIds: number[], id?: number) => ({
  ...(id ? { id } : {}),
  sku,
  price: 1500,
  stock: 10,
  options: { "Taille de l'écran": value },
  compatibleModelIds,
});

async function createGlass() {
  const created = await admin.post("/admin/products").send(
    glass([
      size("6,7 pouces", "VER-FG-67", [catalog.iphone.id]),
      size("6,8 pouces", "VER-FG-68", [catalog.galaxy.id]),
    ]),
  );
  expect(created.status).toBe(201);
  return created.body.data as { id: number; slug: string };
}

describe("Téléphones compatibles d'une variante", () => {
  it("enregistre les téléphones compatibles de chaque variante", async () => {
    const { id } = await createGlass();
    const detail = await admin.get(`/admin/products/${id}`);
    expect(detail.body.data.variants.map((v: { compatibleModelIds: number[] }) => v.compatibleModelIds)).toEqual([
      [catalog.iphone.id],
      [catalog.galaxy.id],
    ]);
  });

  it("modifie la liste d'une variante gardée sans toucher à l'autre", async () => {
    const { id } = await createGlass();
    const before = (await admin.get(`/admin/products/${id}`)).body.data.variants as { id: number }[];
    const updated = await admin.patch(`/admin/products/${id}`).send(
      glass([
        size("6,7 pouces", "VER-FG-67", [catalog.iphone.id, catalog.galaxy.id], before[0].id),
        size("6,8 pouces", "VER-FG-68", [catalog.galaxy.id], before[1].id),
      ]),
    );
    expect(updated.status).toBe(200);
    const detail = await admin.get(`/admin/products/${id}`);
    expect(detail.body.data.variants.map((v: { compatibleModelIds: number[] }) => [...v.compatibleModelIds].sort())).toEqual([
      [catalog.iphone.id, catalog.galaxy.id].sort(),
      [catalog.galaxy.id],
    ]);
  });

  it("la fiche publique donne les compatibles de chaque variante", async () => {
    const { slug } = await createGlass();
    const response = await request(app).get(`/products/${slug}`);
    const variant = response.body.data.variants.find((v: { sku: string }) => v.sku === "VER-FG-67");
    expect(variant.compatibleModels).toEqual([{ brand: "Apple", name: "iPhone 15 Pro Max", slug: "apple-iphone-15-pro-max" }]);
  });

  it("refuse un modèle inconnu", async () => {
    const response = await admin.post("/admin/products").send(glass([size("6,7 pouces", "VER-FG-67", [99999])]));
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Un modèle compatible n'existe pas");
  });
});

describe("Un produit à beaucoup de variantes", () => {
  it("accepte 81 variantes (la coque MagSafe iPhone : 27 modèles × 3 couleurs)", async () => {
    const variants = Array.from({ length: 81 }, (_, index) => ({ sku: `COQM-${index}`, price: 4500, stock: 10, options: { Modèle: `M${index}` } }));
    const response = await admin.post("/admin/products").send(glass(variants));
    expect(response.status).toBe(201);
  });
});

// Les compatibles de la fiche servent à « les accessoires d'un modèle » (/produits?model=…) :
// pour un verre, ils suivent ceux de ses tailles.
describe("Compatibles de la fiche d'un verre", () => {
  const ids = (models: { id: number }[]) => models.map((model) => model.id).sort();

  it("sont l'ensemble des téléphones de ses variantes", async () => {
    const { id } = await createGlass();
    const detail = await admin.get(`/admin/products/${id}`);
    expect(ids(detail.body.data.compatibleModels)).toEqual([catalog.iphone.id, catalog.galaxy.id].sort());
  });

  it("suivent une variante modifiée", async () => {
    const { id } = await createGlass();
    const before = (await admin.get(`/admin/products/${id}`)).body.data.variants as { id: number }[];
    await admin
      .patch(`/admin/products/${id}`)
      .send(glass([size("6,7 pouces", "VER-FG-67", [catalog.iphone.id], before[0].id), size("6,8 pouces", "VER-FG-68", [], before[1].id)]))
      .expect(200);
    const detail = await admin.get(`/admin/products/${id}`);
    expect(ids(detail.body.data.compatibleModels)).toEqual([catalog.iphone.id]);
  });

  it("restent ceux du formulaire quand aucune variante n'a de téléphone (une coque)", async () => {
    const created = await admin
      .post("/admin/products")
      .send({ ...glass([{ sku: "COQ-1", price: 2500, stock: 10, options: { Modèle: "iPhone 15 Pro Max" } }]), compatibleModelIds: [catalog.iphone.id] });
    const detail = await admin.get(`/admin/products/${created.body.data.id}`);
    expect(ids(detail.body.data.compatibleModels)).toEqual([catalog.iphone.id]);
  });
});
