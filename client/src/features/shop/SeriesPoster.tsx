import type { SeriesPoster as Poster } from "@/types/api";
import PosterColumn from "./PosterColumn";
import PosterSlider from "./PosterSlider";
import { glowColor, posterLayout } from "./series";

// L'affiche d'une série : un bloc toujours sombre, comme une affiche de lancement, avec
// une colonne par modèle (à glisser sur téléphone, voir PosterSlider).
export default function SeriesPoster({ poster }: { poster: Poster }) {
  const first = poster.models[0];
  const last = poster.models[poster.models.length - 1];
  const count = poster.models.length;

  return (
    <section aria-labelledby="poster-title" className="brand-dark poster">
      <div
        aria-hidden="true"
        className="poster-backdrop"
        style={{
          background: `radial-gradient(60% 80% at 0% 55%, ${glowColor(first.posterColor)}, transparent 70%), radial-gradient(60% 80% at 100% 55%, ${glowColor(last.posterColor)}, transparent 70%)`,
        }}
      />
      <header className="relative space-y-2 px-4 pt-8 text-center">
        <p className="text-gradient text-xs font-extrabold tracking-[0.32em]">DROPZONE</p>
        <h1 id="poster-title" className="poster-title text-4xl md:text-6xl">
          {poster.name}
        </h1>
        <p className="text-xs tracking-[0.28em] text-white/70 uppercase">
          La série · {count} modèle{count > 1 ? "s" : ""}
        </p>
      </header>
      <div className="relative pt-6 pb-8">
        <PosterSlider names={poster.models.map((model) => model.name)} layout={posterLayout(count)}>
          {poster.models.map((model, index) => (
            <PosterColumn key={model.productSlug} model={model} priority={index === 0} />
          ))}
        </PosterSlider>
      </div>
    </section>
  );
}
