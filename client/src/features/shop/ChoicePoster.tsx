import { CONDITION_LABELS } from "@/config/catalog";
import type { Palette } from "@/config/colors";
import ChoiceColumn from "./ChoiceColumn";
import type { ChoiceColumnData } from "./choiceColumns";
import PosterSlider from "./PosterSlider";
import { glowColor, posterLayout } from "./series";

// L'affiche de choix (05/11) : l'étape Couleur, puis Neuf scellé / Affaire, au style de
// l'affiche de la série (SeriesPoster) : bloc toujours sombre, colonnes à glisser sur
// téléphone ou au-delà de 4 colonnes.
export default function ChoicePoster({
  kicker,
  title,
  columns,
  palette,
}: {
  kicker: string;
  title: string;
  columns: ChoiceColumnData[];
  palette: Palette;
}) {
  const first = columns[0];
  const last = columns[columns.length - 1];
  return (
    <section
      aria-labelledby="choice-title"
      className="brand-dark poster"
    >
      <div
        aria-hidden="true"
        className="poster-backdrop"
        style={{
          background: `radial-gradient(60% 80% at 0% 55%, ${glowColor(first?.glow ?? null, palette)}, transparent 70%), radial-gradient(60% 80% at 100% 55%, ${glowColor(last?.glow ?? null, palette)}, transparent 70%)`,
        }}
      />
      {/* Tout voir d'un coup (25/11) : les marges et le titre suivent la hauteur de l'écran (series-posters.css). */}
      <header className="poster-header relative px-4 text-center">
        <p className="text-gradient text-xs font-extrabold tracking-[0.32em]">
          {kicker}
        </p>
        <h1 id="choice-title" className="poster-title poster-headline">
          {title}
        </h1>
      </header>
      <div className="poster-body relative">
        {/* Les onglets du glissement : le nom court (« Neuf scellé », « Affaire »), pas le sous-titre. */}
        <PosterSlider
          names={columns.map((column) =>
            column.badge
              ? CONDITION_LABELS[column.badge === "new" ? "new" : "refurbished"]
              : column.title,
          )}
          unavailable={columns.map((column) => column.href === null)}
          layout={posterLayout(columns.length)}
        >
          {columns.map((column, index) => (
            <ChoiceColumn
              key={column.key}
              column={column}
              palette={palette}
              priority={index === 0}
            />
          ))}
        </PosterSlider>
      </div>
    </section>
  );
}
