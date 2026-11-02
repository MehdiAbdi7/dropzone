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

export function uploadToCloudinary(buffer: Buffer): Promise<{ url: string; publicId: string }> {
  if (!ready) {
    throw new AppError(503, "L'envoi d'images n'est pas configuré (variables CLOUDINARY_*)");
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "dropzone/products", format: "webp" },
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

// Sans publicId (images du script de remplissage), il n'y a rien à supprimer chez Cloudinary.
export async function deleteFromCloudinary(publicId: string | null): Promise<void> {
  if (!ready || !publicId) {
    return;
  }
  await cloudinary.uploader.destroy(publicId);
}
