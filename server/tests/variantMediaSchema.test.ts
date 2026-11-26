import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { createCatalog, resetDb } from "./helpers.js";

// Les photos et la vidéo d'une variante (26/11) : une ligne par média, liée à la variante. Quand la variante disparaît,
// ses médias disparaissent avec elle (la base le garantit, Cloudinary est prévenu à part).
beforeEach(async () => {
  await resetDb();
  await createCatalog();
});

const anyVariant = () => prisma.productVariant.findFirstOrThrow({ orderBy: { id: "asc" } });

describe("variant_media", () => {
  it("supprimer une variante supprime ses médias en base", async () => {
    const variant = await anyVariant();
    await prisma.variantMedia.createMany({
      data: [
        { variantId: variant.id, kind: "photo", url: "https://x/a.webp", publicId: "dropzone/variants/a", position: 0 },
        { variantId: variant.id, kind: "video", url: "https://x/b.mp4", publicId: "dropzone/variants/b", position: 1 },
      ],
    });

    await prisma.productVariant.delete({ where: { id: variant.id } });

    expect(await prisma.variantMedia.count()).toBe(0);
  });

  it("refuse deux médias avec le même identifiant Cloudinary (supprimer l'un supprimerait le fichier de l'autre)", async () => {
    const variant = await anyVariant();
    await prisma.variantMedia.create({
      data: { variantId: variant.id, kind: "video", url: "https://x/a.mp4", publicId: "dropzone/variants/v1-a", position: 0 },
    });

    await expect(
      prisma.variantMedia.create({
        data: { variantId: variant.id, kind: "video", url: "https://x/b.mp4", publicId: "dropzone/variants/v1-a", position: 1 },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("garde l'ordre des médias par position", async () => {
    const variant = await anyVariant();
    await prisma.variantMedia.createMany({
      data: [
        { variantId: variant.id, kind: "photo", url: "https://x/2.webp", publicId: "p2", position: 2 },
        { variantId: variant.id, kind: "photo", url: "https://x/0.webp", publicId: "p0", position: 0 },
        { variantId: variant.id, kind: "video", url: "https://x/1.mp4", publicId: "p1", position: 1 },
      ],
    });

    const media = await prisma.variantMedia.findMany({ where: { variantId: variant.id }, orderBy: { position: "asc" } });

    expect(media.map((item) => [item.kind, item.publicId])).toEqual([
      ["photo", "p0"],
      ["video", "p1"],
      ["photo", "p2"],
    ]);
  });
});
