import type { SlipRows } from "./slipRows";

// L'image du bon de commande (lot 6) : dessinée sur un <canvas>, sans bibliothèque. Sur téléphone,
// `window.print()` est peu fiable (navigateurs intégrés, iPhone) : le client enregistre une image, qu'il
// peut aussi partager ou garder dans sa galerie. Le texte vient de `slipRows` (testé) ; ici, seulement la
// mise en page : une colonne, le prix toujours à droite, des lignes qui passent à la ligne.
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const WIDTH = 900;
const PAD = 48;
const INNER = WIDTH - 2 * PAD;
const PRICE_COLUMN = 230;
const SCALE = 2; // une image nette sur un écran de téléphone

const INK = "#000000";
const GREY = "#4b5563";
const LINE = "#d4d4d4";

type Ctx = CanvasRenderingContext2D;

// Coupe un texte en lignes qui tiennent dans `maxWidth`, aux espaces.
function wrap(ctx: Ctx, text: string, font: string, maxWidth: number): string[] {
  ctx.font = font;
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Une seule fonction pour mesurer ET dessiner : `draw = false` ne fait que calculer la hauteur, pour créer
// le canvas à la bonne taille avant de dessiner pour de bon.
function paint(ctx: Ctx, rows: SlipRows, draw: boolean): number {
  const text = (value: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left") => {
    if (!draw) return;
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(value, x, y);
  };
  const rule = (y: number) => {
    if (!draw) return;
    ctx.strokeStyle = LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(WIDTH - PAD, y);
    ctx.stroke();
  };

  let y = PAD;
  // L'en-tête : le magasin à gauche, le titre, le numéro et la date à droite.
  text(rows.shop, PAD, y + 40, `800 44px ${FONT}`, INK);
  text(rows.city, PAD, y + 76, `400 26px ${FONT}`, GREY);
  text(rows.title, WIDTH - PAD, y + 30, `800 30px ${FONT}`, INK, "right");
  text(rows.number, WIDTH - PAD, y + 76, `800 38px ${FONT}`, INK, "right");
  text(rows.date, WIDTH - PAD, y + 110, `400 24px ${FONT}`, GREY, "right");
  y += 130;
  rule(y);
  y += 44;

  // Livraison ou retrait.
  for (const line of wrap(ctx, rows.where, `700 30px ${FONT}`, INNER)) {
    text(line, PAD, y, `700 30px ${FONT}`, INK);
    y += 40;
  }
  y += 14;

  // Les articles : le texte à gauche, le prix à droite sur la première ligne.
  for (const item of rows.items) {
    rule(y);
    y += 38;
    const textWidth = INNER - PRICE_COLUMN - 20;
    text(item.price, WIDTH - PAD, y, `700 30px ${FONT}`, INK, "right");
    for (const line of wrap(ctx, item.title, `700 30px ${FONT}`, textWidth)) {
      text(line, PAD, y, `700 30px ${FONT}`, INK);
      y += 40;
    }
    for (const line of wrap(ctx, item.detail, `400 24px ${FONT}`, textWidth)) {
      text(line, PAD, y, `400 24px ${FONT}`, GREY);
      y += 32;
    }
    y += 10;
  }

  // Les totaux.
  rule(y);
  y += 44;
  if (rows.shipping !== null) {
    text("Livraison", PAD, y, `400 28px ${FONT}`, INK);
    text(rows.shipping, WIDTH - PAD, y, `400 28px ${FONT}`, INK, "right");
    y += 44;
  }
  text("Total", PAD, y, `800 38px ${FONT}`, INK);
  text(rows.total, WIDTH - PAD, y, `800 38px ${FONT}`, INK, "right");
  y += 40;
  text(rows.payNote, PAD, y, `400 24px ${FONT}`, GREY);
  y += 40;

  // Ce n'est pas une facture.
  rule(y);
  y += 38;
  for (const line of wrap(ctx, rows.footer, `400 22px ${FONT}`, INNER)) {
    text(line, PAD, y, `400 22px ${FONT}`, GREY);
    y += 30;
  }
  return y + PAD - 14;
}

// Le bon dessiné, prêt à enregistrer.
export function drawSlip(rows: SlipRows): HTMLCanvasElement {
  const probe = document.createElement("canvas").getContext("2d");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!probe || !ctx) throw new Error("Le navigateur ne sait pas dessiner l'image");
  const height = Math.ceil(paint(probe, rows, false));
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  paint(ctx, rows, true);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, WIDTH - 3, height - 3);
  return canvas;
}

// Enregistre l'image : la feuille de partage du téléphone quand elle sait envoyer un fichier (« Enregistrer
// l'image », galerie, messagerie), sinon un téléchargement. Rend l'image en texte pour l'afficher aussi : si
// rien ne démarre (navigateur intégré), le client appuie longuement dessus pour l'enregistrer.
export async function saveSlip(canvas: HTMLCanvasElement, filename: string): Promise<string> {
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return dataUrl;
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return dataUrl;
    } catch (error) {
      // Fermer la feuille de partage n'est pas une erreur ; tout autre échec se rabat sur le téléchargement.
      if (error instanceof Error && error.name === "AbortError") return dataUrl;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return dataUrl;
}
