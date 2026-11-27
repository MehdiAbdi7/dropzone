import type { MouseEvent, ReactNode } from "react";
import type { DiagramPoint } from "@/types/api";
import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH, DIAGRAM_ZONES, type DiagramKind, type Shape } from "./diagramShapes";
import type { Zone } from "./diagramZones";

// La « radiographie » d'un reconditionné : un dessin de l'appareil, en bleu les pièces
// changées, un point rouge à l'endroit de chaque défaut. Décoratif pour un lecteur
// d'écran (aria-hidden) : la légende en texte, à côté, porte l'information.
// Les couleurs viennent des variables du thème : justes en clair et en sombre.
// La forme de chaque zone est dans diagramShapes.ts.

type Style = { fill: string; fillOpacity?: number; stroke: string; strokeWidth: number };
const NORMAL: Style = { fill: "var(--surface-2)", stroke: "var(--line)", strokeWidth: 1.5 };
// Un bleu franc, mais transparent : la pièce changée se voit d'un coup d'œil.
const CHANGED: Style = { fill: "var(--blue)", fillOpacity: 0.3, stroke: "var(--blue)", strokeWidth: 2.5 };

function draw(shape: Shape, style: Style): ReactNode {
  if (shape?.type === "rect") {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.w}
        height={shape.h}
        rx={shape.r}
        {...style}
        strokeDasharray={shape.dashed ? "4 3" : undefined}
      />
    );
  }
  if (shape?.type === "circle") {
    return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...style} />;
  }
  return null;
}

const OUTLINES: Record<DiagramKind, ReactNode> = {
  phone: (
    <>
      <rect x={10} y={8} width={90} height={186} rx={16} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
      <rect x={120} y={8} width={90} height={186} rx={16} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
    </>
  ),
  tablet: (
    <>
      <rect x={6} y={34} width={98} height={132} rx={12} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
      <rect x={116} y={34} width={98} height={132} rx={12} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
    </>
  ),
  laptop: <path d="M30 108 H190 L210 190 H10 Z" fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />,
  watch: <circle cx={160} cy={100} r={48} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />,
};

// Un dixième près : assez fin pour un clic, et des nombres courts à ranger.
const tenth = (value: number) => Math.round(value * 10) / 10;

export default function DeviceDiagram({
  kind,
  replaced,
  defects,
  replacedDots = [],
  defectDots = [],
  onPick,
  activeDot,
}: {
  kind: DiagramKind;
  replaced: Zone[];
  defects: Zone[];
  // Les points posés à la main (27/11) : un point bleu pour une pièce hors de toute zone, un point rouge pour un défaut.
  replacedDots?: DiagramPoint[];
  defectDots?: DiagramPoint[];
  // Le back-office : le dessin devient cliquable pour placer un point (27/11). Sur la boutique, il reste décoratif.
  onPick?: (point: DiagramPoint) => void;
  // Le point en cours de placement, entouré pour le repérer parmi les autres.
  activeDot?: DiagramPoint;
}) {
  const zones = DIAGRAM_ZONES[kind];
  const dotOf = (zone: Zone) => zones.find(([name]) => name === zone)?.[1].dot;

  // La position du clic dans le repère du dessin : la place sur l'écran, ramenée aux 220 sur 200 du `viewBox`.
  function pick(event: MouseEvent<SVGSVGElement>) {
    if (!onPick) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * DIAGRAM_WIDTH;
    const y = ((event.clientY - box.top) / box.height) * DIAGRAM_HEIGHT;
    onPick({ x: tenth(Math.min(DIAGRAM_WIDTH, Math.max(0, x))), y: tenth(Math.min(DIAGRAM_HEIGHT, Math.max(0, y))) });
  }

  return (
    <svg
      viewBox={`0 0 ${DIAGRAM_WIDTH} ${DIAGRAM_HEIGHT}`}
      className={`mx-auto h-auto w-full max-w-56 ${onPick ? "cursor-crosshair" : ""}`}
      // Décoratif sur la boutique ; cliquable dans le back-office, où il a un nom pour un lecteur d'écran.
      {...(onPick
        ? { role: "img", "aria-label": "Dessin de l'appareil : cliquer pour placer le point", onClick: pick }
        : { "aria-hidden": true })}
      focusable="false"
    >
      {OUTLINES[kind]}
      {zones.map(([zone, { shape }]) => (
        <g key={zone}>{draw(shape, replaced.includes(zone) ? CHANGED : NORMAL)}</g>
      ))}
      {defects.map((zone) => {
        const dot = dotOf(zone);
        return dot ? (
          <circle key={zone} cx={dot[0]} cy={dot[1]} r={6} fill="var(--red)" stroke="var(--surface)" strokeWidth={2} />
        ) : null;
      })}
      {replacedDots.map((dot) => (
        <circle key={`part-${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={6} fill="var(--blue)" stroke="var(--surface)" strokeWidth={2} />
      ))}
      {defectDots.map((dot) => (
        <circle key={`defect-${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={6} fill="var(--red)" stroke="var(--surface)" strokeWidth={2} />
      ))}
      {activeDot ? (
        <circle cx={activeDot.x} cy={activeDot.y} r={10} fill="none" stroke="var(--ink)" strokeWidth={2} strokeDasharray="3 2" />
      ) : null}
    </svg>
  );
}
