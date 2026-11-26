import type { Prisma } from "../../generated/prisma/client.js";
import { deleteFromCloudinary, isCloudinaryReady, listVariantVideos } from "../../config/cloudinary.js";
import { prisma } from "../../config/db.js";

// Ce qui se vend se supprime (26/11, décision de Mehdi, précisée le même jour) : les photos et la vidéo d'une variante
// n'ont de sens que tant que l'exemplaire est en vente. Quand la vente est PAYÉE, les lignes partent de la base ET les
// fichiers de Cloudinary (la cascade de la base ne prévient pas Cloudinary, d'où ce service).

export type MediaFile = { publicId: string; kind: "photo" | "video" };

// Supprime des fichiers chez Cloudinary. Ne lève jamais : un échec ne casse ni une vente ni une fiche. Les lignes de
// média étant déjà parties de la base, plus rien ne retrouverait le fichier : on en garde une trace (`media_orphans`) que
// le balayage réessaie jusqu'à ce que Cloudinary réponde (`retryMediaOrphans`).
export async function destroyMediaFiles(files: MediaFile[]): Promise<void> {
  if (files.length === 0) {
    return;
  }
  // Sans clés Cloudinary (une instance de développement branchée sur la vraie base), `deleteFromCloudinary` ne fait rien et
  // ne le dit pas : sans cette vérification, les lignes partiraient sans qu'aucune trace ne reste des fichiers.
  const ready = isCloudinaryReady();
  const results = await Promise.allSettled(
    files.map((file) => (ready ? deleteFromCloudinary(file.publicId, file.kind) : Promise.reject(new Error("Cloudinary non configuré")))),
  );
  await Promise.all(
    results.map(async (result, index) => {
      if (result.status === "fulfilled") return;
      const { publicId, kind } = files[index];
      console.error(`[médias] suppression Cloudinary impossible (${publicId}), réessayée au prochain balayage :`, result.reason);
      await prisma.mediaOrphan.create({ data: { publicId, kind } }).catch((error) => {
        console.error(`[médias] trace du fichier ${publicId} impossible :`, error);
      });
    }),
  );
}

// Réessaie la suppression des fichiers dont un essai a échoué ; rend le nombre de fichiers enfin supprimés. Un fichier
// qui résiste garde sa trace pour le balayage d'après. Sans clés Cloudinary, rien n'est tenté et aucune trace n'est
// effacée : une instance sans clés branchée sur la vraie base ne doit pas vider celles de la production.
export async function retryMediaOrphans(): Promise<number> {
  if (!isCloudinaryReady()) {
    return 0;
  }
  const orphans = await prisma.mediaOrphan.findMany({ orderBy: { id: "asc" }, take: 200 });
  let done = 0;
  for (const orphan of orphans) {
    try {
      await deleteFromCloudinary(orphan.publicId, orphan.kind);
      await prisma.mediaOrphan.delete({ where: { id: orphan.id } });
      done += 1;
    } catch (error) {
      console.error(`[médias] suppression de ${orphan.publicId} toujours impossible :`, error);
    }
  }
  return done;
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

// Une vidéo part directement du navigateur chez Cloudinary : si l'onglet se ferme avant l'enregistrement, elle reste là
// sans aucune ligne en base. Supprime les vidéos des variantes vieilles de plus d'une heure que rien ne désigne (ni un
// média, ni une trace à réessayer). Une vidéo plus récente est peut-être en cours d'envoi : on n'y touche pas.
const STRAY_AFTER_MS = 3_600_000;
// Garde-fou : une vidéo perdue est un accident rare (un onglet fermé), jamais plus de quelques-unes d'un coup. Si le balayage
// en voit davantage, c'est que cette instance ne regarde pas la même base que Cloudinary (une copie de développement avec les
// vraies clés Cloudinary et une base jetable verrait TOUTES les vidéos de production comme perdues) : elle n'en supprime
// aucune et le dit dans les logs.
const MAX_STRAY_PER_SWEEP = 5;

export async function sweepStrayVideos(): Promise<number> {
  const old = (await listVariantVideos()).filter((video) => Date.now() - video.createdAt.getTime() > STRAY_AFTER_MS);
  if (old.length === 0) {
    return 0;
  }
  const publicIds = old.map((video) => video.publicId);
  const [registered, traced] = await Promise.all([
    prisma.variantMedia.findMany({ where: { publicId: { in: publicIds } }, select: { publicId: true } }),
    prisma.mediaOrphan.findMany({ where: { publicId: { in: publicIds } }, select: { publicId: true } }),
  ]);
  const known = new Set([...registered, ...traced].map((item) => item.publicId));
  const stray = old.filter((video) => !known.has(video.publicId));
  if (stray.length > MAX_STRAY_PER_SWEEP) {
    console.error(
      `[médias] ${stray.length} vidéos sans média en base : trop pour un accident, rien n'est supprimé (cette instance lit-elle la bonne base ?)`,
    );
    return 0;
  }
  await destroyMediaFiles(stray.map((video) => ({ publicId: video.publicId, kind: "video" as const })));
  return stray.length;
}

// Un tour de balayage : supprime les médias des variantes vendues, réessaie les fichiers restés chez Cloudinary, puis
// retrouve les vidéos envoyées mais jamais enregistrées. Chaque étape est indépendante : une base ou un Cloudinary en panne
// pour l'une ne doit pas empêcher les autres.
export async function sweepMedia(
  steps: (() => Promise<unknown>)[] = [purgeSoldMedia, retryMediaOrphans, sweepStrayVideos],
): Promise<void> {
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      console.error(`[médias] étape du balayage impossible (${step.name}) :`, error);
    }
  }
}

// Le filet de sécurité : un chemin qui baisse le stock sans passer par l'API (un script d'import) est rattrapé ici, les
// fichiers que Cloudinary n'a pas pu supprimer sont réessayés, les vidéos jamais enregistrées sont retrouvées. Un premier
// tour peu après le démarrage (chaque redéploiement remet le compteur d'une heure à zéro), puis un tour par heure.
// Rend de quoi arrêter les deux minuteries.
export function startMediaSweep(
  intervalMs = 3_600_000,
  sweep: () => Promise<unknown> = sweepMedia,
  firstDelayMs = 300_000,
): { stop: () => void } {
  const run = () => {
    sweep().catch((error) => console.error("[médias] balayage impossible :", error));
  };
  const interval = setInterval(run, intervalMs);
  const first = setTimeout(run, firstDelayMs);
  interval.unref();
  first.unref();
  return {
    stop: () => {
      clearInterval(interval);
      clearTimeout(first);
    },
  };
}
