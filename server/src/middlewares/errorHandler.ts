import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError.js";
import { Prisma } from "../generated/prisma/client.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { message: "Route introuvable" } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
    return;
  }

  if (typeof err === "object" && err !== null && "type" in err) {
    if (err.type === "entity.parse.failed") {
      res.status(400).json({
        error: { message: "JSON invalide" },
      });
      return;
    }

    if (err.type === "entity.too.large") {
      res.status(413).json({
        error: { message: "Requête trop volumineuse" },
      });
      return;
    }
  }

  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    res.status(409).json({ error: { message: "Cette valeur existe déjà" } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { message: "Erreur interne du serveur" } });
}
