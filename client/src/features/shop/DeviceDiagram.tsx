import type { ReactNode } from "react";
import type { Zone } from "./diagramZones";

// La « radiographie » d'un reconditionné : un dessin de l'appareil, en bleu les pièces
// changées, un point rouge à l'endroit de chaque défaut. Décoratif pour un lecteur
// d'écran (aria-hidden) : la légende en texte, à côté, porte l'information.
// Les couleurs viennent des variables du thème : justes en clair et en sombre.

type Kind = "phone" | "tablet" | "laptop" | "watch";

// La forme d'une zone (null : rien à dessiner, seulement un point pour un défaut) et
// l'endroit où poser la pastille rouge d'un défaut.
type Shape =
  | { type: "rect"; x: number; y: number; w: number; h: number; r: number; dashed?: boolean }
  | { type: "circle"; cx: number; cy: number; r: number }
  | null;
type ZoneShape = { shape: Shape; dot: [number, number] };

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

const rect = (x: number, y: number, w: number, h: number, r: number, dashed = false): Shape => ({
  type: "rect",
  x,
  y,
  w,
  h,
  r,
  dashed,
});

// Téléphone : la face à gauche (x 10 à 100), le dos à droite (x 120 à 210).
// Dans l'ordre du dessin : les grandes zones d'abord, les petites par-dessus.
const PHONE: [Zone, ZoneShape][] = [
  ["screen", { shape: rect(16, 16, 78, 168, 9), dot: [55, 110] }],
  ["speaker", { shape: rect(45, 11, 20, 3, 1.5), dot: [55, 12] }],
  ["frontCamera", { shape: { type: "circle", cx: 55, cy: 26, r: 4 }, dot: [55, 26] }],
  ["port", { shape: rect(47, 187, 16, 4, 2), dot: [55, 189] }],
  ["frame", { shape: null, dot: [100, 70] }],
  ["corners", { shape: null, dot: [16, 186] }],
  ["back", { shape: rect(126, 16, 78, 168, 9), dot: [178, 150] }],
  ["battery", { shape: rect(140, 68, 50, 92, 6, true), dot: [165, 114] }],
  ["rearCamera", { shape: rect(130, 20, 36, 36, 9), dot: [148, 38] }],
];

// Tablette : les mêmes pièces que le téléphone, en proportions de tablette (3:4) ;
// la face à gauche (x 6 à 104), le dos à droite (x 116 à 214).
const TABLET: [Zone, ZoneShape][] = [
  ["screen", { shape: rect(12, 41, 86, 118, 4), dot: [55, 100] }],
  ["speaker", { shape: rect(7, 92, 2.5, 16, 1.2), dot: [8, 100] }],
  ["frontCamera", { shape: { type: "circle", cx: 55, cy: 37.5, r: 2.5 }, dot: [55, 37.5] }],
  ["port", { shape: rect(47, 162, 16, 3, 1.5), dot: [55, 164] }],
  ["frame", { shape: null, dot: [104, 70] }],
  ["corners", { shape: null, dot: [10, 162] }],
  ["back", { shape: rect(121, 40, 88, 120, 10), dot: [178, 140] }],
  ["battery", { shape: rect(138, 70, 54, 70, 6, true), dot: [165, 105] }],
  ["rearCamera", { shape: rect(124, 43, 20, 20, 6), dot: [134, 53] }],
];

// PC portable ouvert : l'écran (capot) en haut, la base en bas.
const LAPTOP: [Zone, ZoneShape][] = [
  ["lid", { shape: rect(40, 8, 140, 96, 8), dot: [52, 18] }],
  ["screen", { shape: rect(48, 16, 124, 80, 4), dot: [110, 56] }],
  ["keyboard", { shape: rect(42, 116, 136, 34, 4), dot: [110, 133] }],
  ["trackpad", { shape: rect(88, 156, 44, 26, 4), dot: [110, 169] }],
  ["palmRest", { shape: null, dot: [60, 172] }],
  ["battery", { shape: rect(140, 158, 34, 22, 3, true), dot: [157, 169] }],
];

// Montre : la face à gauche (bracelet, boîtier, écran), le dos du boîtier à droite.
const WATCH: [Zone, ZoneShape][] = [
  ["band", { shape: rect(38, 10, 44, 180, 14), dot: [60, 24] }],
  ["case", { shape: rect(26, 52, 68, 96, 20), dot: [92, 100] }],
  ["screen", { shape: rect(34, 60, 52, 80, 14), dot: [60, 100] }],
  ["caseBack", { shape: { type: "circle", cx: 160, cy: 100, r: 40 }, dot: [160, 100] }],
];

const LAYOUTS: Record<Kind, { zones: [Zone, ZoneShape][]; outline: ReactNode }> = {
  phone: {
    zones: PHONE,
    outline: (
      <>
        <rect x={10} y={8} width={90} height={186} rx={16} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
        <rect x={120} y={8} width={90} height={186} rx={16} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
      </>
    ),
  },
  tablet: {
    zones: TABLET,
    outline: (
      <>
        <rect x={6} y={34} width={98} height={132} rx={12} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
        <rect x={116} y={34} width={98} height={132} rx={12} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />
      </>
    ),
  },
  laptop: {
    zones: LAPTOP,
    outline: <path d="M30 108 H190 L210 190 H10 Z" fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />,
  },
  watch: {
    zones: WATCH,
    outline: <circle cx={160} cy={100} r={48} fill="var(--surface)" stroke="var(--ink-muted)" strokeWidth={2} />,
  },
};

export default function DeviceDiagram({ kind, replaced, defects }: { kind: Kind; replaced: Zone[]; defects: Zone[] }) {
  const { zones, outline } = LAYOUTS[kind];
  const dotOf = (zone: Zone) => zones.find(([name]) => name === zone)?.[1].dot;
  return (
    <svg viewBox="0 0 220 200" className="mx-auto h-auto w-full max-w-56" aria-hidden="true" focusable="false">
      {outline}
      {zones.map(([zone, { shape }]) => (
        <g key={zone}>{draw(shape, replaced.includes(zone) ? CHANGED : NORMAL)}</g>
      ))}
      {defects.map((zone) => {
        const dot = dotOf(zone);
        return dot ? (
          <circle key={zone} cx={dot[0]} cy={dot[1]} r={6} fill="var(--red)" stroke="var(--surface)" strokeWidth={2} />
        ) : null;
      })}
    </svg>
  );
}
