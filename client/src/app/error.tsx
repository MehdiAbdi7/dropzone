"use client";

// La page affichée quand un composant plante pendant le rendu. Un Client Component
// obligatoire : `reset` relance le rendu sans recharger toute la page.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="contenu" className="container-page flex flex-1 flex-col items-start justify-center gap-5 py-20">
      <h1 className="text-4xl">Cette page n&apos;a pas pu s&apos;afficher.</h1>
      <p className="max-w-md text-ink-muted">Réessayez. Si le problème continue, revenez dans quelques minutes.</p>
      <button type="button" className="btn btn-primary" onClick={reset}>
        Réessayer
      </button>
    </main>
  );
}
