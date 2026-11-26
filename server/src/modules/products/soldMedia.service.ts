import type { Prisma } from "../../generated/prisma/client.js";
import { deleteFromCloudinary } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";

// Ce qui se vend se supprime (26/11, décision de Mehdi) : les photos et la vidéo d'une variante n'ont de sens que tant
// que l'exemplaire est en vente. Dès que son stock tombe à 0, les lignes partent de la base ET les fichiers de
// Cloudinary (la cascade de la base ne prévient pas Cloudinary, d'où ce service).

export type MediaFile = { publicId: string; kind: "photo" | "video" };

// Supprime des fichiers chez Cloudinary. Ne lève jamais : un échec laisse un fichier orphelin, jamais une vente ou une
// fiche cassée. Il est écrit dans les logs.
export async function destroyMediaFiles(files: MediaFile[]): Promise<void> {
  const results = await Promise.allSettled(files.map((file) => deleteFromCloudinary(file.publicId, file.kind)));
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`[médias] suppression Cloudinary impossible (${files[index].publicId}) :`, result.reason);
    }
  });
}

// Les fichiers des variantes visées : à lire AVANT de les supprimer, après il n'y a plus de lignes pour les retrouver.
export async function mediaFilesOfVariants(where: Prisma.ProductVariantWhereInput): Promise<MediaFile[]> {
  return prisma.variantMedia.findMany({ where: { variant: where }, select: { publicId: true, kind: true } });
}

// Supprime les médias de toute variante dont le stock est à 0 ; rend le nombre de lignes supprimées. Les lignes partent
// d'abord (la base fait foi), les fichiers ensuite.
export async function purgeSoldMedia(): Promise<number> {
  const sold = await prisma.variantMedia.findMany({
    where: { variant: { stock: { lte: 0 } } },
    select: { id: true, publicId: true, kind: true },
  });
  if (sold.length === 0) {
    return 0;
  }
  const { count } = await prisma.variantMedia.deleteMany({ where: { id: { in: sold.map((item) => item.id) } } });
  await destroyMediaFiles(sold);
  return count;
}

// Le filet de sécurité : un chemin qui baisse le stock sans passer par l'API (un script d'import) est rattrapé ici.
export function startMediaSweep(intervalMs = 3_600_000, purge: () => Promise<number> = purgeSoldMedia): NodeJS.Timeout {
  const timer = setInterval(() => {
    purge().catch((error) => console.error("[médias] balayage impossible :", error));
  }, intervalMs);
  timer.unref();
  return timer;
}
