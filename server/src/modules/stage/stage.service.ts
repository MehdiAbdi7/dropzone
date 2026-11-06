import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import type { StageLayout } from "./stage.schema.js";
import { STAGE_SLOTS, type StageName } from "./stage.slots.js";

// Une photo et sa place (x, y, w, z en % du cadre ; null : la place de départ, 06/11).
type StagePhoto = { url: string; x: number | null; y: number | null; w: number | null; z: number | null };
type StagePhotos = { [Stage in StageName]: Record<(typeof STAGE_SLOTS)[Stage][number], StagePhoto | null> };

// Les photos des deux socles, chaque emplacement présent (null : vide, le front garde
// l'illustration de départ).
export async function stagePhotos(): Promise<StagePhotos> {
  const rows = await prisma.stageSlot.findMany({
    select: { stage: true, slot: true, url: true, x: true, y: true, w: true, z: true },
  });
  const photosOf = (stage: StageName) =>
    Object.fromEntries(
      STAGE_SLOTS[stage].map((slot) => {
        const row = rows.find((item) => item.stage === stage && item.slot === slot);
        return [slot, row ? { url: row.url, x: row.x, y: row.y, w: row.w, z: row.z } : null];
      }),
    );
  return { hero: photosOf("hero"), deal: photosOf("deal") } as StagePhotos;
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
