// La fusion d'un type d'accessoires dans un autre (15/11, décision de Mehdi : les câbles se
// rangent dans « Chargeurs », avec les blocs et les packs, au lieu d'un type « Câbles » à part).
// Un accessoire a un type (`brandId` : Chargeurs, Coques…) et une marque dans ce type (`makerId` :
// Apple, Samsung, Anker). Fusionner `from` dans `into` :
//   1. chaque marque de `from` est retrouvée dans `into` (même nom écrit pareil), ou créée à la suite ;
//   2. les produits de `from` passent dans `into`, avec la marque correspondante ;
//   3. le type `from` et ses marques (désormais vides) sont supprimés.
// Rejouable : sans type `from`, rien ne change. Sans type `into`, `from` est simplement renommé.
import type { Tx } from "../../config/db.js";
import { slugify } from "../../utils/slugify.js";

export type MergeReport = {
  // Les noms des produits déplacés.
  moved: string[];
  // Les marques créées dans le type de destination (« Apple »).
  makersCreated: string[];
  // Le type `from` a été supprimé (faux s'il n'existait pas, ou s'il a seulement été renommé).
  typeRemoved: boolean;
};

export async function mergeAccessoryType(db: Tx, from: string, into: string): Promise<MergeReport> {
  const report: MergeReport = { moved: [], makersCreated: [], typeRemoved: false };
  const where = { category: { kind: "accessory" as const } };
  const source = await db.brand.findFirst({ where: { ...where, name: from }, include: { makers: true } });
  if (!source) {
    return report;
  }

  const target = await db.brand.findFirst({ where: { ...where, name: into } });
  if (!target) {
    await db.brand.update({ where: { id: source.id }, data: { name: into, slug: slugify(into) } });
    return report;
  }

  // La correspondance marque d'origine → marque de destination, créée quand elle manque.
  const makerIds = new Map<number, number>();
  for (const maker of source.makers) {
    let found = await db.accessoryMaker.findUnique({ where: { typeId_slug: { typeId: target.id, slug: maker.slug } } });
    if (!found) {
      const last = await db.accessoryMaker.findFirst({ where: { typeId: target.id }, orderBy: { position: "desc" } });
      found = await db.accessoryMaker.create({
        data: { typeId: target.id, name: maker.name, slug: maker.slug, logoUrl: maker.logoUrl, position: (last?.position ?? -1) + 1 },
      });
      report.makersCreated.push(maker.name);
    }
    makerIds.set(maker.id, found.id);
  }

  const products = await db.product.findMany({ where: { brandId: source.id }, select: { id: true, name: true, makerId: true } });
  for (const product of products) {
    await db.product.update({
      where: { id: product.id },
      data: { brandId: target.id, makerId: product.makerId === null ? null : makerIds.get(product.makerId) },
    });
    report.moved.push(product.name);
  }

  // Les marques n'ont plus de produit : la suppression du type les emporte (cascade).
  await db.brand.delete({ where: { id: source.id } });
  report.typeRemoved = true;
  return report;
}
