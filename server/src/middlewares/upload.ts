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

// Une photo d'une variante (26/11) : le champ s'appelle « media ». 4 Mo au plus, sous les 4,5 Mo que Vercel accepte pour
// un corps de requête (la photo traverse sa réécriture vers l'API). Une vidéo ne passe pas par ici : c'est le lien d'un
// Instagram (voir `addVariantStory`).
export const uploadMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ACCEPTED.includes(file.mimetype)) {
      callback(new AppError(400, "Formats acceptés : JPEG, PNG ou WebP (la vidéo est un lien Instagram)"));
      return;
    }
    callback(null, true);
  },
}).single("media");
