// Affiché pendant que le serveur prépare une page de la boutique (streaming).
export default function Loading() {
  return (
    <div className="container-page py-10" role="status" aria-label="Chargement">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="card aspect-[3/4] animate-pulse bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
