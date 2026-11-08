// Affiché pendant que le serveur prépare une page de la boutique (streaming).
export default function Loading() {
  return (
    <div className="shop-loading" role="status" aria-live="polite">
      <div className="shop-loading-content">
        <span className="spinner text-blue" aria-hidden="true" />
        <p className="font-display text-lg font-bold">On prépare votre sélection</p>
        <p className="text-sm text-ink-muted">La boutique arrive…</p>
        <span className="shop-loading-progress" aria-hidden="true" />
      </div>
    </div>
  );
}
