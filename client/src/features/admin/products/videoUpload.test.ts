import { describe, expect, it } from "vitest";
import { videoUploadForm } from "./videoUpload";

// L'envoi direct d'une vidéo chez Cloudinary (26/11) : le formulaire doit porter EXACTEMENT les paramètres que l'API a
// signés, sinon Cloudinary refuse l'envoi (signature invalide).
const signed = {
  cloudName: "demo",
  apiKey: "123",
  timestamp: 1_700_000_000,
  signature: "abc",
  folder: "dropzone/variants",
  format: "mp4",
  transformation: "c_limit,q_auto,w_720",
};

describe("videoUploadForm", () => {
  const file = new File(["video"], "story.mp4", { type: "video/mp4" });
  const form = videoUploadForm(file, signed);

  it("porte le fichier et tous les paramètres signés, sous les noms de l'API de Cloudinary", () => {
    expect(form.get("file")).toBe(file);
    expect(form.get("api_key")).toBe("123");
    expect(form.get("timestamp")).toBe("1700000000");
    expect(form.get("signature")).toBe("abc");
    expect(form.get("folder")).toBe("dropzone/variants");
    expect(form.get("format")).toBe("mp4");
    expect(form.get("transformation")).toBe("c_limit,q_auto,w_720");
  });

  it("n'ajoute aucun paramètre non signé (Cloudinary refuserait la signature)", () => {
    expect([...form.keys()].sort()).toEqual(["api_key", "file", "folder", "format", "signature", "timestamp", "transformation"]);
  });
});
