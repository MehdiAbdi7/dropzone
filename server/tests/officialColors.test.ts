import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/config/db.js";
import { COLOR_HEX, DEVICE_MODELS } from "../src/scripts/device-models.js";
import { MODEL_MAP } from "../src/scripts/import/models-map.js";
import { applyOfficialColors } from "../src/scripts/lib/applyOfficialColors.js";
import { OFFICIAL_COLORS } from "../src/scripts/official-colors.js";
import { resetDb } from "./helpers.js";

// Les couleurs officielles des modèles (décision de Mehdi du 05/11) : les pastilles de
// l'affiche, sans rapport avec le stock. Une faute de frappe dans le fichier ferait un modèle
// sans couleurs, ou une couleur sans pastille : on le vérifie ici.
describe("Les couleurs officielles du fichier", () => {
  const known = new Set([
    ...DEVICE_MODELS.map((model) => `${model.brand}|${model.name}`),
    ...Object.values(MODEL_MAP).map((entry) => `${entry.maker}|${entry.name}`),
  ]);

  it("ne parlent que de modèles que le seed ou l'import connaissent", () => {
    expect(Object.keys(OFFICIAL_COLORS).filter((key) => !known.has(key))).toEqual([]);
  });

  it("ont toutes une teinte de départ, et aucun modèle ne cite deux fois la même", () => {
    const colors = Object.values(OFFICIAL_COLORS).flat();
    expect([...new Set(colors)].filter((color) => !/^#[0-9a-f]{6}$/.test(COLOR_HEX[color] ?? ""))).toEqual([]);
    expect(Object.entries(OFFICIAL_COLORS).filter(([, list]) => new Set(list).size !== list.length)).toEqual([]);
  });

  it("utilise la teinte Burgundy choisie pour l'iPhone 18 Pro", () => {
    expect(COLOR_HEX.Burgundy).toBe("#6b1f2e");
  });
});

describe("applyOfficialColors : le remplissage de la base", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("donne ses couleurs à un modèle qui n'en a pas, et crée les couleurs de la liste avec leur teinte", async () => {
    await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 17 Pro", slug: "apple-iphone-17-pro", kind: "phone", releaseYear: 2025 },
    });
    const report = await applyOfficialColors(prisma);
    const model = await prisma.deviceModel.findUniqueOrThrow({ where: { slug: "apple-iphone-17-pro" } });
    expect(model.colors).toEqual(["Argent", "Orange cosmique", "Bleu intense"]);
    expect(report.models).toBe(1);
    const orange = await prisma.choice.findUniqueOrThrow({ where: { group_label: { group: "color", label: "Orange cosmique" } } });
    expect(orange.hex).toBe(COLOR_HEX["Orange cosmique"]);
  });

  it("ne touche pas un modèle dont le gérant a déjà réglé les couleurs, ni une teinte qu'il a changée", async () => {
    await prisma.deviceModel.create({
      data: { brand: "Apple", name: "iPhone 17 Pro", slug: "apple-iphone-17-pro", kind: "phone", releaseYear: 2025, colors: ["Argent"] },
    });
    await prisma.choice.create({ data: { group: "color", label: "Argent", hex: "#ffffff" } });
    const report = await applyOfficialColors(prisma);
    const model = await prisma.deviceModel.findUniqueOrThrow({ where: { slug: "apple-iphone-17-pro" } });
    expect(model.colors).toEqual(["Argent"]);
    expect(report.models).toBe(0);
    expect((await prisma.choice.findUniqueOrThrow({ where: { group_label: { group: "color", label: "Argent" } } })).hex).toBe("#ffffff");
  });

  it("oublie une lueur qui n'est pas une couleur officielle du modèle (elle reviendrait à la première)", async () => {
    await prisma.deviceModel.create({
      data: {
        brand: "Apple",
        name: "iPhone 17 Pro",
        slug: "apple-iphone-17-pro",
        kind: "phone",
        releaseYear: 2025,
        posterColor: "Titane bleu",
      },
    });
    await applyOfficialColors(prisma);
    expect((await prisma.deviceModel.findUniqueOrThrow({ where: { slug: "apple-iphone-17-pro" } })).posterColor).toBeNull();
  });
});
