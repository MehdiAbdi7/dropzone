import type { Role } from "../generated/prisma/client.js";

// Ce que les middlewares rangent dans `res.locals`, typé une fois pour toute l'API.
declare global {
  namespace Express {
    interface Locals {
      user?: { id: number; role: Role };
      query?: unknown;
    }
  }
}

export {};
