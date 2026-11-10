import { prisma } from "../config/db.js";
import { OFFICIAL_PHONE_CONTENT, phoneDescription } from "./import/official-phone-content.js";

const apply = process.argv.includes("--apply");

async function main() {
  const products = await prisma.product.findMany({
    where: { status: "published", deviceModel: { kind: "phone" } },
    select: { id: true, deviceModel: { select: { brand: true, name: true } } },
    orderBy: { id: "asc" },
  });

  const entries = products.flatMap(({ id, deviceModel }) =>
    deviceModel ? [{ id, model: deviceModel.name, key: `${deviceModel.brand}|${deviceModel.name}` }] : [],
  );
  if (entries.length !== products.length) {
    throw new Error("Un produit smartphone n'est pas associé à un modèle.");
  }
  const keys = new Set(entries.map(({ key }) => key));
  const missing = [...keys].filter((key) => !OFFICIAL_PHONE_CONTENT[key]);
  const unused = Object.keys(OFFICIAL_PHONE_CONTENT).filter((key) => !keys.has(key));
  if (missing.length || unused.length || products.length !== 48) {
    throw new Error(
      `Catalogue inattendu (${products.length} produits téléphone); sans données: ${missing.join(", ") || "aucun"}; ` +
        `données sans produit publié: ${unused.join(", ") || "aucune"}`,
    );
  }

  if (!apply) {
    console.log(`Vérification terminée : ${products.length} fiches smartphone prêtes. Relancer avec --apply pour enregistrer.`);
    return;
  }

  await prisma.$transaction(
    entries.map(({ id, model, key }) => {
      const content = OFFICIAL_PHONE_CONTENT[key];
      const { source: _source, ...specs } = content;
      return prisma.product.update({
        where: { id },
        data: { specs, description: phoneDescription(model, specs) },
        select: { id: true },
      });
    }),
  );
  console.log(`Caractéristiques et descriptions mises à jour pour ${products.length} smartphones.`);
}

main()
  .catch((error: unknown) => {
    console.error("Échec de la mise à jour des smartphones :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
