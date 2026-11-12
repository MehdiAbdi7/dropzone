// Remplace les anciens verres et coques par les nouveaux (refonte du 12/11) : voir lib/replaceAccessories.ts.
//   npm run accessories:refonte              → essai à blanc : tout est fait puis annulé, le résumé s'affiche
//   npm run accessories:refonte -- --apply   → écrit pour de bon, en une seule transaction
// La base visée est celle de server/.env (dans le dossier principal : la base Neon de la boutique
// en ligne). Avant d'écrire sur Neon : branche de sauvegarde, essai à blanc relu, accord de Mehdi.
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { type ReplaceReport, replaceAccessories } from "./lib/replaceAccessories.js";

const apply = process.argv.includes("--apply");

class Simulation extends Error {
  constructor(readonly report: ReplaceReport) {
    super("simulation");
  }
}

function summary(report: ReplaceReport): string {
  const created = report.fill.accessories.filter((a) => a.status === "créé");
  return [
    // Chaque nom, pour relire l'essai à blanc avant d'écrire sur Neon : un produit ajouté à la main
    // dans « Coques » ou « Incassable Écran » serait supprimé aussi.
    `Anciens produits supprimés : ${report.deleted.length}`,
    ...[...report.deleted].sort((a, b) => a.localeCompare(b, "fr")).map((name) => `  - ${name}`),
    `Produits créés : ${created.length} (${report.fill.created.variants} variantes)`,
    ...created.map((a) => `  ${a.name} : ${a.variants} variantes`),
    `Déjà là, inchangés : ${report.fill.accessories.filter((a) => a.status === "existe déjà").length}`,
    `Valeurs de listes ajoutées : ${report.fill.created.choices}, listes créées : ${report.fill.created.lists}`,
    `Marques retirées (sans produit) : ${report.makersRemoved.length ? report.makersRemoved.join(", ") : "aucune"}`,
  ].join("\n");
}

console.log(`Base visée : ${new URL(env.DATABASE_URL).host}${new URL(env.DATABASE_URL).pathname}`);

try {
  const report = await prisma.$transaction(
    async (tx) => {
      const result = await replaceAccessories(tx);
      if (!apply) {
        throw new Simulation(result);
      }
      return result;
    },
    { timeout: 600_000, maxWait: 20_000 },
  );
  console.log("\nÉcrit.\n" + summary(report));
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  console.log("\nEssai à blanc, rien n'est écrit. Relance avec --apply pour écrire.\n" + summary(error.report));
} finally {
  await prisma.$disconnect();
}
