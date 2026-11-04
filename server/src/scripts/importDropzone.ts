// Met la base au vrai catalogue de DropZone, d'après le relevé de ses annonces Instagram
// (server/data/dropzone-annonces.tsv). Sans remise à zéro, rejouable.
//   npm run import:dropzone              → simulation : tout est fait puis annulé, le rapport s'affiche
//   npm run import:dropzone -- --apply   → écrit, en une seule transaction
// Refuse de tourner en production, sauf avec --force.
import { readFileSync } from "node:fs";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { type ImportReport, importDropzone } from "./import/catalog.js";
import { readTsv } from "./import/listing.js";

const apply = process.argv.includes("--apply");
const force = process.argv.includes("--force");

if (env.NODE_ENV === "production" && !force) {
  console.error("Production détectée : relance avec --force si c'est vraiment voulu.");
  process.exit(1);
}

// Une simulation fait tout dans la transaction, puis l'annule en levant cette erreur.
class Simulation extends Error {
  constructor(readonly report: ImportReport) {
    super("simulation");
  }
}

function print(report: ImportReport, title: string) {
  console.log(title);
  console.log("  Retiré :", report.removed);
  console.log("  Créé :", report.created);
  console.log("  Mis à jour :", report.updated);
  const reasons = new Map<string, string[]>();
  for (const { code, reason } of report.skipped) {
    reasons.set(reason, [...(reasons.get(reason) ?? []), code]);
  }
  console.log(`  Annonces non importées : ${report.skipped.length}`);
  for (const [reason, codes] of reasons) {
    console.log(`    ${reason} (${codes.length}) : ${codes.join(", ")}`);
  }
}

const rows = readTsv(readFileSync(new URL("../../data/dropzone-annonces.tsv", import.meta.url), "utf8"));

try {
  const report = await prisma.$transaction(
    async (tx) => {
      const result = await importDropzone(tx, rows);
      if (!apply) {
        throw new Simulation(result);
      }
      return result;
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
  print(report, `Import écrit (${rows.length} lignes lues).`);
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  print(error.report, `Simulation (${rows.length} lignes lues), rien n'est écrit. Relance avec --apply pour écrire.`);
} finally {
  await prisma.$disconnect();
}
