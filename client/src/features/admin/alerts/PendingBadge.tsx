// La pastille rouge de « commandes à confirmer » : visible dans la barre latérale, la barre du bas et les
// sous-onglets, comme sur Niwa Food. Rien quand il n'y a rien à confirmer.
export default function PendingBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      role="status"
      aria-label={`${count} commande${count > 1 ? "s" : ""} à confirmer`}
      className={`inline-grid min-w-5 place-items-center rounded-full bg-red px-1.5 text-[11px] leading-5 font-bold text-on-brand tabular-nums ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
