// Pose les couleurs officielles (official-colors.ts) sur une base déjà remplie.
//   npm run colors:official              → simulation : tout est fait puis annulé, le rapport s'affiche
//   npm run colors:official -- --apply   → écrit, en une seule transaction
// Un modèle qui a déjà des couleurs n'est pas touché (le gérant a le dernier mot).
import { prisma } from "../config/db.js";
import { applyOfficialColors } from "./lib/applyOfficialColors.js";

const apply = process.argv.includes("--apply");

class Simulation extends Error {
  constructor(public report: Awaited<ReturnType<typeof applyOfficialColors>>) {
    super("simulation");
  }
}

try {
  const report = await prisma.$transaction(async (tx) => {
    const result = await applyOfficialColors(tx);
    if (!apply) {
      throw new Simulation(result);
    }
    return result;
  });
  console.log(`Écrit : couleurs officielles sur ${report.models} modèles, ${report.colorsAdded} couleurs ajoutées à la liste.`);
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  console.log(
    `Simulation, rien n'est écrit : couleurs officielles sur ${error.report.models} modèles, ` +
      `${error.report.colorsAdded} couleurs ajoutées à la liste. Relance avec --apply pour écrire.`,
  );
} finally {
  await prisma.$disconnect();
}
