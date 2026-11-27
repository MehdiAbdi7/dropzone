import { uploadToCloudinary, VARIANT_FOLDER } from "../../config/cloudinary.js";
import { prisma, type Tx } from "../../config/db.js";
import { AppError } from "../../utils/AppError.js";
import { destroyMediaFiles } from "./soldMedia.service.js";
import { checkMediaRoom, mediaKindOf, posterOf, reelUrlOf } from "./variantMedia.rules.js";

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

// Enregistre un média : une photo déjà chez Cloudinary (elle a un `publicId`), ou un lien de Reel (`publicId` null, rien à
// supprimer chez Cloudinary). Deuxième vérification de la place qui reste, sous verrou de la ligne de la variante, juste
// avant d'écrire : pendant un envoi, un autre envoi ou une vente a pu changer cette place, et deux envois en même temps ne
// dépassent jamais le plafond. Si la vérification échoue, la photo, qui n'a pas de ligne, est supprimée de Cloudinary (avec
// une trace s'il résiste), puis l'erreur repart.
async function saveUploadedMedia(
  variantId: number,
  media: { kind: "photo" | "video"; url: string; publicId: string | null; size: number },
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
    // Jamais le fichier d'un média qui existe : deux appels pour le même fichier en même temps, et le perdant ne doit pas
    // supprimer celui du gagnant (la ligne du gagnant pointerait vers un fichier disparu). Un lien de Reel n'a pas de fichier.
    if (media.publicId) {
      const registered = await prisma.variantMedia.findFirst({ where: { publicId: media.publicId }, select: { id: true } });
      if (!registered) {
        await destroyMediaFiles([{ publicId: media.publicId, kind: media.kind }]);
      }
    }
    throw error;
  }
}

// Une photo : elle traverse l'API (4 Mo au plus), qui la réduit et l'envoie à Cloudinary.
export async function addVariantMedia(variantId: number, file: Express.Multer.File | undefined): Promise<MediaView> {
  if (!file) {
    throw new AppError(400, "Aucun fichier reçu (champ « media »)");
  }
  if (mediaKindOf(file.mimetype) !== "photo") {
    throw new AppError(400, "Formats acceptés : JPEG, PNG ou WebP (la vidéo est un lien de Reel Instagram)");
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

// La vidéo d'une variante (27/11) : le lien d'un Reel Instagram que le gérant colle. Rien n'est envoyé ni stocké chez nous :
// la ligne ne garde que l'adresse propre du Reel (`reelUrlOf` jette le suivi et refuse tout ce qui n'est pas un Reel ou une
// publication d'Instagram), et le site l'affiche avec le lecteur d'Instagram. La même vérification de place que pour une
// photo (variante épuisée, une seule vidéo) tourne avant d'écrire.
export async function addVariantReel(variantId: number, link: string): Promise<MediaView> {
  const url = reelUrlOf(link);
  if (!url) {
    throw new AppError(400, "Colle le lien d'un Reel ou d'une publication Instagram (une story ne peut pas s'afficher sur le site)");
  }
  await variantOrThrow(variantId);
  const first = await roomFor(prisma, variantId, "video", 0);
  if (!first.room.ok) {
    throw new AppError(first.room.status, first.room.message);
  }
  return saveUploadedMedia(variantId, { kind: "video", url, publicId: null, size: 0 });
}

export async function removeVariantMedia(variantId: number, mediaId: number): Promise<void> {
  const item = await prisma.variantMedia.findFirst({ where: { id: mediaId, variantId } });
  if (!item) {
    throw new AppError(404, "Média introuvable");
  }
  await prisma.variantMedia.delete({ where: { id: item.id } });
  // Un échec chez Cloudinary laisse une trace (`media_orphans`) que le balayage réessaie : jamais un fichier perdu. Un lien
  // de Reel n'a pas de fichier chez nous : rien à supprimer.
  if (item.publicId) {
    await destroyMediaFiles([{ publicId: item.publicId, kind: item.kind }]);
  }
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
