"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { VariantMedia } from "@/types/api";

// Les photos et la vidéo de la variante choisie, en miniatures sous le téléphone (26/11, demande de Mehdi : la vidéo de
// la story Instagram d'un téléphone, à revoir, et d'autres photos du même exemplaire). Un clic ouvre le média en grand.
// Sans médias, rien n'est rendu.
export default function VariantMediaStrip({ media, label }: { media: VariantMedia[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (media.length === 0) {
    return null;
  }
  return (
    <>
      <ul className="viewer-media" aria-label={`Photos et vidéo : ${label}`}>
        {media.map((item, index) => (
          <li key={item.url}>
            <button
              type="button"
              className="viewer-thumb"
              aria-label={item.kind === "video" ? "Voir la vidéo" : `Agrandir la photo ${index + 1}`}
              onClick={() => setOpen(index)}
            >
              <Image src={item.posterUrl ?? item.url} alt="" fill unoptimized sizes="64px" />
              {item.kind === "video" ? (
                <span className="viewer-thumb-play" aria-hidden="true">
                  ▶
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {open !== null ? <MediaLightbox media={media} start={open} label={label} onClose={() => setOpen(null)} /> : null}
    </>
  );
}

// Le média en grand, avec ‹ › pour passer au suivant. Échap, la croix ou un clic à côté referment.
function MediaLightbox({ media, start, label, onClose }: { media: VariantMedia[]; start: number; label: string; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const closeRef = useRef<HTMLButtonElement>(null);
  const item = media[index];

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + media.length) % media.length);
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % media.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [media.length, onClose]);

  return (
    <div className="media-lightbox" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="media-stage" onClick={(event) => event.stopPropagation()}>
        {/* `key` : changer de média repart d'un lecteur neuf (la vidéo précédente ne continue pas en fond). */}
        {item.kind === "video" ? (
          <StoryVideo key={item.url} item={item} />
        ) : (
          <Image key={item.url} src={item.url} alt={`${label}, photo ${index + 1}`} fill unoptimized sizes="460px" className="object-contain" />
        )}
        {media.length > 1 ? (
          <>
            <button type="button" className="media-nav" data-side="left" aria-label="Média précédent" onClick={() => setIndex((index - 1 + media.length) % media.length)}>
              ‹
            </button>
            <button type="button" className="media-nav" data-side="right" aria-label="Média suivant" onClick={() => setIndex((index + 1) % media.length)}>
              ›
            </button>
          </>
        ) : null}
      </div>
      <button ref={closeRef} type="button" className="media-close" aria-label="Fermer" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

// La vidéo de la story : elle démarre sans le son (comme une story, et les navigateurs l'exigent), en boucle. Le client
// la met en pause et la relance quand il veut (un clic sur la vidéo ou le bouton), et active ou coupe le son (décision de
// Mehdi du 26/11).
function StoryVideo({ item }: { item: VariantMedia }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  function toggle() {
    const element = video.current;
    if (!element) return;
    if (element.paused) {
      void element.play();
    } else {
      element.pause();
    }
  }

  return (
    <div className="story-video">
      <video
        ref={video}
        src={item.url}
        poster={item.posterUrl ?? undefined}
        autoPlay
        loop
        muted={muted}
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onClick={toggle}
      />
      <div className="story-video-bar">
        <button type="button" onClick={toggle} aria-label={playing ? "Mettre la vidéo en pause" : "Relancer la vidéo"}>
          {playing ? "⏸ Pause" : "▶ Lecture"}
        </button>
        <button type="button" aria-pressed={!muted} onClick={() => setMuted((current) => !current)} aria-label={muted ? "Activer le son" : "Couper le son"}>
          {muted ? "Son coupé" : "Son activé"}
        </button>
      </div>
    </div>
  );
}
