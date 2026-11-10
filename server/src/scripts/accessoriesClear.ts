// Vide les catégories d'accessoires : produits et types (06/11).
//   npm run accessories:clear              → simulation : tout est fait puis annulé, le rapport s'affiche
//   npm run accessories:clear -- --apply   → écrit, en une seule transaction, puis retire les photos de Cloudinary
import { deleteFromCloudinary } from "../config/cloudinary.js";
import { prisma } from "../config/db.js";
import { type ClearReport, clearAccessories } from "./lib/clearAccessories.js";

const apply = process.argv.includes("--apply");

class Simulation extends Error {
  constructor(public report: ClearReport) {
    super("simulation");
  }
}

function print(report: ClearReport, written: boolean) {
  console.log(
    `${written ? "Écrit" : "Simulation, rien n'est écrit"} : ${report.products} accessoires et ` +
      `${report.types} types supprimés, ${report.images.length} photos Cloudinary.`,
  );
  if (!written) {
    console.log("Relance avec --apply pour écrire.");
  }
}

try {
  const report = await prisma.$transaction(async (tx) => {
    const result = await clearAccessories(tx);
    if (!apply) {
      throw new Simulation(result);
    }
    return result;
  });
  await Promise.allSettled(report.images.map((publicId) => deleteFromCloudinary(publicId)));
  print(report, true);
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  print(error.report, false);
} finally {
  await prisma.$disconnect();
}
