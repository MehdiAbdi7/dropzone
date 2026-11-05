import type { Palette } from "@/config/colors";
import { publicFetch } from "@/lib/publicFetch";

// La palette de la boutique (GET /colors), lue par les Server Components et passée aux
// composants qui dessinent une pastille ou une lueur. Lue à chaque visite, comme le reste
// de la boutique : une teinte changée dans Listes s'affiche au rechargement suivant.
// API muette : une palette vide (des noms au lieu des pastilles, une lueur neutre).
export async function getPalette(): Promise<Palette> {
  return (await publicFetch<Palette>("/colors")) ?? {};
}
