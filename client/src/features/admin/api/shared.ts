// Ce que les fichiers d'API du back-office ont en commun.

// L'API répond { data: … } : on ne garde que le contenu.
export const data = <T,>(body: { data: T }) => body.data;

// Le corps d'un envoi de photo : un formulaire avec le fichier dans le champ « image ».
export function imageForm(file: File): FormData {
  const form = new FormData();
  form.append("image", file);
  return form;
}
