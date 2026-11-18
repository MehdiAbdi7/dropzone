import { Router } from "express";
import { trackLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { repairTrackSchema } from "./repair.schema.js";
import { trackRepair } from "./repairTrack.service.js";

// Public (sans connexion), monté sous /repairs. Le MÊME limiteur que le suivi de commande : un numéro se devine
// (1001, 1002…), donc le nombre d'essais par adresse est limité, pour les commandes comme pour les réparations.
export const repairTrackRouter = Router();

repairTrackRouter.post("/track", trackLimiter, validate({ body: repairTrackSchema }), async (req, res) => {
  res.json({ data: await trackRepair(req.body.number, req.body.phone) });
});
