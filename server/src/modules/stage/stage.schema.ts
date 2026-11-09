import { z } from "zod";
import { STAGE_NAMES, isSlotOf } from "./stage.slots.js";

// /admin/stage/:stage/:slot/photo : un socle connu et un de ses emplacements.
export const stageParamsSchema = z
  .object({ stage: z.enum(STAGE_NAMES), slot: z.string().max(20) })
  .refine(({ stage, slot }) => isSlotOf(stage, slot), { error: "Emplacement inconnu pour ce socle", path: ["slot"] });

export const stageNameSchema = z.object({ stage: z.enum(STAGE_NAMES) });
export const stageLabelSchema = z.object({ label: z.string().trim().min(1).max(60) });

// La place d'une photo, en % du cadre (06/11). Bornes larges : le front empêche déjà une photo
// de sortir du cadre, l'API refuse seulement l'absurde. Toutes nulles : la place de départ.
const percent = (min: number, max: number) => z.number().min(min).max(max).nullable();
export const stageLayoutSchema = z.object({
  slots: z
    .array(
      z.object({
        slot: z.string().max(20),
        x: percent(-50, 150),
        y: percent(-50, 150),
        w: percent(5, 100),
        z: z.number().int().min(0).max(50).nullable(),
      }),
    )
    .max(10),
});
export type StageLayout = z.infer<typeof stageLayoutSchema>;

// L'emplacement doit appartenir au socle de l'adresse (vérifié une fois le socle connu).
export function unknownSlots(stage: (typeof STAGE_NAMES)[number], layout: StageLayout): string[] {
  return layout.slots.map((item) => item.slot).filter((slot) => !isSlotOf(stage, slot));
}
