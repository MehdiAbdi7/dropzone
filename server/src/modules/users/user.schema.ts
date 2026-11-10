import { z } from "zod";
import { paginationQuery } from "../../utils/pagination.js";

// La liste des clients du back-office, en lecture seule.
export const customerListQuerySchema = z.object({
  q: z.string().trim().min(1).max(80).optional(),
  ...paginationQuery,
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
