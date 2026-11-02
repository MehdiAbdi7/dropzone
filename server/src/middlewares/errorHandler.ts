import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../utils/AppError.js";
import { Prisma } from "../generated/prisma/client.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { message: "Route introuvable" } });
}

// Les erreurs de Prisma utiles au client, traduites en un seul endroit.
const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: "Cette valeur existe déjà" },
  P2003: { status: 409, message: "Cette donnée est encore utilisée ailleurs" },
  P2025: { status: 404, message: "Introuvable" },
};

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

  if (err instanceof multer.MulterError) {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    res.status(tooLarge ? 413 : 400).json({
      error: { message: tooLarge ? "Image trop lourde (5 Mo maximum)" : "Fichier refusé" },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const known = PRISMA_ERRORS[err.code];
    if (known) {
      res.status(known.status).json({ error: { message: known.message } });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: { message: "Erreur interne du serveur" } });
}
