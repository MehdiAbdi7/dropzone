"use client";

import Image from "next/image";
import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { type Palette, swatchOf } from "@/config/colors";
import type { ProductDetail } from "@/types/api";
import {
  alternatives,
  availabilityLines,
  isAvailable,
  requestedVariant,
  startView,
  type ViewerParams,
  viewerColors,
  viewerSearch,
  wrapIndex,
} from "./colorViewerRules";
import { kindIcon } from "./colors";
import type { JourneyCondition } from "./journey";
import { uniformPhoto } from "./photos";
import { colorVariants, variantChoiceLabel } from "./variantChoice";
import { mediaSummary, shownMedia } from "./variantMediaRules";
import VariantMediaStrip from "./VariantMediaStrip";
import ViewerOffers from "./ViewerOffers";

// La visionneuse de couleurs (25/11, demande de Mehdi) : l'étape Couleur n'est pas qu'une étape d'achat,
// c'est une référence. Un grand téléphone qui change de couleur en fondu, le nom de la couleur toujours
// visible, des pastilles, et dessous la disponibilité : une information, jamais un blocage. Toutes les
// couleurs du modèle sont montrées ; une couleur indisponible est seulement un peu assombrie.
// `condition` connu (étape 6 du parcours) : le stock de cet état. `null` (page de référence, avant
// d'avoir choisi Neuf ou Occasion) : les deux états côte à côte.
// La logique (couleurs, texte, indices) est dans colorViewerRules.ts ; ici, le geste et le fondu.
// Deux modes à droite du téléphone (25/11, demande de Mehdi) : « couleurs » (nom, pastilles, disponibilité) et
// « offres » (le choix d'achat de la couleur, voir ViewerOffers). Le téléphone ne bouge pas de l'un à l'autre.

const SWIPE = 40;

type Layer = { src: string; alt: string; dim: boolean };

export default function ColorViewer({
  product,
  condition,
  palette,
  params,
}: {
  product: ProductDetail;
  condition: JourneyCondition | null;
  palette: Palette;
  params: ViewerParams;
}) {
  const colors = useMemo(() => viewerColors(product), [product]);
  const photoOf = (index: number) => {
    const photo = colors[index]?.photoUrl;
    return photo ? uniformPhoto(photo, "color") : kindIcon(product.category.kind);
  };
  // Une couleur indisponible est assombrie ; une icône de secours (couleur sans photo) ne l'est pas.
  const layerOf = (index: number): Layer => {
    const one = colors[index];
    return {
      src: photoOf(index),
      alt: `${product.name}, ${one?.name ?? ""}`,
      dim: Boolean(one?.photoUrl) && !isAvailable(one, condition),
    };
  };

  // Où l'on démarre : une couleur à regarder, ou les offres d'une couleur si l'adresse le demande.
  const [start] = useState(() => startView(product, colors, condition, params));
  const [index, setIndex] = useState(start.index);
  // L'état dont on voit les offres ; null = le mode couleurs.
  const [offers, setOffers] = useState<JourneyCondition | null>(start.offers);
  // La variante dont les photos et la vidéo sont montrées sous le téléphone (26/11) : celle choisie dans les offres, ou
  // celle d'un lien de story (`?variante=`). Aucune au mode couleurs : les médias suivent la variante, jamais la couleur.
  const [shownSku, setShownSku] = useState<string | null>(() => requestedVariant(product, colors, condition, params));
  // La variante choisie dans la liste de l'écran de la couleur (null : la première). Un choix d'une autre couleur est ignoré.
  const [picked, setPicked] = useState<string | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Deux couches pour le fondu : la nouvelle photo se charge dans la couche cachée, puis passe devant.
  const [layers, setLayers] = useState<[Layer, Layer]>(() => [layerOf(start.index), layerOf(0)]);
  const [front, setFront] = useState<0 | 1>(0);
  const [waiting, setWaiting] = useState<0 | 1 | null>(null);
  const frontRef = useRef<0 | 1>(0);
  // La photo que porte chaque couche, et le numéro du dernier changement demandé (un passage devant
  // programmé pour un changement dépassé par un clic plus récent est annulé).
  const srcs = useRef<[string, string]>([layers[0].src, layers[1].src]);
  const change = useRef(0);
  // Le changement en attente de chargement : un chargement périmé (clics rapides) est ignoré.
  const pending = useRef<{ layer: 0 | 1; src: string } | null>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const layerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragStart = useRef<number | null>(null);

  // Précharger toutes les photos : le premier fondu ne doit pas attendre une image.
  useEffect(() => {
    colors.forEach((_, i) => {
      const image = new window.Image();
      image.src = photoOf(i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors]);

  // La photo demandée passe devant, l'ancienne s'efface.
  function flip(layer: 0 | 1) {
    // Lire la géométrie de la couche force le navigateur à calculer son style de départ (`data-wait`, le
    // décalage du côté du geste) avant qu'elle ne passe devant : sans cela, en production, une photo déjà
    // en cache pouvait partir de la position de sortie et arriver du mauvais côté.
    layerRefs.current[layer]?.getBoundingClientRect();
    pending.current = null;
    frontRef.current = layer;
    setFront(layer);
    setWaiting(null);
  }

  function show(next: number, dir: 1 | -1) {
    const target = wrapIndex(colors.length, next, 0);
    const layer = (1 - frontRef.current) as 0 | 1;
    const incoming = layerOf(target);
    const mine = ++change.current;
    // La couche cachée a déjà cette photo (retour à la couleur d'avant) : le navigateur ne lance alors
    // aucun nouveau chargement, donc aucun événement `onLoad` à attendre. Elle passe devant d'elle-même,
    // après un court délai, pour que son décalage de départ (`data-wait`) soit posé avant le fondu. Un
    // délai et non `requestAnimationFrame` : celui-ci s'arrête quand la page n'est pas au premier plan.
    const alreadyThere = srcs.current[layer] === incoming.src && pending.current?.layer !== layer;
    srcs.current[layer] = incoming.src;
    pending.current = alreadyThere ? null : { layer, src: new URL(incoming.src, window.location.href).href };
    setDirection(dir);
    setIndex(target);
    setWaiting(layer);
    setLayers((prev) => (layer === 0 ? [incoming, prev[1]] : [prev[0], incoming]));
    if (alreadyThere) {
      window.setTimeout(() => {
        if (change.current === mine) flip(layer);
      }, 40);
    }
    // La couleur affichée est dans l'adresse (lien à partager, « précédent »), sans empiler d'historique.
    writeAddress(colors[target].name, null);
  }

  // L'adresse suit l'affichage (couleur regardée, ou offres ouvertes), sans empiler d'historique.
  function writeAddress(name: string, shown: JourneyCondition | null) {
    const url = new URL(window.location.href);
    url.search = viewerSearch(url.search.slice(1), name, shown, condition);
    window.history.replaceState(null, "", url);
  }

  function openOffers(one: JourneyCondition) {
    // Le choix fait sur l'écran de la couleur est repris dans les offres, s'il est de cet état (sinon le choix y repart de zéro).
    const choices = colorVariants(product, colors[index].name, condition);
    const preview = choices.find((variant) => variant.sku === picked) ?? choices[0];
    setShownSku(preview && preview.condition === one ? preview.sku : null);
    setOffers(one);
    writeAddress(colors[index].name, one);
  }

  // Retour aux couleurs : le focus va sur la pastille de la couleur, le bouton qu'on vient de cliquer disparaît.
  function closeOffers() {
    setShownSku(null);
    setOffers(null);
    writeAddress(colors[index].name, null);
    window.setTimeout(() => dotRefs.current[index]?.focus(), 0);
  }

  function go(delta: number) {
    // En mode offres le téléphone est figé : changer de couleur passe par « Changer de couleur ».
    if (offers === null && colors.length > 1) {
      show(wrapIndex(colors.length, index, delta), delta > 0 ? 1 : -1);
    }
  }

  function pick(target: number) {
    if (target !== index) {
      show(target, target > index ? 1 : -1);
    }
  }

  // La photo demandée est arrivée : un chargement périmé (clics rapides) est ignoré.
  function loaded(layer: 0 | 1, element: HTMLImageElement) {
    const wanted = pending.current;
    if (wanted && wanted.layer === layer && element.src === wanted.src) {
      flip(layer);
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
  // `pointercancel` : un défilement vertical commencé sur la photo (`touch-action: pan-y`) envoie
  // `pointercancel` et jamais `pointerup`. Sans l'effacer, le départ restait mémorisé et un toucher
  // ailleurs, plus tard, changeait de couleur (et le bouton « Voir les offres » menait à une autre).
  useEffect(() => {
    function onUp(event: PointerEvent) {
      if (dragStart.current === null) return;
      const dx = event.clientX - dragStart.current;
      dragStart.current = null;
      if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
    }
    function onCancel() {
      dragStart.current = null;
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, colors.length, offers]);

  if (colors.length === 0) {
    return null;
  }

  const color = colors[index];
  const swatch = (name: string) => swatchOf(name, palette) ?? "#888888";
  const lines = availabilityLines(product.slug, color, condition);
  const others = alternatives(colors, condition, index);
  const unavailable = !isAvailable(color, condition);
  const single = condition !== null;
  // Les variantes en stock de cette couleur (27/11, remarque de Mehdi). Une seule : ses photos et sa vidéo s'affichent tout de
  // suite sous le téléphone. Deux ou plus : une liste déroulante pour choisir (la moins chère est choisie au départ), et les
  // médias suivent le choix. Les offres ouvertes, c'est leur propre choix qui compte (`shownSku`).
  const choices = colorVariants(product, color.name, condition);
  const previewVariant = choices.find((variant) => variant.sku === picked) ?? choices[0];
  const previewSku = previewVariant?.sku ?? null;
  const previewSummary = mediaSummary(previewVariant?.media);
  const mediaSku = offers !== null ? shownSku : previewSku;

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
          role="group"
          aria-roledescription="carrousel"
          aria-label="Photo du téléphone, flèches gauche et droite pour changer de couleur"
          onKeyDown={onFrameKey}
          onPointerDown={(event) => {
            // Un toucher sur une flèche n'est pas le début d'un glissement (on avançait de deux couleurs).
            dragStart.current = (event.target as HTMLElement).closest(".viewer-arrow") ? null : event.clientX;
          }}
        >
          <div className="viewer-glow" style={{ backgroundColor: swatch(color.name) }} data-dim={unavailable ? "" : undefined} />
          {([0, 1] as const).map((layer) => (
            <div
              key={layer}
              ref={(element) => {
                layerRefs.current[layer] = element;
              }}
              className="viewer-layer"
              data-front={front === layer ? "" : undefined}
              data-wait={waiting === layer ? "" : undefined}
              data-dim={layers[layer].dim ? "" : undefined}
              aria-hidden={front === layer ? undefined : true}
            >
              {/* `key` = l'adresse de la photo : chaque photo a son propre élément. `next/image` ignore un
                  `load` quand l'élément retrouve l'adresse qu'il avait déjà chargée (revenir à la couleur
                  d'avant pendant un chargement) : la photo ne passait jamais devant, le nom changeait mais
                  pas le téléphone. Un élément neuf appelle toujours `onLoad`, même depuis le cache. */}
              <Image
                key={layers[layer].src}
                src={layers[layer].src}
                alt={front === layer ? layers[layer].alt : ""}
                fill
                unoptimized
                loading="eager"
                draggable={false}
                sizes="(min-width: 768px) 340px, 90vw"
                onLoad={(event) => loaded(layer, event.currentTarget)}
                onError={(event) => loaded(layer, event.currentTarget)}
              />
            </div>
          ))}
          {colors.length > 1 && offers === null ? (
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

        {/* Sous le téléphone : les photos et la vidéo de la variante choisie (rien sans variante choisie ni sans médias). */}
        <VariantMediaStrip media={shownMedia(product.variants, mediaSku)} label={`${product.name}, ${color.name}`} />

        <div className="viewer-info">
          {offers ? (
            // `key` : changer de couleur ou d'état repart d'un choix neuf (stockage, tri).
            <ViewerOffers
              key={`${color.name}-${offers}`}
              product={product}
              colorName={color.name}
              condition={offers}
              palette={palette}
              shownSku={shownSku}
              onShow={(variant) => setShownSku(variant.sku)}
              onBack={closeOffers}
            />
          ) : (
            <>
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

              {choices.length >= 2 ? (
                <label className="viewer-pick">
                  <span className="viewer-pick-label">Choisis la variante ({choices.length} disponibles)</span>
                  <select className="input" value={previewSku ?? ""} onChange={(event) => setPicked(event.target.value)}>
                    {choices.map((variant) => (
                      <option key={variant.sku} value={variant.sku}>
                        {variantChoiceLabel(variant, condition === null)}
                      </option>
                    ))}
                  </select>
                  <span className="viewer-pick-note">
                    {previewSummary ? `Photos et vidéo sous le téléphone : ${previewSummary}.` : "Pas de photo ni de vidéo pour cette variante."}
                  </span>
                </label>
              ) : null}

              <div className="viewer-avail">
                {single ? (
                  <>
                    {lines[0].available ? (
                      <>
                        <span className="viewer-badge" data-ok="">
                          Disponible en {lines[0].label.toLowerCase()}
                        </span>
                        <p className="viewer-text">{lines[0].text}</p>
                        <button type="button" className="viewer-cta" onClick={() => openOffers(lines[0].condition)}>
                          Voir les offres en {color.name} →
                        </button>
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
                        {line.available ? (
                          <button type="button" className="viewer-cta" onClick={() => openOffers(line.condition)}>
                            Voir les offres →
                          </button>
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
                        {/* Ce bouton disparaît dès qu'on choisit : le focus va sur la pastille de la couleur choisie. */}
                        <button
                          type="button"
                          onClick={() => {
                            pick(other.index);
                            dotRefs.current[other.index]?.focus();
                          }}
                        >
                          {other.name}
                        </button>
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
              {/* Ordinateur seulement : remplit la colonne de droite. Sur téléphone, la même phrase est sous le conteneur (ProductFacts). */}
              <p className="viewer-desc">{product.description}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
