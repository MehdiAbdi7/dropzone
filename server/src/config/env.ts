import "dotenv/config";
import { z } from "zod";
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, { error: "DATABASE_URL is required" }),
  CORS_ORIGINS: z.string().min(1).default("http://localhost:3000"),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Signe les jetons de connexion. 32 caractères au minimum : un secret court se devine.
  JWT_SECRET: z.string().min(32, { error: "JWT_SECRET must be at least 32 characters" }),
  // Facultatives : sans elles, l'API marche, seul l'envoi d'images répond 503.
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(z.prettifyError(result.error));
  process.exit(1);
}
export const env = result.data;
export const isProduction = env.NODE_ENV === "production";
