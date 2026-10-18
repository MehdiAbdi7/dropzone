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
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  console.error("Invalid environment variables:");
  console.error(z.prettifyError(result.error));
  process.exit(1);
}
export const env = result.data;
