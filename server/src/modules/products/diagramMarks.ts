import { z } from "zod";

// Les points posés à la main sur le dessin d'un reconditionné (27/11, demande de Mehdi). Le dessin range chaque valeur
// des listes « Pièces remplacées » et « Défauts visibles » dans une zone connue (écran, cadre…). Une valeur ajoutée à la
// main n'est dans aucune zone : sans position, elle n'était pas dessinée. Le gérant clique sur le dessin, et la position
// est gardée sur la variante : chaque appareil a ses propres points (une rayure à gauche sur l'un, à droite sur l'autre).

// Le dessin mesure 220 sur 200 (le `viewBox` de DeviceDiagram) : un point est une position dans ce repère, le même pour un
// téléphone, une tablette, un PC ou une montre.
export const DIAGRAM_WIDTH = 220;
export const DIAGRAM_HEIGHT = 200;
// Autant de points que de valeurs possibles dans une liste (voir `labelList`).
const MAX_MARKS = 15;

const pointSchema = z.object({
  x: z.number().min(0).max(DIAGRAM_WIDTH),
  y: z.number().min(0).max(DIAGRAM_HEIGHT),
});

// Une famille de points : l'étiquette de la valeur (« Verre de l'écran ») vers sa position.
const marksOf = z
  .record(z.string().trim().min(1).max(80), pointSchema)
  .refine((marks) => Object.keys(marks).length <= MAX_MARKS, { error: "Trop de points sur le dessin" })
  .default({});

export const diagramMarksSchema = z
  .object({
    // Une pièce remplacée posée à la main : la zone sous le point devient bleue, ou un point bleu si le point est hors zone.
    parts: marksOf,
    // Un défaut visible posé à la main : un point rouge.
    defects: marksOf,
  })
  .default({ parts: {}, defects: {} });

export type DiagramMarks = z.infer<typeof diagramMarksSchema>;

export const NO_MARKS: DiagramMarks = { parts: {}, defects: {} };

// Ne garde que les points des valeurs encore sur la variante : retirer un défaut ou une pièce retire son point, pour qu'un
// point oublié ne revienne pas si la valeur est recochée plus tard.
export function keepMarksOf(
  marks: DiagramMarks,
  sheet: { replacedParts: string[]; defects: string[] },
): DiagramMarks {
  const only = (group: DiagramMarks["parts"], labels: string[]) =>
    Object.fromEntries(Object.entries(group).filter(([label]) => labels.includes(label)));
  return { parts: only(marks.parts, sheet.replacedParts), defects: only(marks.defects, sheet.defects) };
}
