import { Router } from "express";
import { validate } from "../../middlewares/validate.js";
import { getAdminReservation, getHours, getPublicReservation, putAdminReservation, putHours } from "./store.controller.js";
import { reservationSettingsSchema, storeHoursSchema } from "./store.schema.js";

export const storeRouter = Router();
storeRouter.get("/hours", getHours);
storeRouter.get("/reservation", getPublicReservation);

// Monté sous /admin, déjà protégé.
export const storeAdminRouter = Router();
storeAdminRouter.put("/store/hours", validate({ body: storeHoursSchema }), putHours);
// L'avance et le numéro BaridiMob de la réservation illimitée : l'admin seul (la table des droits les ferme par défaut).
storeAdminRouter.get("/store/reservation", getAdminReservation);
storeAdminRouter.put("/store/reservation", validate({ body: reservationSettingsSchema }), putAdminReservation);
