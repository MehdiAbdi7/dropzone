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

// `folder` range les images par usage : photos produit ou logos de marques.
export function uploadToCloudinary(
  buffer: Buffer,
  folder = "dropzone/products",
): Promise<{ url: string; publicId: string }> {
  if (!ready) {
    throw new AppError(503, "L'envoi d'images n'est pas configuré (variables CLOUDINARY_*)");
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, format: "webp" },
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

// La vidéo d'une variante (26/11) : compressée UNE fois, à l'envoi (largeur 720 px au plus, qualité automatique, mp4),
// pour que sa lecture ne coûte ni transformation ni gros transfert. Le fichier d'origine n'est pas gardé.
export function uploadVideoToCloudinary(buffer: Buffer): Promise<{ url: string; publicId: string }> {
  if (!ready) {
    throw new AppError(503, "L'envoi de vidéos n'est pas configuré (variables CLOUDINARY_*)");
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "dropzone/variants",
        resource_type: "video",
        format: "mp4",
        transformation: [{ width: 720, crop: "limit", quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) {
          reject(new AppError(502, "Cloudinary a refusé la vidéo"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

// Sans publicId (images du script de remplissage), il n'y a rien à supprimer chez Cloudinary.
// Une vidéo se supprime avec son propre type de ressource : sans lui, Cloudinary ne la trouve pas.
export async function deleteFromCloudinary(publicId: string | null, kind: "photo" | "video" = "photo"): Promise<void> {
  if (!ready || !publicId) {
    return;
  }
  await cloudinary.uploader.destroy(publicId, kind === "video" ? { resource_type: "video" } : undefined);
}
