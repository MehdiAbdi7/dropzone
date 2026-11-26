import app from "./app.js";
import { env, isProduction } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startMediaSweep } from "./modules/products/soldMedia.service.js";

await connectDB();
// Le filet de sécurité des médias d'une variante vendue (26/11) : en PRODUCTION seulement. Il supprime des fichiers chez
// Cloudinary, qui est partagé par toutes les instances : une copie de développement avec les vraies clés Cloudinary et une
// autre base verrait les vidéos de production comme « perdues ». Le journal dit s'il est actif, pour le vérifier sur Render.
if (isProduction) {
  startMediaSweep();
  console.log("Balayage des médias des variantes : actif (premier tour dans 5 minutes, puis chaque heure)");
} else {
  console.log("Balayage des médias des variantes : inactif (hors production)");
}

app.listen(env.PORT, () => {
  console.log(`API démarrée sur le port ${env.PORT}`);
});
