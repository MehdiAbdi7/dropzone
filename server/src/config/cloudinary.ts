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

// Le dossier des photos d'une variante. La vidéo n'est plus envoyée chez Cloudinary (27/11) : c'est un lien
// Instagram (story, Reel), car la lecture et la compression des vidéos consommaient trop de crédits du forfait gratuit.
export const VARIANT_FOLDER = "dropzone/variants";

// Les clés Cloudinary sont-elles réglées ? Sans elles, rien ne peut y être supprimé : l'appelant doit alors garder une trace
// plutôt que de croire que c'est fait.
export function isCloudinaryReady(): boolean {
  return ready;
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
