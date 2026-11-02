// Les traits de néon derrière le socle, comme sur les bannières de DropZone :
// rouges à gauche, bleus à droite. Du SVG plutôt qu'une image : quelques
// centaines d'octets, net à toutes les tailles. Le filtre `glow` floute une copie
// du trait et la pose dessous, d'où le halo.
// `id` doit être unique sur la page (le hero et le bandeau des affaires en ont un chacun).
export default function NeonLines({ id }: { id: string }) {
  const glow = `neon-glow-${id}`;
  return (
    <svg
      viewBox="0 0 600 480"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      fill="none"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <filter id={glow} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="#ff2e4d" filter={`url(#${glow})`} opacity="0.75">
        <path d="M-40 70 100 210v110" />
        <path d="M-60 190 50 300h110" />
        <path d="M40 -20 230 170" />
        <path d="M-30 390 90 270" />
        <path d="M10 500 150 360h70" />
      </g>
      <g stroke="#3d4bff" filter={`url(#${glow})`} opacity="0.85">
        <path d="M640 70 500 210v110" />
        <path d="M660 190 550 300H440" />
        <path d="M560 -20 370 170" />
        <path d="M650 330a150 150 0 0 0-150 150" />
        <path d="M590 500 450 360h-70" />
      </g>
    </svg>
  );
}
