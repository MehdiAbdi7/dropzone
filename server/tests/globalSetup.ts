import { execSync } from "node:child_process";
import { config } from "dotenv";

// Avant tous les tests : la base de test reçoit les mêmes migrations que la vraie.
export default function setup() {
  const { parsed } = config({ path: ".env.test", quiet: true });
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, ...parsed },
    stdio: "ignore",
  });
}
