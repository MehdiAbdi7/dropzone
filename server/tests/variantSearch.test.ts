import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../src/app.js";
import { prisma } from "../src/config/db.js";
import { createCatalog, loginAs, resetDb } from "./helpers.js";

// Le sélecteur de variantes du comptoir (16/11, lot 3).
beforeEach(async () => {
  await resetDb();
  await createCatalog();
  await prisma.productVariant.update({ where: { sku: "IP-NEW-256" }, data: { purchasePrice: 200_000 } });
});

const search = async (q: string, extra = "") => {
  const { agent } = await loginAs("admin", `admin${Math.random()}@test.dz`);
  return agent.get(`/admin/variants?q=${encodeURIComponent(q)}${extra}`);
};

describe("GET /admin/variants", () => {
  it("trouve une variante par un morceau du nom du produit, sans tenir compte de la casse", async () => {
    const response = await search("IPHONE");
    expect(response.status).toBe(200);
    const skus = response.body.data.map((hit: { sku: string }) => hit.sku);
    expect(skus).toContain("IP-NEW-256");
    expect(skus).toContain("IP-R-DEAL");
    expect(response.body.data[0]).toMatchObject({ productName: "iPhone 15 Pro Max" });
  });

  it("trouve une variante par son SKU, et met le SKU exact en premier", async () => {
    const response = await search("ip-new-256");
    expect(response.body.data[0]).toMatchObject({
      sku: "IP-NEW-256",
      price: 245_000,
      stock: 3,
      condition: "new",
      options: { Stockage: "256 Go" },
    });
  });

  it("n'offre que ce qui se vend : ni brouillon, ni stock à 0", async () => {
    const skus = (await search("galaxy")).body.data.map((hit: { sku: string }) => hit.sku);
    expect(skus).not.toContain("ZFLIP6");
    const sold = (await search("iphone")).body.data.map((hit: { sku: string }) => hit.sku);
    expect(sold).not.toContain("IP-R-SOLD");
  });

  it("donne la fiche d'état d'une occasion", async () => {
    const hit = (await search("IP-R-DEAL")).body.data[0];
    expect(hit.condition).toBe("refurbished");
    expect(hit.conditionReport).toContain("Batterie 95 %");
  });

  it("répond au plus 20 résultats et refuse une recherche trop courte", async () => {
    expect((await search("a")).status).toBe(400);
    expect((await search("x".repeat(61))).status).toBe(400);
    expect((await search("iphone", "&limit=500")).status).toBe(400);
    expect((await search("iphone", "&limit=2")).body.data).toHaveLength(2);
  });

  it("donne la fiche d'une occasion (18/11 : le bouton Détail de la vente)", async () => {
    const hit = (await search("IP-R-DEAL")).body.data[0];
    expect(hit.batteryHealth).toBe(95);
    for (const list of ["replacedParts", "compatibleParts", "defects", "limitations"]) {
      expect(Array.isArray(hit[list]), list).toBe(true);
    }
    expect(["boolean", "object"]).toContain(typeof hit.withBox);
  });

  it("donne le prix d'achat à l'admin", async () => {
    const hit = (await search("ip-new-256")).body.data[0];
    expect(hit.purchasePrice).toBe(200_000);
  });

  it("liste les cadeaux offerts avec une occasion", async () => {
    // Le catalogue de test offre déjà un cadeau avec cette affaire : on compare avec ce que la base dit.
    const links = await prisma.variantGift.findMany({
      where: { variant: { sku: "IP-R-DEAL" } },
      include: { giftVariant: { include: { product: true } } },
    });
    expect(links.length).toBeGreaterThan(0);
    const expected = links.map((link) => ({ name: link.giftVariant.product.name, quantity: link.quantity }));
    expect((await search("IP-R-DEAL")).body.data[0].gifts).toEqual(expected);
    expect((await search("ip-new-256")).body.data[0].gifts).toEqual([]);
  });

  it("ne montre jamais le bénéfice, la marge ni le prix d'achat figé d'une vente", async () => {
    const text = JSON.stringify((await search("iphone")).body);
    for (const secret of ["unitCost", "profit", "margin"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("ignore aussi les accents, dans la recherche comme dans le nom", async () => {
    const accessories = await prisma.category.findFirstOrThrow({ where: { slug: "accessoires" } });
    await prisma.product.create({
      data: {
        name: "Câble Apple USB-C",
        slug: "cable-apple-usb-c",
        description: "Câble",
        categoryId: accessories.id,
        status: "published",
        variants: { create: [{ sku: "CAB-APPLE", price: 3_000, stock: 4 }] },
      },
    });
    await prisma.product.create({
      data: {
        name: "Écouteurs sans fil",
        slug: "ecouteurs-sans-fil",
        description: "Écouteurs",
        categoryId: accessories.id,
        status: "published",
        variants: { create: [{ sku: "ECO-1", price: 9_000, stock: 2 }] },
      },
    });
    for (const q of ["cable", "CÂBLE", "câble apple"]) {
      expect((await search(q)).body.data.map((hit: { sku: string }) => hit.sku), q).toContain("CAB-APPLE");
    }
    for (const q of ["ecouteurs", "écouteurs", "ÉCOUTEURS"]) {
      expect((await search(q)).body.data.map((hit: { sku: string }) => hit.sku), q).toContain("ECO-1");
    }
  });

  // 17/11 : la recherche reconnaît aussi la marque, la catégorie et le modèle, se filtre, et dit
  // combien de résultats il y a en tout (« samsung » ne montrait qu'une liste limitée à 20).
  describe("marque, catégorie, filtres et total", () => {
    const skusOf = (response: { body: { data: { sku: string }[] } }) => response.body.data.map((hit) => hit.sku);

    it("« samsung » trouve un Galaxy dont le nom ne dit pas Samsung (marque du produit)", async () => {
      const galaxy = await prisma.deviceModel.findFirstOrThrow({ where: { slug: "samsung-galaxy-s24-ultra" } });
      const phones = await prisma.category.findFirstOrThrow({ where: { slug: "smartphones" } });
      const samsung = await prisma.brand.findFirstOrThrow({ where: { slug: "samsung" } });
      await prisma.product.create({
        data: {
          name: "Galaxy S24 Ultra",
          slug: "galaxy-s24-ultra",
          description: "Samsung",
          categoryId: phones.id,
          deviceModelId: galaxy.id,
          brandId: samsung.id,
          status: "published",
          variants: { create: [{ sku: "S24U-256", price: 170_000, stock: 2 }] },
        },
      });
      expect(skusOf(await search("samsung"))).toContain("S24U-256");
      expect(skusOf(await search("samsung ultra"))).toContain("S24U-256");
      expect(skusOf(await search("samsung iphone"))).toEqual([]);
    });

    it("trouve par le fabricant (« apple » pour un iPhone) et par la marque d'un accessoire", async () => {
      expect(skusOf(await search("apple"))).toContain("IP-NEW-256");
      expect(skusOf(await search("anker"))).toContain("CHG-20W");
    });

    it("sans mot, parcourt tout ce qui se vend, rangé par nom", async () => {
      const response = await search("");
      expect(response.status).toBe(200);
      expect(skusOf(response).sort()).toEqual(["CHG-20W", "COQ-IP15PM", "IP-NEW-256", "IP-R-DEAL", "IP-R-WIFI"]);
      expect(response.body.meta.total).toBe(5);
    });

    it("filtre par catégorie", async () => {
      expect(skusOf(await search("", "&category=accessoires")).sort()).toEqual(["CHG-20W", "COQ-IP15PM"]);
      expect(skusOf(await search("coque", "&category=smartphones"))).toEqual([]);
      expect(skusOf(await search("coque", "&category=accessoires"))).toEqual(["COQ-IP15PM"]);
    });

    it("filtre par état (neuf ou occasion)", async () => {
      expect(skusOf(await search("", "&condition=refurbished")).sort()).toEqual(["IP-R-DEAL", "IP-R-WIFI"]);
      expect((await search("", "&condition=new")).body.meta.total).toBe(3);
      expect((await search("", "&condition=autre")).status).toBe(400);
    });

    it("dit combien il y en a en tout quand la liste est coupée, et accepte jusqu'à 200", async () => {
      const response = await search("", "&limit=2");
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(5);
      expect((await search("", "&limit=200")).status).toBe(200);
      expect((await search("", "&limit=201")).status).toBe(400);
    });
  });

  // 17/11 : on cherche par mots, pas par phrase exacte. Chaque mot tapé doit se retrouver
  // quelque part (nom, SKU ou options de la variante), dans n'importe quel ordre.
  describe("recherche par mots", () => {
    const skusFor = async (q: string) => (await search(q)).body.data.map((hit: { sku: string }) => hit.sku);

    it("« coque iphone » trouve « Coque antichoc iPhone 15 Pro Max » : des mots en moins dans le nom", async () => {
      expect(await skusFor("coque iphone")).toContain("COQ-IP15PM");
    });

    it("l'ordre des mots ne compte pas", async () => {
      expect(await skusFor("iphone coque")).toContain("COQ-IP15PM");
      expect(await skusFor("max pro 15 iphone")).toContain("IP-NEW-256");
    });

    it("tous les mots sont exigés : un mot absent écarte le produit", async () => {
      expect(await skusFor("coque samsung")).not.toContain("COQ-IP15PM");
      expect(await skusFor("coque iphone samsung")).toEqual([]);
    });

    it("cherche aussi dans les options de la variante, pas seulement dans le nom", async () => {
      const skus = await skusFor("iphone 256 go");
      expect(skus).toContain("IP-NEW-256");
      expect(skus).not.toContain("COQ-IP15PM");
    });

    it("tolère les espaces et tirets oubliés ou en trop (iphone15, iphone-15)", async () => {
      expect(await skusFor("iphone15")).toContain("IP-NEW-256");
      expect(await skusFor("iphone-15 pro")).toContain("IP-NEW-256");
      expect(await skusFor("promax")).toContain("IP-NEW-256");
    });

    it("tolère une lettre doublée à tort ou oubliée (sillicone, silicone)", async () => {
      const accessories = await prisma.category.findFirstOrThrow({ where: { slug: "accessoires" } });
      await prisma.product.create({
        data: {
          name: "Coque silicone iPhone",
          slug: "coque-silicone-iphone",
          description: "Coque",
          categoryId: accessories.id,
          status: "published",
          variants: { create: [{ sku: "COQ-SIL", price: 1_200, stock: 5 }] },
        },
      });
      expect(await skusFor("coque sillicone iphone")).toContain("COQ-SIL");
      expect(await skusFor("coque silicone iphone")).toContain("COQ-SIL");
    });

    it("ne confond pas les chiffres : « 11 » ne trouve pas un modèle « 15 »", async () => {
      expect(await skusFor("iphone 11")).toEqual([]);
    });

    it("quand tous les noms contiennent les mots, le nom le plus court (le plus proche) passe en premier", async () => {
      const skus = await skusFor("iphone pro max");
      expect(skus.indexOf("IP-NEW-256")).toBeLessThan(skus.indexOf("COQ-IP15PM"));
    });
  });

  it("ne traite pas % et _ comme des jokers", async () => {
    for (const q of ["%%", "__", "i_"]) {
      expect((await search(q)).body.data, q).toEqual([]);
    }
  });

  it("classe le SKU exact, puis un nom qui commence par la recherche, puis le reste", async () => {
    const accessories = await prisma.category.findFirstOrThrow({ where: { slug: "accessoires" } });
    await prisma.product.create({
      data: {
        name: "Support voiture",
        slug: "support-voiture",
        description: "Support",
        categoryId: accessories.id,
        status: "published",
        variants: { create: [{ sku: "IPHONE", price: 1_500, stock: 3 }] },
      },
    });
    const skus = (await search("iphone")).body.data.map((hit: { sku: string }) => hit.sku);
    expect(skus[0]).toBe("IPHONE");
    // « iPhone 15 Pro Max » commence par la recherche : avant « Coque antichoc iPhone… » qui la contient.
    expect(skus.indexOf("IP-NEW-256")).toBeLessThan(skus.indexOf("COQ-IP15PM"));
  });

  it("est réservé à l'admin", async () => {
    expect((await request(app).get("/admin/variants?q=iphone")).status).toBe(401);
    const { agent } = await loginAs("customer");
    expect((await agent.get("/admin/variants?q=iphone")).status).toBe(403);
  });
});
