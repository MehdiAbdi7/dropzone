import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { fillVariantColors } from "../src/scripts/fillVariantColors.js";
import { createCatalog, resetDb } from "./helpers.js";

// Le remplissage de l'étape Couleur (05/11) : chaque exemplaire d'appareil reçoit une couleur
// de son modèle, pour qu'aucun ne disparaisse de la boutique.
let catalog: Awaited<ReturnType<typeof createCatalog>>;

const colorOf = async (sku: string) =>
  ((await prisma.productVariant.findUniqueOrThrow({ where: { sku } })).options as Record<string, string>).Couleur;

beforeEach(async () => {
  await resetDb();
  catalog = await createCatalog();
});

describe("fillVariantColors", () => {
  it("donne à un exemplaire sans couleur la première couleur officielle de son modèle", async () => {
    await fillVariantColors(prisma);
    // iPhone 15 Pro Max : « Titane noir » est la première couleur officielle d'Apple.
    expect(await colorOf("IP-NEW-256")).toBe("Titane noir");
    expect(await colorOf("IP-R-DEAL")).toBe("Titane noir");
  });

  it("ne touche pas une couleur déjà posée", async () => {
    await prisma.productVariant.update({
      where: { sku: "IP-R-WIFI" },
      data: { options: { Stockage: "256 Go", Couleur: "Titane bleu" } },
    });
    await fillVariantColors(prisma);
    expect(await colorOf("IP-R-WIFI")).toBe("Titane bleu");
  });

  it("renomme une couleur à l'équivalent officiel évident", async () => {
    const model = await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 15 Pro", slug: "apple-iphone-15-pro", kind: "phone" },
    });
    await prisma.product.create({
      data: {
        name: "iPhone 15 Pro",
        slug: "iphone-15-pro",
        description: "x",
        categoryId: catalog.phones.id,
        deviceModelId: model.id,
        status: "published",
        variants: { create: [{ sku: "IP15P-B", price: 1, stock: 1, options: { Couleur: "Blanc" } }] },
      },
    });
    const report = await fillVariantColors(prisma);
    expect(await colorOf("IP15P-B")).toBe("Titane blanc");
    expect(report.renamed).toBe(1);
  });

  it("ajoute au modèle une couleur sans équivalent, et la signale", async () => {
    await prisma.productVariant.update({
      where: { sku: "IP-R-WIFI" },
      data: { options: { Stockage: "256 Go", Couleur: "Vert sapin" } },
    });
    const report = await fillVariantColors(prisma);
    const model = await prisma.deviceModel.findUniqueOrThrow({ where: { id: catalog.iphone.id } });
    expect(model.colors.at(-1)).toBe("Vert sapin");
    expect(report.appended).toEqual([{ model: "Apple|iPhone 15 Pro Max", color: "Vert sapin" }]);
  });

  it("liste les modèles restés sans couleurs et ne touche pas leurs exemplaires", async () => {
    const model = await prisma.deviceModel.create({
      data: { brand: "Inconnu", name: "Portable X", slug: "inconnu-portable-x", kind: "laptop" },
    });
    const report = await fillVariantColors(prisma);
    expect(report.withoutColors).toContain("Inconnu|Portable X");
    expect((await prisma.deviceModel.findUniqueOrThrow({ where: { id: model.id } })).colors).toEqual([]);
  });

  it("ne change plus rien au deuxième passage", async () => {
    await fillVariantColors(prisma);
    const second = await fillVariantColors(prisma);
    expect(second).toMatchObject({ filled: 0, renamed: 0, appended: [] });
  });
});

describe("fillVariantColors, l'orthographe", () => {
  it("remet l'orthographe du modèle sur une couleur écrite autrement", async () => {
    await prisma.productVariant.update({ where: { sku: "IP-R-WIFI" }, data: { options: { Couleur: "titane BLEU" } } });
    const report = await fillVariantColors(prisma);
    expect(await colorOf("IP-R-WIFI")).toBe("Titane bleu");
    expect(report.renamed).toBe(1);
  });
});
