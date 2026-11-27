import "./config/zod.js";
import express from "express";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { adminAccess } from "./middlewares/access.js";
import { requireAuth } from "./middlewares/auth.js";
import { accountAdminRouter } from "./modules/accounts/account.routes.js";
import { accessoryAdminRouter, accessoryRouter } from "./modules/accessories/accessory.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { brandAdminRouter } from "./modules/brands/brand.routes.js";
import { categoryAdminRouter, categoryRouter } from "./modules/categories/category.routes.js";
import { choiceAdminRouter, colorRouter } from "./modules/choices/choice.routes.js";
import { modelAdminRouter } from "./modules/models/model.routes.js";
import { modelColorsAdminRouter } from "./modules/models/modelColorsAdmin.routes.js";
import { orderAdminRouter, orderRouter } from "./modules/orders/order.routes.js";
import { productAdminRouter } from "./modules/products/productAdmin.routes.js";
import { productRouter } from "./modules/products/product.routes.js";
import { seriesRouter } from "./modules/series/series.routes.js";
import { seriesAdminRouter } from "./modules/series/seriesAdmin.routes.js";
import { stageAdminRouter, stageRouter } from "./modules/stage/stage.routes.js";
import { purgeSoldMediaMiddleware } from "./middlewares/purgeSoldMedia.js";
import { releaseReservationsMiddleware } from "./middlewares/releaseReservations.js";
import { cashAdminRouter } from "./modules/cash/cash.routes.js";
import { costPinAdminRouter } from "./modules/costPin/costPin.routes.js";
import { deliveriesAdminRouter } from "./modules/deliveries/deliveries.routes.js";
import { exchangeAdminRouter } from "./modules/exchanges/exchange.routes.js";
import { historyAdminRouter } from "./modules/history/history.routes.js";
import { invoiceAdminRouter } from "./modules/invoices/invoice.routes.js";
import { partAdminRouter } from "./modules/parts/part.routes.js";
import { repairAdminRouter } from "./modules/repairs/repair.routes.js";
import { repairTrackRouter } from "./modules/repairs/repairTrack.routes.js";
import { statsAdminRouter } from "./modules/stats/stats.routes.js";
import { storeAdminRouter, storeRouter } from "./modules/store/store.routes.js";
import { userAdminRouter } from "./modules/users/user.routes.js";

const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(","), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

//routes
app.get("/health", (_req, res) => {
  res.json({ data: { status: "ok" } });
});

// Les retraits expirés repartent en stock avant toute lecture du stock ou des commandes (14/11).
const releaseReservations = releaseReservationsMiddleware();
app.use(["/categories", "/products", "/series", "/accessories", "/orders", "/admin"], releaseReservations);
// Les médias d'une variante vendue sont supprimés après toute écriture réussie du back-office (26/11) : c'est là que se
// font les ventes payées (comptoir, retrait récupéré, livraison encaissée). Une écriture publique (commande du site,
// aperçu d'un panier, suivi) ne peut jamais en faire une : elle ne lance rien.
app.use("/admin", purgeSoldMediaMiddleware());

app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/series", seriesRouter);
app.use("/accessories", accessoryRouter);
app.use("/colors", colorRouter);
app.use("/orders", orderRouter);
app.use("/repairs", repairTrackRouter);
app.use("/auth", authRouter);
app.use("/stage", stageRouter);
app.use("/store", storeRouter);

// Tout le back-office est protégé en une ligne : impossible d'oublier la protection sur une nouvelle
// route. `adminAccess` lit la table de middlewares/access.ts : un rôle plus bas que celui d'une route est
// refusé, et une route absente de la table est pour l'admin seulement (lot 7).
export const adminRouter = express.Router();
adminRouter.use(
  statsAdminRouter,
  productAdminRouter,
  categoryAdminRouter,
  brandAdminRouter,
  accessoryAdminRouter,
  modelAdminRouter,
  modelColorsAdminRouter,
  seriesAdminRouter,
  choiceAdminRouter,
  orderAdminRouter,
  userAdminRouter,
  accountAdminRouter,
  stageAdminRouter,
  storeAdminRouter,
  costPinAdminRouter,
  cashAdminRouter,
  historyAdminRouter,
  deliveriesAdminRouter,
  exchangeAdminRouter,
  invoiceAdminRouter,
  partAdminRouter,
  repairAdminRouter,
);
app.use("/admin", requireAuth, adminAccess, adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
