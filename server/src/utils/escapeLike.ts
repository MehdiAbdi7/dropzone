// `contains` de Prisma devient `ILIKE '%texte%'`, mais n'échappe pas `%` et `_`.
// Sans cette fonction, un client qui tape `%` verrait tout le catalogue.
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
