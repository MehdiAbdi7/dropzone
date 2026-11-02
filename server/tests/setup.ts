import { config } from "dotenv";

// Les tests utilisent leur propre base (`dropzone_complet_test`), décrite dans
// `.env.test` (ignoré par Git). `override` passe devant le `.env` de développement.
config({ path: ".env.test", override: true, quiet: true });
process.env.NODE_ENV = "test";
