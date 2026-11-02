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
