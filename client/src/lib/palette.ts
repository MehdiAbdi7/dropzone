import type { Palette } from "@/config/colors";
import { publicFetch } from "@/lib/publicFetch";

// La palette de la boutique (GET /colors), lue par les Server Components et passée aux
// composants qui dessinent une pastille ou une lueur. Mise en cache 60 s, comme les séries :
// une teinte changée dans Listes arrive sur le site en une minute au plus. Next ne fait
// qu'un appel par rendu, même si plusieurs composants de la page la demandent.
// API muette : une palette vide (des noms au lieu des pastilles, une lueur neutre).
export async function getPalette(): Promise<Palette> {
  return (await publicFetch<Palette>("/colors", 60)) ?? {};
}
