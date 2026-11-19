// Les deux onglets des listes de commandes (Livraisons, Réservations) : « Nouvelles commandes », celles
// qui viennent d'arriver et attendent d'être vues, et « En cours », celles qu'on suit déjà. Une
// commande qui arrive ne se noie plus parmi celles en cours. Le nombre de nouvelles ressort en rouge.
// Depuis le 20/11, un rail gris où l'onglet choisi est une pastille bleue (`.admin-seg`, styles/admin.css).
export type OrdersTab = "new" | "ongoing";

export default function OrdersTabs({
  tab,
  onChange,
  newCount,
  ongoingCount,
}: {
  tab: OrdersTab;
  onChange: (tab: OrdersTab) => void;
  // undefined = pas encore reçu : le nombre n'est pas affiché.
  newCount: number | undefined;
  ongoingCount: number | undefined;
}) {
  return (
    <div role="group" aria-label="Commandes à voir" className="admin-seg self-start">
      <button type="button" aria-pressed={tab === "new"} onClick={() => onChange("new")}>
        Nouvelles
        <span className="hidden sm:inline">commandes</span>
        {newCount ? <span className="rounded-full bg-red px-2 py-0.5 text-xs font-bold text-on-red">{newCount}</span> : null}
      </button>
      <button type="button" aria-pressed={tab === "ongoing"} onClick={() => onChange("ongoing")}>
        En cours
        {ongoingCount ? <span className={`text-xs ${tab === "ongoing" ? "opacity-80" : "text-ink-muted"}`}>{ongoingCount}</span> : null}
      </button>
    </div>
  );
}
