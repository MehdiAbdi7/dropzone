import multer from "multer";
import { AppError } from "../utils/AppError.js";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// L'image reste en mémoire (pas de fichier temporaire) le temps de l'envoyer à Cloudinary.
export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ACCEPTED.includes(file.mimetype)) {
      callback(new AppError(400, "Formats acceptés : JPEG, PNG ou WebP"));
      return;
    }
    callback(null, true);
  },
}).single("image");

const MEDIA_ACCEPTED = [...ACCEPTED, "video/mp4", "video/quicktime", "video/webm"];

// Les photos et la vidéo d'une variante (26/11) : le champ s'appelle « media ». La limite de 50 Mo est celle de la
// vidéo ; la taille maximale d'une photo (5 Mo) est vérifiée ensuite par `checkMediaRoom`, qui connaît le type.
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!MEDIA_ACCEPTED.includes(file.mimetype)) {
      callback(new AppError(400, "Formats acceptés : JPEG, PNG, WebP, MP4, MOV ou WebM"));
      return;
    }
    callback(null, true);
  },
}).single("media");
