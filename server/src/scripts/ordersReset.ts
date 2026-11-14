// Efface toutes les commandes et tout l'historique : argent, caisses, traces, numéros du jour.
// À lancer quand les essais sont finis. Le catalogue, les comptes et les réglages ne sont pas touchés.
//   npm run orders:reset                          → simulation : tout est fait puis annulé, le rapport s'affiche
//   npm run orders:reset -- --apply               → écrit, en une seule transaction
//   npm run orders:reset -- --apply --garder-le-stock   → écrit sans remettre le stock (s'il est déjà corrigé)
//
// ATTENTION : l'API locale lit la base Neon (celle de la boutique en ligne). Ce script y écrit
// donc aussi. Avant `--apply`, crée une branche de sauvegarde dans Neon.
import { prisma } from "../config/db.js";
import { resetOrders, type ResetReport } from "./lib/resetOrders.js";

const apply = process.argv.includes("--apply");
const keepStock = process.argv.includes("--garder-le-stock");

class Simulation extends Error {
  constructor(public report: ResetReport) {
    super("simulation");
  }
}

function print(report: ResetReport, written: boolean) {
  console.log(written ? "Écrit :" : "Simulation, rien n'est écrit :");
  console.log(`  ${report.orders} commandes supprimées`);
  console.log(`  ${report.movements} mouvements d'argent supprimés`);
  console.log(`  ${report.events} traces de modification supprimées`);
  console.log(`  ${report.cashDays} journées de caisse supprimées`);
  console.log(keepStock ? "  stock laissé tel quel" : `  ${report.restockedUnits} appareils remis en stock`);
  if (!written) {
    console.log("Relance avec --apply pour écrire (après une sauvegarde Neon).");
  }
}

try {
  const report = await prisma.$transaction(async (tx) => {
    const result = await resetOrders(tx, { keepStock });
    if (!apply) {
      throw new Simulation(result);
    }
    return result;
  });
  print(report, true);
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  print(error.report, false);
} finally {
  await prisma.$disconnect();
}
