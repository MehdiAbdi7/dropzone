import { deleteFromCloudinary, uploadToCloudinary, uploadVideoToCloudinary } from "../../config/cloudinary.js";
import { prisma, type Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { destroyMediaFiles } from "./soldMedia.service.js";
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

// La place qui reste à la variante pour ce média, et sa position (à la fin) : lue sur `db`, la base ou une transaction.
async function roomFor(db: Tx, variantId: number, kind: "photo" | "video", size: number) {
  const variant = await db.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
  if (!variant) {
    throw new AppError(404, "Variante introuvable");
  }
  const existing = await db.variantMedia.findMany({ where: { variantId }, select: { kind: true, position: true } });
  const room = checkMediaRoom({
    stock: variant.stock,
    kind,
    photos: existing.filter((item) => item.kind === "photo").length,
    videos: existing.filter((item) => item.kind === "video").length,
    size,
  });
  const position = existing.reduce((max, item) => Math.max(max, item.position + 1), 0);
  return { room, position };
}

export async function addVariantMedia(variantId: number, file: Express.Multer.File | undefined): Promise<MediaView> {
  if (!file) {
    throw new AppError(400, "Aucun fichier reçu (champ « media »)");
  }
  const kind = mediaKindOf(file.mimetype);
  if (!kind) {
    throw new AppError(400, "Formats acceptés : JPEG, PNG, WebP, MP4, MOV ou WebM");
  }
  await variantOrThrow(variantId);
  // Première vérification, avant l'envoi : refuser tout de suite (variante épuisée, plafond atteint, fichier trop lourd)
  // sans déranger Cloudinary.
  const first = await roomFor(prisma, variantId, kind, file.size);
  if (!first.room.ok) {
    throw new AppError(first.room.status, first.room.message);
  }
  const uploaded =
    kind === "video"
      ? await uploadVideoToCloudinary(file.buffer)
      : await uploadToCloudinary(file.buffer, "dropzone/variants", { maxWidth: PHOTO_MAX_WIDTH });
  try {
    // L'envoi peut durer une minute : pendant ce temps un autre envoi, ou une vente, a pu changer la place qui reste.
    // Deuxième vérification, sous verrou de la ligne de la variante, juste avant d'enregistrer : deux envois en même
    // temps ne dépassent jamais le plafond.
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${variantId} FOR UPDATE`;
      const last = await roomFor(tx, variantId, kind, file.size);
      if (!last.room.ok) {
        throw new AppError(last.room.status, last.room.message);
      }
      const created = await tx.variantMedia.create({
        data: { variantId, kind, url: uploaded.url, publicId: uploaded.publicId, position: last.position },
      });
      return toMediaView(created);
    });
  } catch (error) {
    // Le fichier est déjà chez Cloudinary mais n'a pas de ligne : on le supprime (avec une trace s'il résiste).
    await destroyMediaFiles([{ publicId: uploaded.publicId, kind }]);
    throw error;
  }
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
