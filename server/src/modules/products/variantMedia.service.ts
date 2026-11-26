import {
  getUploadedVideo,
  type SignedVideoUpload,
  signVideoUpload,
  uploadToCloudinary,
  VARIANT_FOLDER,
} from "../../config/cloudinary.js";
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

// Enregistre un média déjà chez Cloudinary : deuxième vérification de la place qui reste, sous verrou de la ligne de la
// variante, juste avant d'écrire. Pendant un envoi (qui peut durer une minute), un autre envoi ou une vente a pu changer
// cette place : deux envois en même temps ne dépassent jamais le plafond. Si la vérification échoue, le fichier, qui n'a
// pas de ligne, est supprimé de Cloudinary (avec une trace s'il résiste), puis l'erreur repart.
async function saveUploadedMedia(
  variantId: number,
  media: { kind: "photo" | "video"; url: string; publicId: string; size: number },
): Promise<MediaView> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM product_variants WHERE id = ${variantId} FOR UPDATE`;
      const last = await roomFor(tx, variantId, media.kind, media.size);
      if (!last.room.ok) {
        throw new AppError(last.room.status, last.room.message);
      }
      const created = await tx.variantMedia.create({
        data: { variantId, kind: media.kind, url: media.url, publicId: media.publicId, position: last.position },
      });
      return toMediaView(created);
    });
  } catch (error) {
    await destroyMediaFiles([{ publicId: media.publicId, kind: media.kind }]);
    throw error;
  }
}

// Une photo : elle traverse l'API (4 Mo au plus), qui la réduit et l'envoie à Cloudinary.
export async function addVariantMedia(variantId: number, file: Express.Multer.File | undefined): Promise<MediaView> {
  if (!file) {
    throw new AppError(400, "Aucun fichier reçu (champ « media »)");
  }
  if (mediaKindOf(file.mimetype) !== "photo") {
    throw new AppError(400, "Formats acceptés : JPEG, PNG ou WebP (une vidéo s'envoie à part)");
  }
  await variantOrThrow(variantId);
  // Première vérification, avant l'envoi : refuser tout de suite (variante épuisée, plafond atteint, fichier trop lourd)
  // sans déranger Cloudinary.
  const first = await roomFor(prisma, variantId, "photo", file.size);
  if (!first.room.ok) {
    throw new AppError(first.room.status, first.room.message);
  }
  const uploaded = await uploadToCloudinary(file.buffer, VARIANT_FOLDER, { maxWidth: PHOTO_MAX_WIDTH });
  return saveUploadedMedia(variantId, { kind: "photo", ...uploaded, size: file.size });
}

// Une vidéo, étape 1 : les paramètres signés pour l'envoyer directement du navigateur chez Cloudinary. Refusé tout de
// suite (variante épuisée, vidéo déjà là) : inutile d'envoyer 50 Mo pour être refusé ensuite.
export async function prepareVideoUpload(variantId: number): Promise<SignedVideoUpload> {
  await variantOrThrow(variantId);
  const first = await roomFor(prisma, variantId, "video", 0);
  if (!first.room.ok) {
    throw new AppError(first.room.status, first.room.message);
  }
  return signVideoUpload();
}

// Une vidéo, étape 2 : le navigateur a fini l'envoi et donne l'identifiant Cloudinary. L'adresse et la taille enregistrées
// sont celles que Cloudinary a reçues, jamais celles que dit le navigateur ; l'identifiant doit être dans le dossier des
// variantes et ne pas être déjà celui d'un média (on ne supprime jamais un fichier déjà enregistré).
export async function registerUploadedVideo(variantId: number, publicId: string): Promise<MediaView> {
  if (!publicId.startsWith(`${VARIANT_FOLDER}/`)) {
    throw new AppError(400, "Vidéo inconnue");
  }
  await variantOrThrow(variantId);
  if (await prisma.variantMedia.findFirst({ where: { publicId }, select: { id: true } })) {
    throw new AppError(409, "Cette vidéo est déjà enregistrée");
  }
  const uploaded = await getUploadedVideo(publicId);
  if (!uploaded) {
    throw new AppError(404, "Vidéo introuvable chez Cloudinary");
  }
  return saveUploadedMedia(variantId, { kind: "video", url: uploaded.url, publicId, size: uploaded.bytes });
}

export async function removeVariantMedia(variantId: number, mediaId: number): Promise<void> {
  const item = await prisma.variantMedia.findFirst({ where: { id: mediaId, variantId } });
  if (!item) {
    throw new AppError(404, "Média introuvable");
  }
  await prisma.variantMedia.delete({ where: { id: item.id } });
  // Un échec chez Cloudinary laisse une trace (`media_orphans`) que le balayage réessaie : jamais un fichier perdu.
  await destroyMediaFiles([{ publicId: item.publicId, kind: item.kind }]);
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
