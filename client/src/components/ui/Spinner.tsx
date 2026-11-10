// La roue de chargement (06/11) : un anneau qui s'efface vers sa queue et tourne. Tout le
// dessin est en CSS (.spinner dans styles/spinner.css) ; la couleur est celle du texte autour.
// `label` : la phrase lue par les lecteurs d'écran (role="status"). Sans label, la roue est
// décorative (le socle de l'accueil, déjà caché aux lecteurs d'écran).
export default function Spinner({ label, className = "" }: { label?: string; className?: string }) {
  if (!label) {
    return <span aria-hidden="true" className={`spinner ${className}`} />;
  }
  return (
    <span role="status" className={`spinner ${className}`}>
      <span className="sr-only">{label}</span>
    </span>
  );
}
