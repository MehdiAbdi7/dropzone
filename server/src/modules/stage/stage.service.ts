import { deleteFromCloudinary, uploadToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { STAGE_SLOTS, type StageName } from "./stage.slots.js";

type StagePhotos = { [Stage in StageName]: Record<(typeof STAGE_SLOTS)[Stage][number], string | null> };

// Les photos des deux socles, chaque emplacement présent (null : vide, le front garde
// l'illustration de départ).
export async function stagePhotos(): Promise<StagePhotos> {
  const rows = await prisma.stageSlot.findMany({ select: { stage: true, slot: true, url: true } });
  const photosOf = (stage: StageName) =>
    Object.fromEntries(
      STAGE_SLOTS[stage].map((slot) => [slot, rows.find((row) => row.stage === stage && row.slot === slot)?.url ?? null]),
    );
  return { hero: photosOf("hero"), deal: photosOf("deal") } as StagePhotos;
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
