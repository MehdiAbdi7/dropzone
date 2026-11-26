import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { startMediaSweep } from "./modules/products/soldMedia.service.js";

await connectDB();
// Le filet de sécurité des médias d'une variante vendue (26/11) : une fois par heure.
startMediaSweep();

app.listen(env.PORT, () => {
  console.log(`API démarrée sur le port ${env.PORT}`);
});
