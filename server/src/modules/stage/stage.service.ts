import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import type { StageLayout } from "./stage.schema.js";
import { EXTRA_SLOT, MAX_EXTRA_SLOTS, STAGE_SLOTS, type StageName } from "./stage.slots.js";

// Une photo et sa place (x, y, w, z en % du cadre ; null : la place de départ, 06/11).
type StagePhoto = { url: string; x: number | null; y: number | null; w: number | null; z: number | null };
type StagePhotos = Record<StageName, Record<string, StagePhoto | null>>;

// Le numéro d'un emplacement en plus (« extra-12 » → 12), pour les ranger dans l'ordre.
const extraNumber = (slot: string) => Number(slot.slice("extra-".length));

// Les photos des deux socles : chaque emplacement nommé (null : vide, le front garde
// l'illustration de départ), puis les emplacements en plus qui ont une photo, dans l'ordre.
export async function stagePhotos(): Promise<StagePhotos> {
  const rows = await prisma.stageSlot.findMany({
    select: { stage: true, slot: true, url: true, x: true, y: true, w: true, z: true },
  });
  const photo = (row: (typeof rows)[number]) => ({ url: row.url, x: row.x, y: row.y, w: row.w, z: row.z });
  const photosOf = (stage: StageName) => {
    const named = STAGE_SLOTS[stage].map((slot) => {
      const row = rows.find((item) => item.stage === stage && item.slot === slot);
      return [slot, row ? photo(row) : null] as const;
    });
    const extras = rows
      .filter((row) => row.stage === stage && EXTRA_SLOT.test(row.slot))
      .sort((a, b) => extraNumber(a.slot) - extraNumber(b.slot))
      .map((row) => [row.slot, photo(row)] as const);
    return Object.fromEntries([...named, ...extras]);
  };
  return { hero: photosOf("hero"), deal: photosOf("deal") };
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
  await prisma.stageSlot.delete({ where: { id: previous.id } });
  await deleteFromCloudinary(previous.publicId);
}
