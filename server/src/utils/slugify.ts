import { AppError } from "./AppError.js";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Le slug sert dans les URL : un nom sans lettre latine (tout en arabe) donnerait un slug vide.
export function requireSlug(name: string, message: string): string {
  const slug = slugify(name);
  if (!slug) {
    throw new AppError(400, message);
  }
  return slug;
}
