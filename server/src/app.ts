import "./config/zod.js";
import express from "express";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requireAuth, requireRole } from "./middlewares/auth.js";
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
import { releaseReservationsMiddleware } from "./middlewares/releaseReservations.js";
import { cashAdminRouter } from "./modules/cash/cash.routes.js";
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

app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/series", seriesRouter);
app.use("/accessories", accessoryRouter);
app.use("/colors", colorRouter);
app.use("/orders", orderRouter);
app.use("/auth", authRouter);
app.use("/stage", stageRouter);
app.use("/store", storeRouter);

// Tout le back-office est protégé en une ligne : impossible d'oublier la
// protection sur une nouvelle route admin.
const adminRouter = express.Router();
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
  stageAdminRouter,
  storeAdminRouter,
  cashAdminRouter,
);
app.use("/admin", requireAuth, requireRole("admin"), adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
