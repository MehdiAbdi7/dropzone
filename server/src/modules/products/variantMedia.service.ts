import { deleteFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { checkMediaRoom, mediaKindOf, posterOf } from "./variantMedia.rules.js";

// La largeur maximale d'une photo de variante, réduite à l'envoi (26/11) : assez fine pour l'agrandir à l'écran.
const PHOTO_MAX_WIDTH = 1600;

// Les photos et la vidéo d'une variante (26/11), ajoutées depuis le back-office. Ce que l'API rend d'un média :
// `posterUrl` n'existe que pour une vidéo (sa couverture).
export type MediaView = { id: number; kind: "photo" | "video"; url: string; posterUrl: string | null; position: number };

export function toMediaView(item: { id: number; kind: "photo" | "video"; url: string; position: number }): MediaView {
  return { id: item.id, kind: item.kind, url: item.url, posterUrl: item.kind === "video" ? posterOf(item.url) : null, position: item.position };
}

async function variantOrThrow(variantId: number) {
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true, stock: true } });
  if (!variant) {
    throw new AppError(404, "Variante introuvable");
  }
  return variant;
}

export async function addVariantMedia(variantId: number, file: Express.Multer.File | undefined): Promise<MediaView> {
  if (!file) {
    throw new AppError(400, "Aucun fichier reçu (champ « media »)");
  }
  const kind = mediaKindOf(file.mimetype);
  if (!kind) {
    throw new AppError(400, "Formats acceptés : JPEG, PNG, WebP, MP4, MOV ou WebM");
  }
  const variant = await variantOrThrow(variantId);
  const existing = await prisma.variantMedia.findMany({ where: { variantId }, select: { kind: true, position: true } });
  const room = checkMediaRoom({
    stock: variant.stock,
    kind,
    photos: existing.filter((item) => item.kind === "photo").length,
    videos: existing.filter((item) => item.kind === "video").length,
    size: file.size,
  });
  if (!room.ok) {
    throw new AppError(room.status, room.message);
  }
  const uploaded =
    kind === "video"
      ? await uploadVideoToCloudinary(file.buffer)
      : await uploadToCloudinary(file.buffer, "dropzone/variants", { maxWidth: PHOTO_MAX_WIDTH });
  const position = existing.reduce((max, item) => Math.max(max, item.position + 1), 0);
  const created = await prisma.variantMedia.create({
    data: { variantId, kind, url: uploaded.url, publicId: uploaded.publicId, position },
  });
  return toMediaView(created);
}

export async function removeVariantMedia(variantId: number, mediaId: number): Promise<void> {
  const item = await prisma.variantMedia.findFirst({ where: { id: mediaId, variantId } });
  if (!item) {
    throw new AppError(404, "Média introuvable");
  }
  await prisma.variantMedia.delete({ where: { id: item.id } });
  // Un échec chez Cloudinary laisserait seulement un fichier orphelin, pas une fiche cassée : le balayage n'a rien à
  // refaire, mais on le dit dans les logs.
  await deleteFromCloudinary(item.publicId, item.kind).catch((error) => console.error("[médias] suppression Cloudinary impossible :", error));
}

// L'ordre voulu : la liste doit contenir exactement les médias de la variante, une fois chacun.
export async function reorderVariantMedia(variantId: number, ids: number[]): Promise<MediaView[]> {
  await variantOrThrow(variantId);
  const items = await prisma.variantMedia.findMany({ where: { variantId } });
  const known = new Set(items.map((item) => item.id));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
    throw new AppError(400, "La liste doit contenir exactement les médias de la variante");
  }
  await prisma.$transaction(ids.map((id, position) => prisma.variantMedia.update({ where: { id }, data: { position } })));
  const ordered = await prisma.variantMedia.findMany({ where: { variantId }, orderBy: { position: "asc" } });
  return ordered.map(toMediaView);
}
