// Les deux onglets des listes de commandes (Livraisons, Retraits) : « Nouvelles commandes », celles
// qui viennent d'arriver et attendent d'être vues, et « En cours », celles qu'on suit déjà. Une
// commande qui arrive ne se noie plus parmi celles en cours. Le nombre de nouvelles ressort en rouge.
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
    <div role="group" aria-label="Commandes à voir" className="flex flex-wrap gap-2">
      <button type="button" className="chip" aria-pressed={tab === "new"} onClick={() => onChange("new")}>
        Nouvelles commandes
        {newCount ? (
          <span className="ml-2 rounded-full bg-red px-2 py-0.5 text-xs font-bold text-on-red">{newCount}</span>
        ) : null}
      </button>
      <button type="button" className="chip" aria-pressed={tab === "ongoing"} onClick={() => onChange("ongoing")}>
        En cours
        {ongoingCount ? <span className="ml-2 text-xs text-ink-muted">{ongoingCount}</span> : null}
      </button>
    </div>
  );
}
