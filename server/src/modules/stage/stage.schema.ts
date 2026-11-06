import { z } from "zod";
import { STAGE_NAMES, STAGE_SLOTS } from "./stage.slots.js";

// /admin/stage/:stage/:slot/photo : un socle connu et un de ses emplacements.
export const stageParamsSchema = z
  .object({ stage: z.enum(STAGE_NAMES), slot: z.string().max(20) })
  .refine(({ stage, slot }) => (STAGE_SLOTS[stage] as readonly string[]).includes(slot), {
    error: "Emplacement inconnu pour ce socle",
    path: ["slot"],
  });
