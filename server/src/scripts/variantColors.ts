// Donne une couleur de son modèle à chaque exemplaire d'appareil (étape Couleur, 05/11).
//   npm run colors:variants              → simulation : tout est fait puis annulé, le rapport s'affiche
//   npm run colors:variants -- --apply   → écrit, en une seule transaction
// Une couleur déjà posée (ou corrigée par le gérant) n'est pas touchée.
import { prisma } from "../config/db.js";
import { type FillReport, fillVariantColors } from "./fillVariantColors.js";

const apply = process.argv.includes("--apply");

class Simulation extends Error {
  constructor(public report: FillReport) {
    super("simulation");
  }
}

function print(report: FillReport, written: boolean) {
  console.log(
    `${written ? "Écrit" : "Simulation, rien n'est écrit"} : ${report.filled} exemplaires colorés, ` +
      `${report.renamed} couleurs renommées, ${report.photos} photos rangées sous leur couleur.`,
  );
  if (report.appended.length > 0) {
    console.log("Couleurs ajoutées à leur modèle (sans équivalent officiel) :");
    report.appended.forEach(({ model, color }) => console.log(`  ${model} : ${color}`));
  }
  console.log(`Modèles d'appareils restés sans couleurs : ${report.withoutColors.length}`);
  report.withoutColors.forEach((model) => console.log(`  ${model}`));
  if (!written) {
    console.log("Relance avec --apply pour écrire.");
  }
}

try {
  const report = await prisma.$transaction(
    async (tx) => {
      const result = await fillVariantColors(tx);
      if (!apply) {
        throw new Simulation(result);
      }
      return result;
    },
    { timeout: 120_000 },
  );
  print(report, true);
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  print(error.report, false);
} finally {
  await prisma.$disconnect();
}
