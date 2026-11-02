import { z } from "zod";

// Les messages d'erreur de Zod en français (« Trop petit : 2 caractères attendus »),
// pour toutes les validations de l'API. Importé une fois, au début de app.ts.
z.config(z.locales.fr());
