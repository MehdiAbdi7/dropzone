// Range en séries les modèles qui n'en ont pas encore, sans rien effacer :
//   npm run series:fill
// Sert à remplir une base existante (celle de la copie) après la migration des séries.
import { prisma } from "../config/db.js";
import { fillSeries } from "./series.js";

const { created, assigned } = await fillSeries(prisma);
console.log(`Séries créées : ${created}, modèles rangés : ${assigned}`);
await prisma.$disconnect();
