// La taille d'écran d'un téléphone, d'après la caractéristique « Écran » de sa fiche
// (« 6,71 pouces OLED… ») : le premier nombre, arrondi au dixième, écrit « 6,7 pouces ».
// C'est la valeur de l'option « Taille de l'écran » des verres incassables (12/11).
export function screenSize(spec: string | undefined): string | null {
  const match = spec?.match(/(\d+)(?:[.,](\d+))?/);
  if (!match) {
    return null;
  }
  const inches = Math.round(Number(`${match[1]}.${match[2] ?? "0"}`) * 10) / 10;
  return `${inches.toFixed(1).replace(".", ",")} pouces`;
}
