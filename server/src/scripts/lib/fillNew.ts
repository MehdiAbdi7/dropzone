// Remplit le catalogue : une variante neuve par modèle, des fiches complètes (caractéristiques et
// description), et la catégorie Accessoires (coques, verres, blocs, câbles, packs).
// Décisions de Mehdi du 12/11/2026 : voir context/import/analyse-prix-neuf-dropzone.md.
//   - un modèle sans neuf sur le marché reçoit quand même sa fiche et une variante neuve à
//     stock 0 (« Épuisé » en boutique, impossible à commander) ;
//   - le prix d'un neuf déjà en base est aligné sur le marché quand sa configuration est celle
//     du relevé ; les autres configurations sont listées, jamais modifiées ;
//   - ni le stock, ni les affaires, ni les photos ne sont touchés.
// Rejouable : un deuxième passage ne crée rien de plus.
import { findLibraryLogo } from "../../config/brandLogos.js";
import type { Tx } from "../../config/db.js";
import type { ChoiceGroup, Prisma, ProductKind } from "../../generated/prisma/client.js";
import { sameColor } from "../../modules/models/modelColors.js";
import { listScreenSizes } from "../../modules/models/model.service.js";
import { computeMinNewPrice, computeMinPrice } from "../../modules/products/product.service.js";
import { slugify } from "../../utils/slugify.js";
import { COLOR_HEX } from "../device-models.js";
import { buildAccessories } from "../fill-new/accessories.js";
import { DEVICE_GROUPS } from "../fill-new/index.js";
import type { DeviceRow } from "../fill-new/types.js";
import { productNameOf } from "../import/catalog.js";

const NEW_WARRANTY_MONTHS = 12;
const NEW_ORIGIN = "Europe";

const IMAGES: Record<string, string> = { phone: "/products/phone.svg", tablet: "/products/tablet.svg", laptop: "/products/laptop.svg" };

const OPTION_GROUPS: Record<string, ChoiceGroup> = {
  Stockage: "storage",
  RAM: "ram",
  Couleur: "color",
  SIM: "sim",
  Connectivité: "connectivity",
  Processeur: "processor",
  "Carte graphique": "gpu",
};

// Les descriptions écrites à la main restent : seules les phrases génériques de l'import ou du
// seed (moins de 100 caractères, ou « Fiche du modèle… ») sont remplacées.
const isGeneric = (description: string) =>
  description.startsWith("Fiche du modèle") || description.startsWith("Chaque exemplaire est décrit") || description.length < 100;

export type DeviceLine = {
  kind: string;
  name: string;
  product: "créé" | "existant";
  neuf: "créé" | "prix aligné" | "déjà là" | "conservé (hors marché)";
  price: number;
  oldPrice: number | null;
  stock: number;
  specsAdded: string[];
  description: "écrite" | "gardée";
  text: string;
  specs: Record<string, string>;
};

export type FillNewReport = {
  devices: DeviceLine[];
  review: { product: string; sku: string; options: string; price: number; marketPrice: number }[];
  accessories: { name: string; type: string; variants: number; status: "créé" | "existe déjà" }[];
  missingModels: string[];
  notCovered: string[];
  created: { products: number; variants: number; choices: number; lists: number; brands: number; makers: number };
  updated: { products: number; prices: number };
};

const sku = (taken: Set<string>, base: string): string => {
  const root = base.slice(0, 36);
  let candidate = root;
  for (let n = 2; taken.has(candidate); n++) {
    candidate = `${root}-${n}`;
  }
  taken.add(candidate);
  return candidate;
};

async function uniqueSlug(db: Tx, taken: Set<string>, name: string): Promise<string> {
  const base = slugify(name) || "produit";
  let slug = base;
  for (let n = 2; taken.has(slug) || (await db.product.findUnique({ where: { slug }, select: { id: true } })); n++) {
    slug = `${base}-${n}`;
  }
  taken.add(slug);
  return slug;
}

// « Écran 6,9 pouces…, puce A19 Pro, appareil photo…, batterie… » : la phrase des caractéristiques.
function describe(row: DeviceRow, kind: string, specs: Record<string, string>): string {
  const parts: string[] = [];
  if (kind === "laptop") {
    // Les fiches importées écrivent « 14 FHD » : on dit « pouces » dans la phrase.
    if (specs.Écran) parts.push(`Écran ${specs.Écran.replace(/^(\d+(?:,\d+)?)(?! ?pouce)/, "$1 pouces")}.`);
    if (specs.Processeur) parts.push(`Processeur ${specs.Processeur}.`);
    if (specs["Carte graphique"]) parts.push(`Carte graphique ${specs["Carte graphique"]}.`);
    if (specs.Système) parts.push(`${specs.Système}.`);
    if (specs.Usage) parts.push(`Usage : ${specs.Usage.toLowerCase()}.`);
  } else {
    const bits = [
      specs.Écran && `écran ${specs.Écran}`,
      specs.Puce && `puce ${specs.Puce}`,
      specs["Appareil photo"] && `appareil photo ${specs["Appareil photo"]}`,
      specs.Batterie && `batterie ${specs.Batterie}`,
      specs.Connecteur && `connecteur ${specs.Connecteur}`,
    ].filter(Boolean);
    if (bits.length > 0) parts.push(`${bits.join(", ").replace(/^./, (c) => c.toUpperCase())}.`);
    if (specs.Système) parts.push(`${specs.Système}.`);
  }
  if (row.stock > 0) parts.push(`Disponible en neuf scellé, garantie ${NEW_WARRANTY_MONTHS} mois.`);
  return [row.blurb, ...parts].join(" ");
}

// `accessoriesOnly` : seulement les accessoires et leurs marques, sans toucher aux appareils (ni à
// leurs prix, que le gérant a pu corriger depuis le premier passage).
export async function fillNew(db: Tx, { accessoriesOnly = false }: { accessoriesOnly?: boolean } = {}): Promise<FillNewReport> {
  const report: FillNewReport = {
    devices: [],
    review: [],
    accessories: [],
    missingModels: [],
    notCovered: [],
    created: { products: 0, variants: 0, choices: 0, lists: 0, brands: 0, makers: 0 },
    updated: { products: 0, prices: 0 },
  };

  const categories = await db.category.findMany();
  const brands = await db.brand.findMany();
  const takenSkus = new Set((await db.productVariant.findMany({ select: { sku: true } })).map((v) => v.sku));
  const takenSlugs = new Set<string>();

  const models = await db.deviceModel.findMany({
    where: { kind: { in: ["phone", "tablet", "laptop"] } },
    include: { products: { include: { variants: true } } },
  });
  const byKey = new Map<string, (typeof models)[number]>();
  for (const model of models) {
    const key = `${model.kind}|${model.name}`;
    if (byKey.has(key)) {
      throw new Error(`Deux modèles s'appellent « ${model.name} » (${model.kind}) : le script ne sait pas lequel choisir`);
    }
    byKey.set(key, model);
  }

  const wantedChoices = new Map<string, { group: ChoiceGroup; label: string }>();
  const wantChoice = (key: string, label: string) => {
    const group = OPTION_GROUPS[key];
    if (group) wantedChoices.set(`${group}|${label}`, { group, label });
  };
  const newModelColors = new Map<number, string[]>();
  const covered = new Set<number>();

  // ---------- Appareils ----------
  for (const { kind, rows } of accessoriesOnly ? [] : DEVICE_GROUPS) {
    const category = categories.find((c) => c.kind === (kind as ProductKind));
    if (!category) throw new Error(`Aucune catégorie pour les ${kind}`);
    for (const row of rows) {
      const model = byKey.get(`${kind}|${row.name}`);
      if (!model) {
        report.missingModels.push(`${kind} : ${row.name}`);
        continue;
      }
      covered.add(model.id);
      const existing = model.products[0] ?? null;

      // La couleur : une des couleurs du modèle ; sinon celle du relevé, ajoutée au modèle.
      const color = row.color
        ? (model.colors.find((c) => sameColor(c, row.color!)) ?? model.colors[0] ?? row.color)
        : (model.colors[0] ?? "Noir");
      if (!model.colors.some((c) => sameColor(c, color))) {
        newModelColors.set(model.id, [...(newModelColors.get(model.id) ?? []), color]);
      }
      const options: Record<string, string> = { ...row.options, Couleur: color };

      // Les caractéristiques : celles de la base d'abord, puis celles qui manquent.
      const current = (existing?.specs ?? {}) as Record<string, string>;
      // Un PC qui a déjà sa fiche : le processeur et la carte graphique de la fiche sont ceux de
      // tous ses exemplaires. Le neuf les reprend, sinon la fiche annoncerait ce qu'il n'a pas.
      if (existing && kind === "laptop") {
        if (current.Processeur) options.Processeur = current.Processeur;
        if (current["Carte graphique"]) options["Carte graphique"] = current["Carte graphique"];
      }
      const added = Object.entries(row.specs).filter(([key]) => !(key in current));
      const specs: Record<string, string> = { ...current, ...Object.fromEntries(added) };
      if (!existing && kind === "laptop") {
        // Un produit tout neuf n'a que sa variante neuve : sa configuration est sûre.
        specs.Processeur = row.options.Processeur;
        if (row.options["Carte graphique"]) specs["Carte graphique"] = row.options["Carte graphique"];
        added.push(["Processeur", specs.Processeur]);
      }

      const description = !existing || isGeneric(existing.description) ? describe(row, kind, specs) : null;
      const line: DeviceLine = {
        kind,
        name: row.name,
        product: existing ? "existant" : "créé",
        neuf: "déjà là",
        price: row.price,
        oldPrice: null,
        stock: row.stock,
        specsAdded: added.map(([key]) => key),
        description: description ? "écrite" : "gardée",
        text: description ?? existing!.description,
        specs,
      };

      // Les variantes finales du produit, pour recalculer les prix affichés.
      const finalVariants: { condition: "new" | "refurbished"; price: number; stock: number }[] =
        existing?.variants.map((v) => ({ condition: v.condition, price: v.price, stock: v.stock })) ?? [];
      const newOnes = existing?.variants.filter((v) => v.condition === "new") ?? [];
      let created: Prisma.ProductVariantCreateWithoutProductInput | null = null;

      if (newOnes.length === 0) {
        const productName = productNameOf(model.brand, model.name);
        created = {
          sku: sku(takenSkus, `NEUF-${slugify(productName).toUpperCase()}`),
          options,
          price: row.price,
          stock: row.stock,
          condition: "new",
          warrantyMonths: NEW_WARRANTY_MONTHS,
          origin: NEW_ORIGIN,
        };
        finalVariants.push({ condition: "new", price: row.price, stock: row.stock });
        line.neuf = "créé";
        report.created.variants += 1;
        for (const key of Object.keys(options)) wantChoice(key, options[key]);
        wantedChoices.set(`origin|${NEW_ORIGIN}`, { group: "origin", label: NEW_ORIGIN });
      } else if (row.stock === 0) {
        line.neuf = "conservé (hors marché)";
      } else {
        for (const variant of newOnes) {
          const vo = variant.options as Record<string, string>;
          const sameConfig = vo.Stockage === row.options.Stockage && (!vo.RAM || !row.options.RAM || vo.RAM === row.options.RAM);
          // Un PC : le prix dépend du processeur et de la carte graphique, que le relevé ne
          // compare pas à l'identique. Aligner écraserait un vrai prix du magasin : listé à revoir.
          if (sameConfig && variant.price !== row.price && kind !== "laptop") {
            line.oldPrice = variant.price;
            line.neuf = "prix aligné";
            await db.productVariant.update({ where: { id: variant.id }, data: { price: row.price } });
            const final = finalVariants.find((f) => f.condition === "new" && f.price === variant.price && f.stock === variant.stock);
            if (final) final.price = row.price;
            report.updated.prices += 1;
          } else if (!sameConfig || variant.price !== row.price) {
            report.review.push({
              product: productNameOf(model.brand, model.name),
              sku: variant.sku,
              options: Object.values(vo).join(" · "),
              price: variant.price,
              marketPrice: row.price,
            });
          }
        }
      }

      const prices = { minPrice: computeMinPrice(finalVariants), newPrice: computeMinNewPrice(finalVariants) };
      if (existing) {
        await db.product.update({
          where: { id: existing.id },
          data: {
            ...(description ? { description } : {}),
            specs,
            ...prices,
            ...(created ? { variants: { create: created } } : {}),
          },
        });
        report.updated.products += 1;
      } else {
        let brand = brands.find((b) => b.categoryId === category.id && b.makerName === model.brand);
        if (!brand) {
          // Un fabricant sans marque dans la catégorie (une base neuve, comme celle des tests) : la
          // marque est créée au nom du fabricant. Jamais le cas sur la base de la boutique.
          brand = await db.brand.create({
            data: {
              categoryId: category.id,
              name: model.brand,
              slug: slugify(model.brand),
              makerName: model.brand,
              logoUrl: findLibraryLogo(model.brand),
              position: brands.filter((b) => b.categoryId === category.id).length,
            },
          });
          brands.push(brand);
          report.created.brands += 1;
        }
        const name = productNameOf(model.brand, model.name);
        await db.product.create({
          data: {
            name,
            slug: await uniqueSlug(db, takenSlugs, name),
            description: description!,
            categoryId: category.id,
            brandId: brand.id,
            deviceModelId: model.id,
            specs,
            status: "published",
            ...prices,
            images: { create: [{ url: IMAGES[kind], position: 0 }] },
            variants: { create: created! },
          },
        });
        report.created.products += 1;
      }
      report.devices.push(line);
    }
  }

  // Les modèles de la base que la liste ne couvre pas : signalés, jamais touchés.
  for (const model of accessoriesOnly ? [] : models) {
    if (model.seriesId !== null && !covered.has(model.id)) {
      report.notCovered.push(`${model.kind} : ${model.name}`);
    }
  }

  // Les couleurs ajoutées aux modèles (les PC n'ont pas de couleurs officielles).
  for (const [modelId, colors] of newModelColors) {
    const model = models.find((m) => m.id === modelId)!;
    await db.deviceModel.update({ where: { id: modelId }, data: { colors: [...model.colors, ...colors] } });
    for (const color of colors) {
      wantedChoices.set(`color|${color}`, { group: "color", label: color });
    }
  }
  const colorHex = new Map<string, string | null>();
  const existingChoices = await db.choice.findMany({ where: { group: { not: null } }, select: { group: true, label: true } });
  const knownChoice = new Set(existingChoices.map((c) => `${c.group}|${c.label}`));
  const missingChoices = [...wantedChoices.values()].filter((c) => !knownChoice.has(`${c.group}|${c.label}`));
  for (const c of missingChoices) colorHex.set(c.label, c.group === "color" ? (COLOR_HEX[c.label] ?? null) : null);
  await db.choice.createMany({
    data: missingChoices.map((c) => ({ group: c.group, label: c.label, hex: colorHex.get(c.label) ?? null })),
    skipDuplicates: true,
  });
  report.created.choices = missingChoices.length;

  await fillAccessories(db, report, models, takenSkus, takenSlugs, categories, brands);
  return report;
}

// ---------- Accessoires ----------
async function fillAccessories(
  db: Tx,
  report: FillNewReport,
  models: { id: number; kind: string; name: string }[],
  takenSkus: Set<string>,
  takenSlugs: Set<string>,
  categories: { id: number; kind: ProductKind; name: string }[],
  brands: { id: number; categoryId: number; name: string }[],
) {
  const category = categories.find((c) => c.kind === "accessory");
  if (!category) throw new Error("Aucune catégorie d'accessoires");
  const items = buildAccessories();

  // Les types d'accessoires (la « marque » de la catégorie) : un nouveau, « Câbles ».
  const typeIds = new Map(brands.filter((b) => b.categoryId === category.id).map((b) => [b.name, b.id]));
  for (const type of new Set(items.map((item) => item.type))) {
    if (!typeIds.has(type)) {
      const last = await db.brand.findFirst({ where: { categoryId: category.id }, orderBy: { position: "desc" } });
      const brand = await db.brand.create({
        data: { categoryId: category.id, name: type, slug: slugify(type), position: (last?.position ?? -1) + 1 },
      });
      typeIds.set(type, brand.id);
      report.created.brands += 1;
    }
  }

  // Les listes du formulaire pour les options des accessoires (Modèle, Puissance, Longueur,
  // Courant, Câble) : sans elles, le gérant ne pourrait pas les modifier dans le back-office.
  const optionValues = new Map<string, Set<string>>();
  for (const item of items) {
    for (const variant of item.variants) {
      for (const [key, value] of Object.entries(variant.options)) {
        if (key !== "Couleur") {
          optionValues.set(key, (optionValues.get(key) ?? new Set()).add(value));
        }
      }
    }
  }
  for (const [name, values] of optionValues) {
    let list = await db.choiceList.findUnique({ where: { name }, include: { choices: true } });
    if (!list) {
      list = await db.choiceList.create({ data: { name, kinds: ["accessory"], multiple: false }, include: { choices: true } });
      report.created.lists += 1;
    } else if (!list.kinds.includes("accessory")) {
      await db.choiceList.update({ where: { id: list.id }, data: { kinds: [...list.kinds, "accessory"] } });
    }
    const known = new Set(list.choices.map((c) => c.label));
    const missing = [...values].filter((label) => !known.has(label));
    if (missing.length > 0) {
      await db.choice.createMany({ data: missing.map((label) => ({ listId: list.id, label })), skipDuplicates: true });
      report.created.choices += missing.length;
    }
  }
  // Les couleurs des coques MagSafe.
  const colors = [...new Set(items.flatMap((item) => item.variants.map((v) => v.options.Couleur).filter(Boolean)))];
  const knownColors = new Set((await db.choice.findMany({ where: { group: "color" }, select: { label: true } })).map((c) => c.label));
  const missingColors = colors.filter((label) => !knownColors.has(label));
  if (missingColors.length > 0) {
    await db.choice.createMany({
      data: missingColors.map((label) => ({ group: "color" as const, label, hex: COLOR_HEX[label] ?? null })),
      skipDuplicates: true,
    });
    report.created.choices += missingColors.length;
  }

  // Les marques de chaque type (Anker dans Chargeurs, iPhone dans Coques) : l'étape marque de la
  // Boutique. Créées une fois, avec le logo de la bibliothèque, dans l'ordre où elles apparaissent.
  const makerIds = new Map<string, number>();
  for (const item of items) {
    const key = `${item.type}|${item.maker}`;
    // Un accessoire sans marque (les verres incassables, 12/11) n'en crée pas.
    if (item.maker === null || makerIds.has(key)) continue;
    const typeId = typeIds.get(item.type)!;
    let maker = await db.accessoryMaker.findUnique({ where: { typeId_slug: { typeId, slug: slugify(item.maker) } } });
    if (!maker) {
      const last = await db.accessoryMaker.findFirst({ where: { typeId }, orderBy: { position: "desc" } });
      maker = await db.accessoryMaker.create({
        data: { typeId, name: item.maker, slug: slugify(item.maker), logoUrl: findLibraryLogo(item.maker), position: (last?.position ?? -1) + 1 },
      });
      report.created.makers += 1;
    }
    makerIds.set(key, maker.id);
  }

  const phoneIds = new Map(models.filter((m) => m.kind === "phone").map((m) => [m.name, m.id]));
  // Les téléphones de chaque taille d'écran : les compatibles de chaque taille d'un verre (12/11).
  const phonesBySize = new Map(
    (await listScreenSizes(db)).map(({ size, models: phones }) => [size, phones.map((phone) => ({ id: phone.id }))]),
  );
  for (const item of items) {
    const makerId = item.maker === null ? null : makerIds.get(`${item.type}|${item.maker}`)!;
    const exists = await db.product.findFirst({ where: { name: item.name }, select: { id: true, makerId: true } });
    if (exists) {
      // Un accessoire créé avant l'étape marque (12/11) reçoit sa marque ; une marque choisie par le gérant reste.
      if (exists.makerId === null && makerId !== null) {
        await db.product.update({ where: { id: exists.id }, data: { makerId } });
        report.updated.products += 1;
      }
      report.accessories.push({ name: item.name, type: item.type, variants: item.variants.length, status: "existe déjà" });
      continue;
    }
    const compatible = item.compatible.map((name) => {
      const id = phoneIds.get(name);
      if (!id) throw new Error(`Modèle compatible inconnu : « ${name} » (${item.name})`);
      return { id };
    });
    // Un verre : chaque taille reçoit les téléphones de cette taille, et le produit leur ensemble.
    const variants = item.variants.map((v) => ({
      ...v,
      sku: sku(takenSkus, v.sku),
      compatibleModels: { connect: item.compatibleBySize ? (phonesBySize.get(v.options["Taille de l'écran"]) ?? []) : [] },
    }));
    if (item.compatibleBySize) {
      const ids = new Set(variants.flatMap((v) => v.compatibleModels.connect.map((model) => model.id)));
      compatible.push(...[...ids].map((id) => ({ id })));
    }
    await db.product.create({
      data: {
        name: item.name,
        slug: await uniqueSlug(db, takenSlugs, item.name),
        description: item.description,
        categoryId: category.id,
        brandId: typeIds.get(item.type)!,
        makerId,
        specs: item.specs,
        status: "published",
        minPrice: computeMinPrice(variants),
        newPrice: computeMinNewPrice(variants),
        images: { create: [{ url: `/products/${item.image}.svg`, position: 0 }] },
        compatibleModels: { connect: compatible },
        variants: { create: variants.map((v) => ({ ...v, condition: "new" as const })) },
      },
    });
    report.created.products += 1;
    report.created.variants += variants.length;
    report.accessories.push({ name: item.name, type: item.type, variants: variants.length, status: "créé" });
  }
}
