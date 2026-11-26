import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { AppError } from "../utils/AppError.js";

const ready = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
);

if (ready) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// `folder` range les images par usage : photos produit ou logos de marques. `maxWidth` (26/11, photos d'une variante) :
// l'image est réduite UNE fois à l'envoi, jamais agrandie, pour qu'une miniature de 56 px ne télécharge pas une photo
// de téléphone en pleine résolution (la bande passante est la contrainte du forfait gratuit).
export function uploadToCloudinary(
  buffer: Buffer,
  folder = "dropzone/products",
  options: { maxWidth?: number } = {},
): Promise<{ url: string; publicId: string }> {
  if (!ready) {
    throw new AppError(503, "L'envoi d'images n'est pas configuré (variables CLOUDINARY_*)");
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        format: "webp",
        ...(options.maxWidth ? { transformation: [{ width: options.maxWidth, crop: "limit", quality: "auto" }] } : {}),
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError(502, "Cloudinary a refusé l'image"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

// La vidéo d'une variante (26/11) : envoyée DIRECTEMENT du navigateur vers Cloudinary, jamais à travers notre API. Un
// fichier de 50 Mo ne traverse ainsi ni la réécriture de Vercel (délai de 120 s, taille non documentée) ni la mémoire du
// serveur. L'API ne fait que signer l'envoi (`signVideoUpload`), puis vérifier ce que Cloudinary a reçu (`getUploadedVideo`).
// La vidéo est compressée UNE fois, à l'envoi (largeur 720 px au plus, qualité automatique, mp4), pour que sa lecture ne
// coûte ni transformation ni gros transfert ; le fichier d'origine n'est pas gardé.
export const VARIANT_FOLDER = "dropzone/variants";
const VIDEO_TRANSFORMATION = "c_limit,q_auto,w_720";

export type SignedVideoUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  format: string;
  allowedFormats: string;
  overwrite: string;
  transformation: string;
};

// Les clés Cloudinary sont-elles réglées ? Sans elles, rien ne peut y être supprimé : l'appelant doit alors garder une trace
// plutôt que de croire que c'est fait.
export function isCloudinaryReady(): boolean {
  return ready;
}

// Les paramètres signés d'un envoi de vidéo pour la variante `variantId`. La signature couvre TOUT ce que le navigateur
// envoie, donc il ne peut rien changer :
// - l'identifiant du fichier (`public_id`) est choisi ici, dans le dossier des variantes et lié à la variante
//   (`v<id>-<aléa>`) : on ne peut ni écraser ni enregistrer le fichier d'une autre variante ; `overwrite: false` interdit
//   de remplacer un fichier existant même en réutilisant la signature ;
// - seuls les formats vidéo sont acceptés (Cloudinary range sinon un fichier audio avec les vidéos) ;
// - la compression et le format de sortie ;
// - l'heure : Cloudinary refuse une signature de plus d'une heure.
export function signVideoUpload(variantId: number): SignedVideoUpload {
  if (!ready) {
    throw new AppError(503, "L'envoi de vidéos n'est pas configuré (variables CLOUDINARY_*)");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params = {
    allowed_formats: "mp4,mov,webm",
    format: "mp4",
    overwrite: "false",
    public_id: `${VARIANT_FOLDER}/v${variantId}-${randomBytes(6).toString("hex")}`,
    timestamp,
    transformation: VIDEO_TRANSFORMATION,
  };
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    signature: cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!),
    publicId: params.public_id,
    format: params.format,
    allowedFormats: params.allowed_formats,
    overwrite: params.overwrite,
    timestamp,
    transformation: params.transformation,
  };
}

// Ce que Cloudinary a vraiment reçu pour cette vidéo : son adresse, sa taille (APRÈS la compression), sa durée et sa
// largeur (zéro pour un fichier sans image), ou null si elle n'existe pas. Tout vient d'ici, jamais du navigateur.
export async function getUploadedVideo(
  publicId: string,
): Promise<{ url: string; bytes: number; duration: number; width: number } | null> {
  if (!ready) {
    throw new AppError(503, "L'envoi de vidéos n'est pas configuré (variables CLOUDINARY_*)");
  }
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: "video" });
    return { url: resource.secure_url, bytes: resource.bytes, duration: resource.duration ?? 0, width: resource.width ?? 0 };
  } catch (error) {
    if ((error as { error?: { http_code?: number } }).error?.http_code === 404) {
      return null;
    }
    throw new AppError(502, "Cloudinary ne répond pas");
  }
}

// Les vidéos de variantes présentes chez Cloudinary, pour retrouver celles qu'un envoi direct a laissées sans ligne en base
// (onglet fermé avant l'enregistrement). Cloudinary rend 500 résultats par page : on suit `next_cursor` (au plus 20 pages).
export async function listVariantVideos(): Promise<{ publicId: string; createdAt: Date }[]> {
  if (!ready) {
    return [];
  }
  const videos: { publicId: string; createdAt: Date }[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const result = await cloudinary.api.resources({
      resource_type: "video",
      type: "upload",
      prefix: `${VARIANT_FOLDER}/`,
      max_results: 500,
      ...(cursor ? { next_cursor: cursor } : {}),
    });
    for (const item of result.resources as { public_id: string; created_at: string }[]) {
      videos.push({ publicId: item.public_id, createdAt: new Date(item.created_at) });
    }
    cursor = result.next_cursor;
    if (!cursor) break;
  }
  return videos;
}

// Sans publicId (images du script de remplissage), il n'y a rien à supprimer chez Cloudinary.
// Une vidéo se supprime avec son propre type de ressource : sans lui, Cloudinary ne la trouve pas.
export async function deleteFromCloudinary(publicId: string | null, kind: "photo" | "video" = "photo"): Promise<void> {
  if (!ready || !publicId) {
    return;
  }
  // `invalidate` : sans lui, la copie en cache du CDN peut rester accessible un moment après la suppression.
  await cloudinary.uploader.destroy(publicId, { invalidate: true, ...(kind === "video" ? { resource_type: "video" } : {}) });
}
