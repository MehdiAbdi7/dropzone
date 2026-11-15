import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, previewThenOrder, resetDb } from "./helpers.js";

// La facture (lot 6, 15/11) : préremplie par la commande, numéro continu attribué à la première ouverture,
// disponible selon le type et l'étape (livraison à partir de « En préparation », retrait une fois récupéré,
// vente au magasin et échange tout de suite).
const at = (algiers: string) => new Date(`${algiers}+01:00`);

beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at("2026-11-16T10:00"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function counter() {
  const admin = await loginAs("admin");
  await admin.agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
  return admin;
}

const sale = (over: Record<string, unknown> = {}) => ({
  fullName: "Amine Test",
  phone: "0555 12 34 56",
  method: "cash",
  lines: [{ sku: "IP-NEW-256", quantity: 1 }],
  ...over,
});

type Agent = Awaited<ReturnType<typeof loginAs>>["agent"];
const invoiceOf = async (agent: Agent, id: number) => agent.post(`/admin/orders/${id}/invoice`);

// Change quelques réglages de la facture, les autres gardent leur valeur.
async function setSettings(agent: Agent, patch: Record<string, unknown>) {
  const current = (await agent.get("/admin/invoice-settings")).body.data;
  return agent.put("/admin/invoice-settings").send({ ...current, ...patch });
}

describe("Les réglages de la facture", () => {
  it("ont des valeurs de départ : le nom du magasin, aucun champ légal, TVA éteinte", async () => {
    const { agent } = await loginAs("admin");
    const response = await agent.get("/admin/invoice-settings");
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ shopName: "DropZone", nif: "", rib: "", vatEnabled: false, vatRate: 19 });
  });

  it("s'enregistrent, les espaces autour sont retirés", async () => {
    const { agent } = await loginAs("admin");
    const saved = await agent.put("/admin/invoice-settings").send({
      shopName: "  DropZone Kouba ",
      legalForm: "SARL",
      address: "Rue Saint Charles, Vieux Kouba, Alger",
      phones: "07 95 13 19 17 / 05 50 61 12 57",
      email: "",
      instagram: "@dropzone.officiel",
      registerNumber: "16/00-1234567B26",
      nif: "001234567890123",
      nis: "",
      taxArticle: "",
      rib: "",
      warrantyTerms: "Garantie sur présentation de la facture.",
      footerNote: "Merci de votre confiance.",
      vatEnabled: false,
      vatRate: 19,
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toMatchObject({ shopName: "DropZone Kouba", nif: "001234567890123" });
    expect((await agent.get("/admin/invoice-settings")).body.data.legalForm).toBe("SARL");
  });

  it("refusent un nom vide et un taux de TVA hors de 0 à 100", async () => {
    const { agent } = await loginAs("admin");
    const base = (await agent.get("/admin/invoice-settings")).body.data;
    expect((await agent.put("/admin/invoice-settings").send({ ...base, shopName: "  " })).status).toBe(400);
    expect((await agent.put("/admin/invoice-settings").send({ ...base, vatRate: 101 })).status).toBe(400);
    expect((await agent.put("/admin/invoice-settings").send({ ...base, vatRate: 19.5 })).status).toBe(400);
  });

  it("sont réservés à l'administrateur", async () => {
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/invoice-settings")).status).toBe(403);
  });
});

describe("POST /admin/orders/:id/invoice", () => {
  it("une vente au magasin : facture préremplie, numéro F-2026-0001, total en lettres", async () => {
    const { agent } = await counter();
    expect((await setSettings(agent, { nif: "001234567890123", address: "Kouba, Alger" })).status).toBe(200);
    const created = await agent.post("/admin/sales").send(sale({ lines: [{ sku: "IP-NEW-256", quantity: 1, unitPrice: 240_000 }] })).expect(201);

    const response = await invoiceOf(agent, created.body.data.id);
    expect(response.status).toBe(200);
    const invoice = response.body.data;
    expect(invoice).toMatchObject({
      number: "F-2026-0001",
      shop: { name: "DropZone", nif: "001234567890123", address: "Kouba, Alger" },
      order: { type: "in_store", dailyNumber: 1 },
      customer: { fullName: "Amine Test", phone: "0555123456" },
      payment: { methods: ["cash"], paid: 240_000 },
      subtotal: 240_000,
      shippingFee: 0,
      total: 240_000,
      totalInWords: "deux cent quarante mille dinars algériens",
      vat: null,
      tradeIn: null,
    });
    expect(invoice.lines).toHaveLength(1);
    // Le prix catalogue, le prix accordé et la réduction : visibles sur la facture.
    expect(invoice.lines[0]).toMatchObject({ name: "iPhone 15 Pro Max", quantity: 1, listPrice: 245_000, unitPrice: 240_000, lineTotal: 240_000, isGift: false });
    expect(invoice.discount).toBe(5_000);
    // Jamais le prix d'achat ni le bénéfice : une facture se donne au client.
    expect(JSON.stringify(invoice)).not.toMatch(/unitCost|purchasePrice|profit/);
  });

  it("garde son numéro aux ouvertures suivantes, la commande suivante prend le suivant", async () => {
    const { agent } = await counter();
    const first = (await agent.post("/admin/sales").send(sale()).expect(201)).body.data.id;
    const second = (await agent.post("/admin/sales").send(sale({ lines: [{ sku: "CHG-20W", quantity: 1 }] })).expect(201)).body.data.id;

    expect((await invoiceOf(agent, first)).body.data.number).toBe("F-2026-0001");
    expect((await invoiceOf(agent, first)).body.data.number).toBe("F-2026-0001");
    expect((await invoiceOf(agent, second)).body.data.number).toBe("F-2026-0002");
    expect((await prisma.invoiceCounter.findUniqueOrThrow({ where: { year: 2026 } })).value).toBe(2);
  });

  it("deux ouvertures simultanées de la même commande n'écrivent qu'un numéro", async () => {
    const { agent } = await counter();
    const id = (await agent.post("/admin/sales").send(sale()).expect(201)).body.data.id;
    const [a, b] = await Promise.all([invoiceOf(agent, id), invoiceOf(agent, id)]);
    expect(a.body.data.number).toBe("F-2026-0001");
    expect(b.body.data.number).toBe("F-2026-0001");
    expect((await prisma.invoiceCounter.findUniqueOrThrow({ where: { year: 2026 } })).value).toBe(1);
  });

  it("la suite repart à 0001 chaque année", async () => {
    // Le 31 décembre au soir, puis le lendemain : la connexion se fait le même soir, la session tient,
    // et l'année change entre les deux ventes.
    vi.setSystemTime(at("2026-12-31T22:00"));
    const { agent } = await counter();
    const first = (await agent.post("/admin/sales").send(sale()).expect(201)).body.data.id;
    expect((await invoiceOf(agent, first)).body.data.number).toBe("F-2026-0001");
    vi.setSystemTime(at("2027-01-01T09:00"));
    await agent.post("/admin/cash/open").send({ openingFloat: 10_000 }).expect(201);
    const next = (await agent.post("/admin/sales").send(sale({ lines: [{ sku: "CHG-20W", quantity: 1 }] })).expect(201)).body.data.id;
    expect((await invoiceOf(agent, next)).body.data.number).toBe("F-2027-0001");
  });

  it("un échange : le téléphone repris et la différence", async () => {
    const { agent } = await counter();
    const catalogModel = await prisma.deviceModel.findFirstOrThrow({ where: { name: "iPhone 15 Pro Max" } });
    const exchange = await agent
      .post("/admin/exchanges")
      .send({
        ...sale(),
        tradeIn: { deviceModelId: catalogModel.id, color: "Titane naturel", price: 150_000, options: { Stockage: "256 Go" }, withBox: false, warrantyMonths: 3 },
      })
      .expect(201);
    const invoice = (await invoiceOf(agent, exchange.body.data.id)).body.data;
    expect(invoice.order.type).toBe("exchange");
    expect(invoice.tradeIn).toMatchObject({ modelName: "Apple iPhone 15 Pro Max", color: "Titane naturel", price: 150_000 });
    expect(invoice.difference).toBe(95_000);
    expect(invoice.total).toBe(245_000);
    expect(invoice.payment.paid).toBe(95_000);
  });

  it("les articles offerts sont des lignes à 0 DA", async () => {
    const { agent } = await counter();
    const id = (await agent.post("/admin/sales").send(sale({ lines: [{ sku: "IP-R-DEAL", quantity: 1 }] })).expect(201)).body.data.id;
    const invoice = (await invoiceOf(agent, id)).body.data;
    const gift = invoice.lines.find((line: { isGift: boolean }) => line.isGift);
    expect(gift).toMatchObject({ unitPrice: 0, lineTotal: 0 });
  });

  it("la TVA, quand elle est allumée, sépare le hors taxe du taux", async () => {
    const { agent } = await counter();
    expect((await setSettings(agent, { vatEnabled: true, vatRate: 19 })).status).toBe(200);
    const id = (await agent.post("/admin/sales").send(sale({ lines: [{ sku: "CHG-20W", quantity: 1 }] })).expect(201)).body.data.id;
    const invoice = (await invoiceOf(agent, id)).body.data;
    // 2 500 DA TTC = 2 101 HT + 399 de TVA (19 %).
    expect(invoice.vat).toEqual({ rate: 19, excludingTax: 2_101, amount: 399 });
    expect(invoice.total).toBe(2_500);
  });

  describe("livraison", () => {
    const order = async () => {
      const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }]);
      expect(placed.status).toBe(201);
      return prisma.order.findFirstOrThrow({ orderBy: { id: "desc" } });
    };

    it("refusée avant la confirmation, possible dès « En préparation », numéro attribué à ce moment", async () => {
      const { agent } = await loginAs("admin");
      const delivery = await order();
      const before = await invoiceOf(agent, delivery.id);
      expect(before.status).toBe(409);
      expect(before.body.error.message).toMatch(/confirm/i);
      expect(await prisma.invoiceCounter.count()).toBe(0);

      await agent.patch(`/admin/orders/${delivery.id}/status`).send({ status: "confirmed" }).expect(200);
      const after = await invoiceOf(agent, delivery.id);
      expect(after.status).toBe(200);
      expect(after.body.data).toMatchObject({
        number: "F-2026-0001",
        order: { type: "delivery" },
        customer: { fullName: "Amine Test", wilaya: "Alger", commune: "Kouba", address: "12 rue des Frères Bouadou" },
        payment: null,
      });
      expect(after.body.data.shippingFee).toBeGreaterThanOrEqual(0);
    });

    it("refusée une fois annulée", async () => {
      const { agent } = await loginAs("admin");
      const delivery = await order();
      await agent.patch(`/admin/orders/${delivery.id}/status`).send({ status: "cancelled" }).expect(200);
      expect((await invoiceOf(agent, delivery.id)).status).toBe(409);
    });
  });

  describe("retrait", () => {
    it("refusé tant que le téléphone n'est pas récupéré, possible ensuite", async () => {
      const { agent } = await counter();
      const placed = await previewThenOrder([{ sku: "IP-NEW-256", quantity: 1 }], { fulfillment: "pickup", pickupDate: "2026-11-16", pickupTime: "15:00" });
      expect(placed.status).toBe(201);
      const pickup = await prisma.order.findFirstOrThrow({ orderBy: { id: "desc" } });

      const before = await invoiceOf(agent, pickup.id);
      expect(before.status).toBe(409);
      expect(before.body.error.message).toMatch(/récup/i);

      await agent.post(`/admin/orders/${pickup.id}/pickup`).send({ method: "card" }).expect(200);
      const after = await invoiceOf(agent, pickup.id);
      expect(after.status).toBe(200);
      expect(after.body.data).toMatchObject({ order: { type: "pickup" }, payment: { methods: ["card"] } });
    });
  });

  it("une commande inconnue : 404", async () => {
    const { agent } = await loginAs("admin");
    expect((await invoiceOf(agent, 99999)).status).toBe(404);
  });

  it("réservée à l'administrateur", async () => {
    const { agent } = await loginAs("customer");
    expect((await invoiceOf(agent, 1)).status).toBe(403);
  });
});
