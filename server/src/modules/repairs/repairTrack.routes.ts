import { Router } from "express";
import { trackLimiter } from "../../middlewares/rateLimiters.js";
import { validate } from "../../middlewares/validate.js";
import { repairDecisionSchema, repairTrackSchema } from "./repair.schema.js";
import { decideQuote, trackRepair } from "./repairTrack.service.js";

// Public (sans connexion), monté sous /repairs. Le MÊME limiteur que le suivi de commande : un numéro se devine
// (1001, 1002…), donc le nombre d'essais par adresse est limité, pour les commandes comme pour les réparations. La
// réponse du client à son devis (21/11) passe par le même limiteur : un geste qui change la fiche est encore plus à
// protéger qu'une lecture.
export const repairTrackRouter = Router();

repairTrackRouter.post("/track", trackLimiter, validate({ body: repairTrackSchema }), async (req, res) => {
  res.json({ data: await trackRepair(req.body.number, req.body.phone) });
});

repairTrackRouter.post("/track/decision", trackLimiter, validate({ body: repairDecisionSchema }), async (req, res) => {
  res.json({ data: await decideQuote(req.body.number, req.body.phone, req.body.decision, req.body.total) });
});
