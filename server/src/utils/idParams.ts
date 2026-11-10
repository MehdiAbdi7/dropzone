import { z } from "zod";

// L'identifiant numérique d'une adresse (« /products/:id »), partagé par tous les modules :
// une seule règle pour « un entier positif », écrite ici et nulle part ailleurs.
export const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
