import express from "express";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env.js";

const app = express();
app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS.split(",") }));
app.use(express.json({ limit: "100kb" }));

//routes
app.get("/health", (req, res) => {
  res.json({ data: { status: "ok" } });
});

app.get("/debug-ip", (req, res) => {
  res.json({
    data: { ip: req.ip, forwardedFor: req.headers["x-forwarded-for"] ?? null },
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
