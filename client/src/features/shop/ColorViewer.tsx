"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { type Palette, swatchOf } from "@/config/colors";
import type { ProductDetail } from "@/types/api";
import { alternatives, availabilityLines, firstIndex, isAvailable, viewerColors, wrapIndex } from "./colorViewer";
import { kindIcon } from "./colors";
import type { JourneyCondition } from "./journey";
import { uniformPhoto } from "./photos";

// La visionneuse de couleurs (25/11, demande de Mehdi) : l'étape Couleur n'est pas qu'une étape d'achat,
// c'est une référence. Un grand téléphone qui change de couleur en fondu, le nom de la couleur toujours
// visible, des pastilles, et dessous la disponibilité : une information, jamais un blocage. Toutes les
// couleurs du modèle sont montrées ; une couleur indisponible est seulement un peu assombrie.
// `condition` connu (étape 6 du parcours) : le stock de cet état. `null` (page de référence, avant
// d'avoir choisi Neuf ou Occasion) : les deux états côte à côte.
// La logique (couleurs, texte, indices) est dans colorViewer.ts ; ici, le geste et le fondu.

const SWIPE = 40;

type Layer = { src: string; alt: string; dim: boolean };

export default function ColorViewer({
  product,
  condition,
  palette,
  preview,
}: {
  product: ProductDetail;
  condition: JourneyCondition | null;
  palette: Palette;
  preview: string | string[] | undefined;
}) {
  const colors = useMemo(() => viewerColors(product), [product]);
  const photoOf = (index: number) => {
    const photo = colors[index]?.photoUrl;
    return photo ? uniformPhoto(photo, "portrait") : kindIcon(product.category.kind);
  };
  const layerOf = (index: number): Layer => ({
    src: photoOf(index),
    alt: `${product.name}, ${colors[index]?.name ?? ""}`,
    dim: !isAvailable(colors[index], condition),
  });

  const [index, setIndex] = useState(() => firstIndex(colors, condition, preview));
  const [direction, setDirection] = useState<1 | -1>(1);
  // Deux couches pour le fondu : la nouvelle photo se charge dans la couche cachée, puis passe devant.
  const [layers, setLayers] = useState<[Layer, Layer]>(() => [layerOf(firstIndex(colors, condition, preview)), layerOf(0)]);
  const [front, setFront] = useState<0 | 1>(0);
  const [waiting, setWaiting] = useState<0 | 1 | null>(null);
  const frontRef = useRef<0 | 1>(0);
  // Le changement en attente de chargement : un chargement périmé (clics rapides) est ignoré.
  const pending = useRef<{ layer: 0 | 1; src: string } | null>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const dragStart = useRef<number | null>(null);

  // Précharger toutes les photos : le premier fondu ne doit pas attendre une image.
  useEffect(() => {
    colors.forEach((_, i) => {
      const image = new window.Image();
      image.src = photoOf(i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  function show(next: number, dir: 1 | -1) {
    const target = wrapIndex(colors.length, next, 0);
    const layer = (1 - frontRef.current) as 0 | 1;
    const incoming = layerOf(target);
    pending.current = { layer, src: new URL(incoming.src, window.location.href).href };
    setDirection(dir);
    setIndex(target);
    setWaiting(layer);
    setLayers((prev) => (layer === 0 ? [incoming, prev[1]] : [prev[0], incoming]));
    // La couleur affichée est dans l'adresse (lien à partager, « précédent »), sans empiler d'historique.
    const url = new URL(window.location.href);
    url.searchParams.set("apercu", colors[target].name);
    window.history.replaceState(null, "", url);
  }

  function go(delta: number) {
    if (colors.length > 1) {
      show(wrapIndex(colors.length, index, delta), delta > 0 ? 1 : -1);
    }
  }

  function pick(target: number) {
    if (target !== index) {
      show(target, target > index ? 1 : -1);
    }
  }

  // La photo demandée est arrivée : elle passe devant, l'ancienne s'efface.
  function loaded(layer: 0 | 1, element: HTMLImageElement) {
    const wanted = pending.current;
    if (wanted && wanted.layer === layer && element.src === wanted.src) {
      pending.current = null;
      frontRef.current = layer;
      setFront(layer);
      setWaiting(null);
    }
  }

  function onFrameKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") go(-1);
    if (event.key === "ArrowRight") go(1);
  }

  function onDotsKey(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = wrapIndex(colors.length, index, event.key === "ArrowRight" ? 1 : -1);
    pick(next);
    dotRefs.current[next]?.focus();
  }

  // Glisser (doigt ou souris) : plus de 40 px d'écart change de couleur. L'écouteur est sur la fenêtre :
  // le geste peut finir hors du cadre.
  useEffect(() => {
    function onUp(event: PointerEvent) {
      if (dragStart.current === null) return;
      const dx = event.clientX - dragStart.current;
      dragStart.current = null;
      if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
    }
    window.addEventListener("pointerup", onUp);
    return () => window.removeEventListener("pointerup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, colors.length]);

  if (colors.length === 0) {
    return null;
  }

  const color = colors[index];
  const swatch = (name: string) => swatchOf(name, palette) ?? "#888888";
  const lines = availabilityLines(product.slug, color, condition);
  const others = alternatives(colors, condition, index);
  const unavailable = !isAvailable(color, condition);
  const single = condition !== null;

  return (
    <section
      className="viewer brand-dark"
      aria-label={`Couleurs du ${product.name}`}
      style={{ "--viewer-dir": direction } as CSSProperties}
    >
      <p className="text-gradient viewer-brand">DropZone</p>
      <h1 className="poster-title viewer-title">{product.name}</h1>
      <p className="viewer-sub">TOUTES LES COULEURS · {colors.length}</p>

      <div className="viewer-cols">
        <div
          className="viewer-frame"
          tabIndex={0}
          aria-roledescription="carrousel"
          aria-label="Photo du téléphone, flèches gauche et droite pour changer de couleur"
          onKeyDown={onFrameKey}
          onPointerDown={(event) => {
            if (!(event.target as HTMLElement).closest(".viewer-arrow")) dragStart.current = event.clientX;
          }}
        >
          <div className="viewer-glow" style={{ backgroundColor: swatch(color.name) }} data-dim={unavailable ? "" : undefined} />
          {([0, 1] as const).map((layer) => (
            <div
              key={layer}
              className="viewer-layer"
              data-front={front === layer ? "" : undefined}
              data-wait={waiting === layer ? "" : undefined}
              data-dim={layers[layer].dim ? "" : undefined}
              aria-hidden={front === layer ? undefined : true}
            >
              <Image
                src={layers[layer].src}
                alt={front === layer ? layers[layer].alt : ""}
                fill
                unoptimized
                draggable={false}
                sizes="(min-width: 768px) 340px, 90vw"
                onLoad={(event) => loaded(layer, event.currentTarget)}
                onError={(event) => loaded(layer, event.currentTarget)}
              />
            </div>
          ))}
          {colors.length > 1 ? (
            <>
              <button type="button" className="viewer-arrow" data-side="left" aria-label="Couleur précédente" onClick={() => go(-1)}>
                ‹
              </button>
              <button type="button" className="viewer-arrow" data-side="right" aria-label="Couleur suivante" onClick={() => go(1)}>
                ›
              </button>
            </>
          ) : null}
        </div>

        <div className="viewer-info">
          <p className="viewer-name" aria-live="polite">
            {color.name}
          </p>
          <p className="viewer-count">
            {index + 1} / {colors.length}
          </p>
          <div className="viewer-dots" role="radiogroup" aria-label="Couleur" onKeyDown={onDotsKey}>
            {colors.map((one, i) => {
              const off = !isAvailable(one, condition);
              return (
                <button
                  key={one.name}
                  ref={(element) => {
                    dotRefs.current[i] = element;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={i === index}
                  aria-label={`${one.name}${off ? ", indisponible" : ""}`}
                  title={one.name}
                  tabIndex={i === index ? 0 : -1}
                  data-dim={off ? "" : undefined}
                  className="viewer-dot"
                  style={{ backgroundColor: swatch(one.name) }}
                  onClick={() => pick(i)}
                />
              );
            })}
          </div>

          <div className="viewer-avail">
            {single ? (
              <>
                {lines[0].available ? (
                  <>
                    <span className="viewer-badge" data-ok="">
                      Disponible en {lines[0].label.toLowerCase()}
                    </span>
                    <p className="viewer-text">{lines[0].text}</p>
                    {lines[0].href ? (
                      <Link href={lines[0].href} className="viewer-cta">
                        Voir les offres en {color.name} →
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <span className="viewer-badge">Pas disponible pour le moment</span>
                )}
              </>
            ) : (
              <div className="viewer-lines">
                {lines.map((line) => (
                  <div key={line.condition} className="viewer-line">
                    <span className="viewer-line-label">{line.label}</span>
                    <span className="viewer-badge" data-ok={line.available ? "" : undefined}>
                      {line.available ? "Disponible" : "Pas disponible pour le moment"}
                    </span>
                    {line.available ? <p className="viewer-text">{line.text}</p> : null}
                    {line.href ? (
                      <Link href={line.href} className="viewer-cta">
                        Voir les offres →
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
            {unavailable && others.length > 0 ? (
              <p className="viewer-hint">
                Disponibles{single ? ` en ${lines[0].label.toLowerCase()}` : ""} :{" "}
                {others.map((other, i) => (
                  <span key={other.name}>
                    {i > 0 ? " · " : ""}
                    <button type="button" onClick={() => pick(other.index)}>
                      {other.name}
                    </button>
                  </span>
                ))}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
