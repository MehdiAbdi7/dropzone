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
  folder: string;
  format: string;
  transformation: string;
};

// Les paramètres signés d'un envoi de vidéo. La signature couvre le dossier, le format, la compression et l'heure : le
// navigateur ne peut pas envoyer ailleurs ni sans compression, et la signature expire vite (Cloudinary refuse au-delà
// d'une heure).
export function signVideoUpload(): SignedVideoUpload {
  if (!ready) {
    throw new AppError(503, "L'envoi de vidéos n'est pas configuré (variables CLOUDINARY_*)");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: VARIANT_FOLDER, format: "mp4", timestamp, transformation: VIDEO_TRANSFORMATION };
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    apiKey: env.CLOUDINARY_API_KEY!,
    signature: cloudinary.utils.api_sign_request(params, env.CLOUDINARY_API_SECRET!),
    ...params,
  };
}

// Ce que Cloudinary a vraiment reçu pour cette vidéo : son adresse et sa taille, ou null si elle n'existe pas. L'adresse
// enregistrée vient d'ici, jamais du navigateur.
export async function getUploadedVideo(publicId: string): Promise<{ url: string; bytes: number } | null> {
  if (!ready) {
    throw new AppError(503, "L'envoi de vidéos n'est pas configuré (variables CLOUDINARY_*)");
  }
  try {
    const resource = await cloudinary.api.resource(publicId, { resource_type: "video" });
    return { url: resource.secure_url, bytes: resource.bytes };
  } catch (error) {
    if ((error as { error?: { http_code?: number } }).error?.http_code === 404) {
      return null;
    }
    throw new AppError(502, "Cloudinary ne répond pas");
  }
}

// Les vidéos de variantes présentes chez Cloudinary (au plus 500), pour retrouver celles qu'un envoi direct a laissées sans
// ligne en base (onglet fermé avant l'enregistrement).
export async function listVariantVideos(): Promise<{ publicId: string; createdAt: Date }[]> {
  if (!ready) {
    return [];
  }
  const result = await cloudinary.api.resources({ resource_type: "video", type: "upload", prefix: `${VARIANT_FOLDER}/`, max_results: 500 });
  return (result.resources as { public_id: string; created_at: string }[]).map((item) => ({
    publicId: item.public_id,
    createdAt: new Date(item.created_at),
  }));
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
