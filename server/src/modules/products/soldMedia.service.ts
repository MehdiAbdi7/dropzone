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

// Supprime les médias de toute variante VENDUE ; rend le nombre de lignes supprimées. Les lignes partent d'abord (la
// base fait foi), les fichiers ensuite.
// Vendue = le stock est à 0 ET aucune commande en cours ne la tient (décision de Mehdi du 26/11). Une commande en
// attente, confirmée, expédiée, livrée mais pas encore encaissée, ou une réservation (deux jours ou illimitée) garde les
// médias : si le client ne vient pas, la réservation expire ou l'on annule, l'article revient en vente et doit retrouver
// ses photos et sa vidéo. La vente est faite quand la commande est payée : « picked_up » (vente au comptoir, échange,
// remplacement, réservation récupérée) ou « collected » (livraison encaissée).
// Une seule requête qui supprime ET rend les fichiers (`DELETE … RETURNING`) : deux balayages en même temps ne
// détruisent jamais deux fois le même fichier, et un stock remis entre la lecture et la suppression est impossible.
export async function purgeSoldMedia(): Promise<number> {
  const sold = await prisma.$queryRaw<MediaFile[]>`
    DELETE FROM variant_media m
    USING product_variants v
    WHERE m.variant_id = v.id
      AND v.stock <= 0
      AND NOT EXISTS (
        SELECT 1 FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.sku = v.sku
          AND o.status IN ('pending', 'confirmed', 'shipped', 'delivered', 'reserved')
      )
    RETURNING m.public_id AS "publicId", m.kind::text AS "kind"`;
  await destroyMediaFiles(sold);
  return sold.length;
}

// Le filet de sécurité : un chemin qui baisse le stock sans passer par l'API (un script d'import) est rattrapé ici.
export function startMediaSweep(intervalMs = 3_600_000, purge: () => Promise<number> = purgeSoldMedia): NodeJS.Timeout {
  const timer = setInterval(() => {
    purge().catch((error) => console.error("[médias] balayage impossible :", error));
  }, intervalMs);
  timer.unref();
  return timer;
}
