// Remplit le catalogue (neuf de chaque modèle, fiches complètes, accessoires) : voir lib/fillNew.ts.
//   npm run fill:new                       → essai à blanc : tout est fait puis annulé, le rapport s'affiche
//   npm run fill:new -- --report=rapport.md → écrit en plus le détail ligne à ligne dans un fichier
//   npm run fill:new -- --apply            → écrit pour de bon, en une seule transaction
// La base visée est celle de server/.env (depuis le 06/11, la base Neon de la boutique en ligne).
import { writeFileSync } from "node:fs";
import { prisma } from "../config/db.js";
import { env } from "../config/env.js";
import { type FillNewReport, fillNew } from "./lib/fillNew.js";

const apply = process.argv.includes("--apply");
const reportPath = process.argv.find((arg) => arg.startsWith("--report="))?.slice("--report=".length);

class Simulation extends Error {
  constructor(readonly report: FillNewReport) {
    super("simulation");
  }
}

const money = (n: number) => `${n.toLocaleString("fr-FR")} DA`;

function summary(report: FillNewReport): string {
  const devices = report.devices;
  const count = (predicate: (line: FillNewReport["devices"][number]) => boolean) => devices.filter(predicate).length;
  return [
    `Appareils traités : ${devices.length} (téléphones ${count((d) => d.kind === "phone")}, tablettes ${count((d) => d.kind === "tablet")}, PC ${count((d) => d.kind === "laptop")})`,
    `  Fiches créées : ${count((d) => d.product === "créé")}, fiches existantes complétées : ${count((d) => d.product === "existant")}`,
    `  Variantes neuves créées : ${count((d) => d.neuf === "créé")} (dont à stock 0, « Épuisé » : ${count((d) => d.neuf === "créé" && d.stock === 0)})`,
    `  Prix neufs alignés sur le marché : ${count((d) => d.neuf === "prix aligné")}`,
    `  Neufs déjà là, prix inchangé : ${count((d) => d.neuf === "déjà là")} ; neufs conservés car hors marché : ${count((d) => d.neuf === "conservé (hors marché)")}`,
    `  Descriptions écrites : ${count((d) => d.description === "écrite")}, gardées (écrites à la main) : ${count((d) => d.description === "gardée")}`,
    `  Autres configurations de neufs à revoir (non touchées) : ${report.review.length}`,
    `Accessoires : ${report.accessories.filter((a) => a.status === "créé").length} produits à créer, ${report.accessories.filter((a) => a.status === "existe déjà").length} existent déjà`,
    `Créé en tout : ${report.created.products} produits, ${report.created.variants} variantes, ${report.created.choices} valeurs de listes, ${report.created.lists} listes, ${report.created.brands} types d'accessoires, ${report.created.makers} marques d'accessoires`,
    `Modèles de la liste absents de la base : ${report.missingModels.length ? report.missingModels.join(", ") : "aucun"}`,
    `Modèles en série que la liste ne couvre pas : ${report.notCovered.length ? report.notCovered.join(", ") : "aucun"}`,
  ].join("\n");
}

function detail(report: FillNewReport): string {
  const lines = ["# Détail de l'essai", "", "## Appareils", "", "| Type | Modèle | Fiche | Neuf | Prix | Ancien prix | Stock | Caractéristiques ajoutées | Description |", "|---|---|---|---|---|---|---|---|---|"];
  for (const d of report.devices) {
    lines.push(`| ${d.kind} | ${d.name} | ${d.product} | ${d.neuf} | ${money(d.price)} | ${d.oldPrice ? money(d.oldPrice) : ""} | ${d.stock} | ${d.specsAdded.join(", ")} | ${d.description} |`);
  }
  lines.push("", "## Fiches (description et caractéristiques finales)", "");
  for (const d of report.devices) {
    lines.push(`### ${d.name} (${d.kind})`, "", d.text, "", Object.entries(d.specs).map(([k, v]) => `- **${k}** : ${v}`).join("\n"), "");
  }
  lines.push("", "## Autres neufs à revoir (config différente, non touchés)", "", "| Produit | SKU | Options | Prix en base | Prix du marché (config de base) |", "|---|---|---|---|---|");
  for (const r of report.review) lines.push(`| ${r.product} | ${r.sku} | ${r.options} | ${money(r.price)} | ${money(r.marketPrice)} |`);
  lines.push("", "## Accessoires", "", "| Produit | Type | Variantes | Statut |", "|---|---|---|---|");
  for (const a of report.accessories) lines.push(`| ${a.name} | ${a.type} | ${a.variants} | ${a.status} |`);
  return lines.join("\n");
}

const host = new URL(env.DATABASE_URL).host;
console.log(`Base visée : ${host}`);

try {
  const report = await prisma.$transaction(
    async (tx) => {
      const result = await fillNew(tx);
      if (!apply) {
        throw new Simulation(result);
      }
      return result;
    },
    { timeout: 1_500_000, maxWait: 20_000 },
  );
  console.log("\nÉcrit.\n" + summary(report));
  if (reportPath) writeFileSync(reportPath, detail(report));
} catch (error) {
  if (!(error instanceof Simulation)) {
    throw error;
  }
  console.log("\nEssai à blanc, rien n'est écrit. Relance avec --apply pour écrire.\n" + summary(error.report));
  if (reportPath) {
    writeFileSync(reportPath, detail(error.report));
    console.log(`\nDétail écrit dans ${reportPath}`);
  }
} finally {
  await prisma.$disconnect();
}
