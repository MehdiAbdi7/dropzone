"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { StageDecor, StageItem, boxStyle } from "@/features/home/DeviceStage";
import { clampBox, moveBox, reorder, resizeBox, slotLabel, type Box, type StageDevice } from "@/features/home/stageLayout";
import { errorMessage } from "@/lib/errors";
import { useSaveStageLayoutMutation } from "./adminApi";

type Drag = { slot: string; mode: "move" | "resize"; startX: number; startY: number; start: Box };

// L'éditeur du socle (06/11, idée de Mehdi) : on attrape une photo à la souris ou au doigt
// pour la poser où on veut, la poignée du coin (ou le curseur) change sa taille, et deux
// boutons la mettent devant ou derrière les autres. Rien n'est écrit avant « Enregistrer ».
//
// Pointer Events : le même code pour la souris, le doigt et le stylet. `setPointerCapture`
// garde le glissement sur la photo même si le pointeur sort du cadre ; `touch-none` empêche
// le téléphone de faire défiler la page pendant qu'on glisse. Les distances sont converties
// en % du cadre : la disposition reste juste à toutes les tailles d'écran.
export default function StageEditor({
  stage,
  devices,
  fixed,
}: {
  stage: "hero" | "deal";
  // Les photos du gérant, déplaçables (emplacements nommés et en plus).
  devices: StageDevice[];
  // Les dessins des emplacements vides (bandeau des affaires) : visibles, pas déplaçables.
  fixed: StageDevice[];
}) {
  const frame = useRef<HTMLDivElement>(null);
  const initial = Object.fromEntries(devices.map((device) => [device.slot, device.box]));
  const [boxes, setBoxes] = useState<Record<string, Box>>(initial);
  const [selected, setSelected] = useState<string | null>(devices[0]?.slot ?? null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [save, saveState] = useSaveStageLayoutMutation();
  const [saved, setSaved] = useState(false);
  const changed = JSON.stringify(boxes) !== JSON.stringify(initial);

  const update = (slot: string, box: Box) => {
    setBoxes((current) => ({ ...current, [slot]: box }));
    setSaved(false);
  };

  // Un glissement : la distance parcourue, en % de la largeur et de la hauteur du cadre.
  function onPointerMove(event: PointerEvent) {
    const rect = frame.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const dx = ((event.clientX - drag.startX) / rect.width) * 100;
    const dy = (-(event.clientY - drag.startY) / rect.height) * 100;
    // La poignée du coin : la photo grandit des deux côtés, d'où le double de la distance.
    update(drag.slot, drag.mode === "move" ? moveBox(drag.start, dx, dy) : resizeBox(drag.start, drag.start.w + dx * 2));
  }

  function startDrag(event: PointerEvent, slot: string, mode: Drag["mode"]) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelected(slot);
    setDrag({ slot, mode, startX: event.clientX, startY: event.clientY, start: boxes[slot] });
  }

  // Au clavier : flèches pour déplacer (Maj : plus vite), + et − pour la taille.
  function onKeyDown(event: KeyboardEvent, slot: string) {
    const step = event.shiftKey ? 5 : 1;
    const box = boxes[slot];
    const moves: Record<string, () => Box> = {
      ArrowLeft: () => moveBox(box, -step, 0),
      ArrowRight: () => moveBox(box, step, 0),
      ArrowUp: () => moveBox(box, 0, step),
      ArrowDown: () => moveBox(box, 0, -step),
      "+": () => resizeBox(box, box.w + step),
      "-": () => resizeBox(box, box.w - step),
    };
    if (moves[event.key]) {
      event.preventDefault();
      update(slot, moves[event.key]());
    }
  }

  async function onSave(reset = false) {
    try {
      const slots = devices.map(({ slot }) =>
        reset ? { slot, x: null, y: null, w: null, z: null } : { slot, ...clampBox(boxes[slot]) },
      );
      await save({ stage, slots }).unwrap();
      setSaved(true);
    } catch {
      // Le message s'affiche sous les boutons.
    }
  }

  const current = selected ? boxes[selected] : null;

  return (
    <div className="space-y-3">
      <div
        ref={frame}
        className="stage touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        <StageDecor id={`editor-${stage}`} />
        {fixed.map((device) => (
          <div key={device.slot} className="opacity-40">
            <StageItem device={device} />
          </div>
        ))}
        {devices.map(({ slot, src }) => {
          const box = boxes[slot];
          const active = slot === selected;
          return (
            <button
              key={slot}
              type="button"
              aria-label={`${slotLabel(slot)} : glisser pour déplacer, flèches du clavier, + et − pour la taille`}
              aria-pressed={active}
              className={`stage-item cursor-grab rounded-lg outline-offset-2 [&_img]:pointer-events-none ${
                active ? "outline-2 outline-dashed outline-blue" : "hover:outline-1 hover:outline-dashed hover:outline-white/50"
              } ${drag?.slot === slot ? "cursor-grabbing" : ""}`}
              style={boxStyle(box)}
              onPointerDown={(event) => startDrag(event, slot, "move")}
              onFocus={() => setSelected(slot)}
              onKeyDown={(event) => onKeyDown(event, slot)}
            >
              <StageItem device={{ slot, src, box: { x: 0, y: 0, w: 100, z: 0 } }} />
              {active ? (
                // La poignée du coin : tirer vers la droite agrandit, vers la gauche réduit.
                <span
                  aria-hidden="true"
                  className="absolute -right-2.5 -top-2.5 size-6 cursor-nesw-resize rounded-full border-2 border-white bg-blue shadow"
                  onPointerDown={(event) => startDrag(event, slot, "resize")}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {devices.length === 0 ? (
        <p className="text-sm text-ink-muted">Envoie une photo dans un emplacement pour pouvoir la placer.</p>
      ) : (
        <div className="space-y-3 rounded-xl bg-surface-2 p-3">
          {selected && current ? (
            <>
              <p className="text-sm font-semibold">{slotLabel(selected)}</p>
              <label className="flex items-center gap-3 text-sm">
                <span className="shrink-0">Taille</span>
                <input
                  type="range"
                  min={8}
                  max={80}
                  step={1}
                  value={current.w}
                  className="w-full"
                  onChange={(event) => update(selected, resizeBox(current, Number(event.target.value)))}
                />
                <span className="w-12 text-right tabular-nums">{Math.round(current.w)} %</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setBoxes(reorder(boxes, selected, "front"))}>
                  Mettre devant
                </button>
                <button type="button" className="btn btn-secondary btn-small" onClick={() => setBoxes(reorder(boxes, selected, "back"))}>
                  Mettre derrière
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Touche une photo pour la choisir.</p>
          )}
          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <button
              type="button"
              className="btn btn-primary btn-small"
              disabled={!changed || saveState.isLoading}
              onClick={() => onSave()}
            >
              {saveState.isLoading ? "Enregistrement…" : "Enregistrer la disposition"}
            </button>
            <button type="button" className="btn btn-outline btn-small" disabled={!changed} onClick={() => setBoxes(initial)}>
              Annuler les changements
            </button>
            <button type="button" className="btn btn-outline btn-small" disabled={saveState.isLoading} onClick={() => onSave(true)}>
              Tout remettre au départ
            </button>
            {saved && !changed ? (
              <span role="status" className="text-sm font-semibold text-blue-ink">
                Enregistré, visible sur l&apos;accueil.
              </span>
            ) : null}
          </div>
          {saveState.error ? <p className="field-error">{errorMessage(saveState.error)}</p> : null}
        </div>
      )}
    </div>
  );
}
