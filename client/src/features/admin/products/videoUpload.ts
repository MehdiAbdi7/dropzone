// L'envoi d'une vidéo directement du navigateur chez Cloudinary (26/11). Elle ne passe pas par notre API : un fichier de
// 50 Mo traverserait sinon la réécriture de Vercel (délai de 120 s, taille non documentée) et la mémoire du serveur.
// L'API signe l'envoi (`prepareVideoUpload`), le navigateur envoie, puis l'API enregistre la vidéo que Cloudinary a reçue.

export type SignedVideoUpload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  format: string;
  transformation: string;
};

// Le formulaire d'envoi : le fichier et EXACTEMENT les paramètres signés, sous les noms de l'API de Cloudinary. Un
// paramètre en plus ou en moins, ou une valeur différente, et Cloudinary refuse la signature.
export function videoUploadForm(file: File, signed: SignedVideoUpload): FormData {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("signature", signed.signature);
  form.append("folder", signed.folder);
  form.append("format", signed.format);
  form.append("transformation", signed.transformation);
  return form;
}

// Envoie la vidéo et rend son identifiant Cloudinary. `onProgress` reçoit un pourcentage (0 à 100) : un envoi de plusieurs
// dizaines de Mo dure, le gérant doit voir qu'il avance. XMLHttpRequest et non fetch, seul à donner la progression.
export function sendVideoToCloudinary(file: File, signed: SignedVideoUpload, onProgress: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/video/upload`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      try {
        const body = JSON.parse(request.responseText) as { public_id?: string; error?: { message?: string } };
        if (request.status >= 200 && request.status < 300 && body.public_id) {
          resolve(body.public_id);
        } else {
          reject(new Error(body.error?.message ?? "Cloudinary a refusé la vidéo"));
        }
      } catch {
        reject(new Error("Réponse de Cloudinary illisible"));
      }
    };
    request.onerror = () => reject(new Error("L'envoi a échoué : vérifie la connexion et réessaie"));
    request.onabort = () => reject(new Error("Envoi annulé"));
    request.send(videoUploadForm(file, signed));
  });
}
