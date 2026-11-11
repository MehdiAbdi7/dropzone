import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import type { StageLayout } from "./stage.schema.js";
import {
  EXTRA_SLOT,
  MAX_EXTRA_SLOTS,
  STAGE_SLOTS,
  categoryIdOf,
  categoryStageName,
  type StageName,
} from "./stage.slots.js";

// Une photo et sa place (x, y, w, z en % du cadre ; null : la place de départ, 06/11).
type StagePhoto = { url: string; label: string | null; x: number | null; y: number | null; w: number | null; z: number | null };
type StagePhotos = {
  hero: Record<string, StagePhoto | null>;
  deal: Record<string, StagePhoto | null>;
  labels: Record<StageName, Record<string, string | null>>;
};

// Le numéro d'un emplacement en plus (« extra-12 » → 12), pour les ranger dans l'ordre.
const extraNumber = (slot: string) => Number(slot.slice("extra-".length));

// Les photos des deux socles : chaque emplacement nommé (null : vide, le front garde
// l'illustration de départ), puis les emplacements en plus qui ont une photo, dans l'ordre.
export async function stagePhotos(): Promise<StagePhotos> {
  // Les socles de l'accueil seulement : les compositions des catégories sortent par /categories.
  const rows = await prisma.stageSlot.findMany({
    where: { stage: { in: ["hero", "deal"] } },
    select: { stage: true, slot: true, url: true, label: true, x: true, y: true, w: true, z: true },
  });
  const photo = (row: (typeof rows)[number]): StagePhoto | null =>
    row.url ? { url: row.url, label: row.label, x: row.x, y: row.y, w: row.w, z: row.z } : null;
  const photosOf = (stage: StageName) => {
    const named = STAGE_SLOTS[stage].map((slot) => {
      const row = rows.find((item) => item.stage === stage && item.slot === slot);
      return [slot, row ? photo(row) : null] as const;
    });
    const extras = rows
      .filter((row) => row.stage === stage && EXTRA_SLOT.test(row.slot) && row.url)
      .sort((a, b) => extraNumber(a.slot) - extraNumber(b.slot))
      .map((row) => [row.slot, photo(row)] as const);
    return Object.fromEntries([...named, ...extras]);
  };
  const labelsOf = (stage: StageName) =>
    Object.fromEntries(rows.filter((row) => row.stage === stage).map((row) => [row.slot, row.label]));
  return { hero: photosOf("hero"), deal: photosOf("deal"), labels: { hero: labelsOf("hero"), deal: labelsOf("deal") } };
}

// Une photo d'une composition de catégorie : son emplacement, son adresse et sa place (null : la
// place de départ, choisie par le front).
export type CategoryPhoto = { slot: string; url: string; x: number | null; y: number | null; w: number | null; z: number | null };

// Les compositions de toutes les catégories d'un coup, rangées par numéro de catégorie : les
// photos de chaque catégorie suivent l'ordre de leurs emplacements (extra-1, extra-2…).
export async function categoryCompositions(): Promise<Map<number, CategoryPhoto[]>> {
  const rows = await prisma.stageSlot.findMany({
    where: { stage: { startsWith: "category-" }, url: { not: null } },
    select: { stage: true, slot: true, url: true, x: true, y: true, w: true, z: true },
  });
  const compositions = new Map<number, CategoryPhoto[]>();
  for (const { stage, url, ...row } of rows.sort((a, b) => extraNumber(a.slot) - extraNumber(b.slot))) {
    const categoryId = categoryIdOf(stage);
    if (categoryId !== null && url) {
      compositions.set(categoryId, [...(compositions.get(categoryId) ?? []), { ...row, url }]);
    }
  }
  return compositions;
}

// Les photos d'une catégorie supprimée : ses lignes, puis ses images sur Cloudinary.
export async function removeCategoryStage(categoryId: number) {
  const stage = categoryStageName(categoryId);
  const rows = await prisma.stageSlot.findMany({ where: { stage }, select: { publicId: true } });
  await prisma.stageSlot.deleteMany({ where: { stage } });
  await Promise.all(rows.map((row) => deleteFromCloudinary(row.publicId)));
}

// La disposition réglée dans l'éditeur du back-office, en une transaction. Un emplacement
// sans photo n'a pas de ligne : il est ignoré (rien à placer).
export async function setStageLayout(stage: string, layout: StageLayout) {
  await prisma.$transaction(
    layout.slots.map(({ slot, ...place }) => prisma.stageSlot.updateMany({ where: { stage, slot }, data: place })),
  );
}

// Une photo déjà sans fond (choix de Mehdi : il détoure lui-même) : envoyée telle quelle, en
// WebP, qui garde la transparence. L'ancienne photo de l'emplacement part de Cloudinary.
export async function setStagePhoto(stage: string, slot: string, file: Express.Multer.File | undefined) {
  if (!file) {
    throw new AppError(400, "Choisissez une image");
  }
  // Le socle d'une catégorie n'existe que tant que la catégorie existe.
  const categoryId = categoryIdOf(stage);
  if (categoryId !== null && !(await prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }))) {
    throw new AppError(404, "Catégorie introuvable");
  }
  const previous = await prisma.stageSlot.findUnique({ where: { stage_slot: { stage, slot } } });
  // Un nouvel emplacement en plus : refusé au-delà de la limite (remplacer une photo reste permis).
  if (!previous && EXTRA_SLOT.test(slot)) {
    const extras = await prisma.stageSlot.findMany({ where: { stage }, select: { slot: true } });
    if (extras.filter((row) => EXTRA_SLOT.test(row.slot)).length >= MAX_EXTRA_SLOTS) {
      throw new AppError(409, `${MAX_EXTRA_SLOTS} emplacements en plus au maximum sur ce socle`);
    }
  }
  const uploaded = await uploadToCloudinary(file.buffer, "dropzone/stage");
  await prisma.stageSlot.upsert({
    where: { stage_slot: { stage, slot } },
    create: { stage, slot, url: uploaded.url, publicId: uploaded.publicId },
    update: { url: uploaded.url, publicId: uploaded.publicId },
  });
  await deleteFromCloudinary(previous?.publicId ?? null);
  return { url: uploaded.url };
}

export async function removeStagePhoto(stage: string, slot: string) {
  const previous = await prisma.stageSlot.findUnique({ where: { stage_slot: { stage, slot } } });
  if (!previous) {
    return;
  }
  if (previous.label) {
    await prisma.stageSlot.update({
      where: { id: previous.id },
      data: { url: null, publicId: null, x: null, y: null, w: null, z: null },
    });
  } else {
    await prisma.stageSlot.delete({ where: { id: previous.id } });
  }
  await deleteFromCloudinary(previous.publicId);
}

export async function updateStageLabel(stage: string, slot: string, label: string) {
  await prisma.stageSlot.upsert({
    where: { stage_slot: { stage, slot } },
    create: { stage, slot, url: null, label },
    update: { label },
  });
}
