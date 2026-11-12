// Les traits de néon, comme sur les bannières de DropZone : rouges à gauche, bleus à droite. Du
// SVG plutôt qu'une image : quelques centaines d'octets, net à toutes les tailles. Le filtre
// `glow` floute une copie du trait et la pose dessous, d'où le halo.
// `id` doit être unique sur la page : c'est le nom du filtre, que chaque dessin référence.

// Les traits, dans le repère 600 × 480 du socle. Les rouges débordent à gauche (x négatifs), les
// bleus à droite (au-delà de 600) : posés derrière le socle, ils sortent du cadre comme sur les
// bannières. Partagés par le socle (NeonLines) et les bords d'une section (NeonSides).
const RED_PATHS = [
  "M-40 70 100 210v110",
  "M-60 190 50 300h110",
  "M40 -20 230 170",
  "M-30 390 90 270",
  "M10 500 150 360h70",
];
const BLUE_PATHS = [
  "M640 70 500 210v110",
  "M660 190 550 300H440",
  "M560 -20 370 170",
  "M650 330a150 150 0 0 0-150 150",
  "M590 500 450 360h-70",
];
const MOBILE_LOWER_RED_PATHS = ["M-55 345 15 415", "M-45 445 25 515"];
const MOBILE_LOWER_BLUE_PATHS = ["M655 345 585 415", "M645 445 575 515"];

function Glow({ id }: { id: string }) {
  return (
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

const STROKE = {
  fill: "none",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Strokes({
  paths,
  color,
  opacity,
  glow,
}: {
  paths: string[];
  color: string;
  opacity: number;
  glow: string;
}) {
  return (
    <g stroke={color} filter={`url(#${glow})`} opacity={opacity}>
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </g>
  );
}

// Derrière le socle (hero, bandeau des affaires) : les deux couleurs dans un seul dessin.
export default function NeonLines({ id }: { id: string }) {
  const glow = `neon-glow-${id}`;
  return (
    <svg
      viewBox="0 0 600 480"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      {...STROKE}
      aria-hidden="true"
    >
      <Glow id={glow} />
      <Strokes paths={RED_PATHS} color="#ff2e4d" opacity={0.75} glow={glow} />
      <Strokes paths={BLUE_PATHS} color="#3d4bff" opacity={0.85} glow={glow} />
    </svg>
  );
}

// Sur les bords d'une section (les catégories de l'accueil, 11/11) : les mêmes traits, mais
// séparés, les rouges collés au bord gauche, les bleus au bord droit, pour encadrer le contenu
// sans passer dessous. Chaque côté ne montre que sa moitié du repère (`viewBox`), à la hauteur de
// la section. Sur téléphone, certaines sections les affichent plus discrètement en arrière-plan.
export function NeonSides({
  id,
  side = "both",
  mobile = false,
  extendMobile = false,
}: {
  id: string;
  side?: "both" | "left" | "right";
  mobile?: boolean;
  extendMobile?: boolean;
}) {
  const glow = `neon-glow-${id}`;
  const sideClass =
    "pointer-events-none absolute inset-y-0 aspect-[300/520] h-full";
  return (
    <div
      aria-hidden="true"
      className={
        mobile
          ? "pointer-events-none absolute inset-0 z-0 opacity-30 sm:opacity-100"
          : "hidden sm:block"
      }
    >
      {side !== "right" ? (
        <svg
          viewBox="-60 -20 300 520"
          className={`${sideClass} left-0`}
          preserveAspectRatio="xMinYMid meet"
          {...STROKE}
        >
          <Glow id={glow} />
          <Strokes paths={RED_PATHS} color="#ff2e4d" opacity={0.75} glow={glow} />
          {extendMobile ? (
            <g className="sm:hidden">
              <Strokes
                paths={MOBILE_LOWER_RED_PATHS}
                color="#ff2e4d"
                opacity={0.75}
                glow={glow}
              />
            </g>
          ) : null}
        </svg>
      ) : null}
      {side !== "left" ? (
        <svg
          viewBox="360 -20 300 520"
          className={`${sideClass} right-0`}
          preserveAspectRatio="xMaxYMid meet"
          {...STROKE}
        >
          <Glow id={`${glow}-droite`} />
          <Strokes
            paths={BLUE_PATHS}
            color="#3d4bff"
            opacity={0.85}
            glow={`${glow}-droite`}
          />
          {extendMobile ? (
            <g className="sm:hidden">
              <Strokes
                paths={MOBILE_LOWER_BLUE_PATHS}
                color="#3d4bff"
                opacity={0.85}
                glow={`${glow}-droite`}
              />
            </g>
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
