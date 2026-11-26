import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendVideoToCloudinary, videoUploadForm } from "./videoUpload";

// L'envoi direct d'une vidéo chez Cloudinary (26/11) : le formulaire doit porter EXACTEMENT les paramètres que l'API a
// signés, sinon Cloudinary refuse l'envoi (signature invalide).
const signed = {
  cloudName: "demo",
  apiKey: "123",
  timestamp: 1_700_000_000,
  signature: "abc",
  publicId: "dropzone/variants/v12-ab12cd",
  format: "mp4",
  allowedFormats: "mp4,mov,webm",
  overwrite: "false",
  transformation: "c_limit,q_auto,w_720",
};
const file = new File(["video"], "story.mp4", { type: "video/mp4" });

describe("videoUploadForm", () => {
  const form = videoUploadForm(file, signed);

  it("porte le fichier et tous les paramètres signés, sous les noms de l'API de Cloudinary", () => {
    expect(form.get("file")).toBe(file);
    expect(form.get("api_key")).toBe("123");
    expect(form.get("timestamp")).toBe("1700000000");
    expect(form.get("signature")).toBe("abc");
    expect(form.get("public_id")).toBe("dropzone/variants/v12-ab12cd");
    expect(form.get("format")).toBe("mp4");
    expect(form.get("allowed_formats")).toBe("mp4,mov,webm");
    expect(form.get("overwrite")).toBe("false");
    expect(form.get("transformation")).toBe("c_limit,q_auto,w_720");
  });

  it("n'ajoute aucun paramètre non signé (Cloudinary refuserait la signature)", () => {
    expect([...form.keys()].sort()).toEqual([
      "allowed_formats",
      "api_key",
      "file",
      "format",
      "overwrite",
      "public_id",
      "signature",
      "timestamp",
      "transformation",
    ]);
  });
});

// Un faux XMLHttpRequest : le test décide quand l'envoi finit, échoue, expire ou est annulé.
class FakeRequest {
  static last: FakeRequest;
  method = "";
  url = "";
  body: unknown = null;
  timeout = 0;
  status = 0;
  responseText = "";
  aborted = false;
  upload: { onprogress: ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  constructor() {
    FakeRequest.last = this;
  }
  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  send(body: unknown) {
    this.body = body;
  }
  abort() {
    this.aborted = true;
    this.onabort?.();
  }
}

describe("sendVideoToCloudinary", () => {
  beforeEach(() => {
    vi.stubGlobal("XMLHttpRequest", FakeRequest);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envoie le formulaire signé à l'adresse vidéo de SON compte Cloudinary", () => {
    void sendVideoToCloudinary(file, signed, () => {});

    expect(FakeRequest.last.method).toBe("POST");
    expect(FakeRequest.last.url).toBe("https://api.cloudinary.com/v1_1/demo/video/upload");
    expect((FakeRequest.last.body as FormData).get("signature")).toBe("abc");
  });

  it("donne la progression en pourcentage, puis l'identifiant reçu quand l'envoi réussit", async () => {
    const progress: number[] = [];
    const sent = sendVideoToCloudinary(file, signed, (percent) => progress.push(percent));
    FakeRequest.last.upload.onprogress?.({ lengthComputable: true, loaded: 25, total: 100 });
    FakeRequest.last.upload.onprogress?.({ lengthComputable: false, loaded: 0, total: 0 });
    FakeRequest.last.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
    FakeRequest.last.status = 200;
    FakeRequest.last.responseText = JSON.stringify({ public_id: "dropzone/variants/v12-ab12cd" });
    FakeRequest.last.onload?.();

    await expect(sent).resolves.toBe("dropzone/variants/v12-ab12cd");
    expect(progress).toEqual([25, 100]);
  });

  it("refuse avec le message de Cloudinary quand il rejette l'envoi", async () => {
    const sent = sendVideoToCloudinary(file, signed, () => {});
    FakeRequest.last.status = 400;
    FakeRequest.last.responseText = JSON.stringify({ error: { message: "Invalid Signature" } });
    FakeRequest.last.onload?.();

    await expect(sent).rejects.toThrow("Invalid Signature");
  });

  it("refuse quand la réponse n'est pas lisible", async () => {
    const sent = sendVideoToCloudinary(file, signed, () => {});
    FakeRequest.last.status = 502;
    FakeRequest.last.responseText = "<html>";
    FakeRequest.last.onload?.();

    await expect(sent).rejects.toThrow("illisible");
  });

  it("refuse quand la connexion échoue", async () => {
    const sent = sendVideoToCloudinary(file, signed, () => {});
    FakeRequest.last.onerror?.();

    await expect(sent).rejects.toThrow("vérifie la connexion");
  });

  it("a un délai maximal, et refuse quand il est dépassé (une connexion bloquée ne fige plus le panneau)", async () => {
    const sent = sendVideoToCloudinary(file, signed, () => {});

    expect(FakeRequest.last.timeout).toBeGreaterThan(0);
    FakeRequest.last.ontimeout?.();
    await expect(sent).rejects.toThrow("trop long");
  });

  it("s'arrête quand le gérant annule, et refuse avec « Envoi annulé »", async () => {
    const controller = new AbortController();
    const sent = sendVideoToCloudinary(file, signed, () => {}, controller.signal);

    controller.abort();

    expect(FakeRequest.last.aborted).toBe(true);
    await expect(sent).rejects.toThrow("Envoi annulé");
  });

  it("n'envoie rien si l'annulation est déjà demandée", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(sendVideoToCloudinary(file, signed, () => {}, controller.signal)).rejects.toThrow("Envoi annulé");
  });
});
