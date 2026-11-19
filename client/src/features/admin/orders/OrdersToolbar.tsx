import { SearchIcon } from "@/components/ui/icons";
import OrdersTabs, { type OrdersTab } from "./OrdersTabs";

// La barre d'outils au-dessus des listes de commandes (20/11) : les deux onglets en bloc à gauche, la recherche
// à droite (sous les onglets sur téléphone). Une seule carte pour les deux pages, Livraisons et Réservations.
export default function OrdersToolbar({
  tab,
  onTab,
  newCount,
  ongoingCount,
  q,
  onQ,
  searchLabel,
}: {
  tab: OrdersTab;
  onTab: (tab: OrdersTab) => void;
  newCount: number | undefined;
  ongoingCount: number | undefined;
  q: string;
  onQ: (value: string) => void;
  searchLabel: string;
}) {
  return (
    <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <OrdersTabs tab={tab} onChange={onTab} newCount={newCount} ongoingCount={ongoingCount} />
      <label className="admin-search w-full sm:max-w-xs">
        <span className="sr-only">{searchLabel}</span>
        <SearchIcon size={18} />
        <input className="input" type="search" placeholder="Numéro, téléphone ou nom…" value={q} onChange={(event) => onQ(event.target.value)} />
      </label>
    </div>
  );
}
