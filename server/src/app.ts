import "./config/zod.js";
import express from "express";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requireAuth, requireRole } from "./middlewares/auth.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { brandAdminRouter } from "./modules/brands/brand.routes.js";
import { categoryAdminRouter, categoryRouter } from "./modules/categories/category.routes.js";
import { choiceAdminRouter, colorRouter } from "./modules/choices/choice.routes.js";
import { modelAdminRouter } from "./modules/models/model.routes.js";
import { orderAdminRouter, orderRouter } from "./modules/orders/order.routes.js";
import { productAdminRouter } from "./modules/products/productAdmin.routes.js";
import { productRouter } from "./modules/products/product.routes.js";
import { seriesRouter } from "./modules/series/series.routes.js";
import { seriesAdminRouter } from "./modules/series/seriesAdmin.routes.js";
import { statsAdminRouter } from "./modules/stats/stats.routes.js";
import { userAdminRouter } from "./modules/users/user.routes.js";

const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(","), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

//routes
app.get("/health", (req, res) => {
  res.json({ data: { status: "ok" } });
});

app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/series", seriesRouter);
app.use("/colors", colorRouter);
app.use("/orders", orderRouter);
app.use("/auth", authRouter);

// Tout le back-office est protégé en une ligne : impossible d'oublier la
// protection sur une nouvelle route admin.
const adminRouter = express.Router();
adminRouter.use(
  statsAdminRouter,
  productAdminRouter,
  categoryAdminRouter,
  brandAdminRouter,
  modelAdminRouter,
  seriesAdminRouter,
  choiceAdminRouter,
  orderAdminRouter,
  userAdminRouter,
);
app.use("/admin", requireAuth, requireRole("admin"), adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
