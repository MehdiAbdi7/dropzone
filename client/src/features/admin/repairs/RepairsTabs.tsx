// Les deux onglets de la liste des réparations, comme « Nouvelles » et « En cours » des commandes : « Nouvelles »,
// les appareils juste reçus que le technicien n'a pas encore regardés (leur nombre ressort en rouge), et « En cours »,
// toutes les autres fiches pas encore rendues. Une fiche rendue quitte la liste : elle est dans l'Historique.
export type RepairsTab = "new" | "ongoing";

export default function RepairsTabs({
  tab,
  onChange,
  newCount,
  ongoingCount,
}: {
  tab: RepairsTab;
  onChange: (tab: RepairsTab) => void;
  // undefined = pas encore reçu : le nombre n'est pas affiché.
  newCount: number | undefined;
  ongoingCount: number | undefined;
}) {
  return (
    <div role="group" aria-label="Réparations à voir" className="admin-seg self-start">
      <button type="button" aria-pressed={tab === "new"} onClick={() => onChange("new")}>
        Nouvelles
        {newCount ? <span className="rounded-full bg-red px-2 py-0.5 text-xs font-bold text-on-red">{newCount}</span> : null}
      </button>
      <button type="button" aria-pressed={tab === "ongoing"} onClick={() => onChange("ongoing")}>
        En cours
        {ongoingCount ? <span className={`text-xs ${tab === "ongoing" ? "opacity-80" : "text-ink-muted"}`}>{ongoingCount}</span> : null}
      </button>
    </div>
  );
}
