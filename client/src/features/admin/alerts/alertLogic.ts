// La logique pure de l'alerte « nouvelle commande » du back-office, sans React ni navigateur : facile à
// tester. Le composant (NewOrderAlert) ne fait que la brancher aux données et au son.

// Les commandes en attente qu'on n'a pas encore marquées « Vu ».
export function unseenIds(pending: number[], acknowledged: number[]): number[] {
  const seen = new Set(acknowledged);
  return pending.filter((id) => !seen.has(id));
}

// Oublie les « Vu » des commandes qui ne sont plus en attente : elles n'y reviendront pas, et la liste
// ne doit pas grossir à l'infini.
export function pruneAcknowledged(acknowledged: number[], pending: number[]): number[] {
  const still = new Set(pending);
  return acknowledged.filter((id) => still.has(id));
}

// Sonner tout de suite ? Oui pour une vraie nouvelle commande (une qu'on n'avait pas au passage
// précédent, ou toutes au premier chargement) et quand le son vient d'être débloqué avec des commandes à
// voir. Sinon seul le rappel régulier sonne.
export function shouldRingNow({
  previous,
  unseen,
  wasBlocked,
  blocked,
}: {
  previous: Set<number> | null;
  unseen: number[];
  wasBlocked: boolean;
  blocked: boolean;
}): boolean {
  if (unseen.length === 0) return false;
  const hasNew = unseen.some((id) => !previous?.has(id));
  const justUnlocked = wasBlocked && !blocked;
  return hasNew || justUnlocked;
}

// Les identifiants apparus depuis le passage précédent. Au premier passage (`previous` nul), rien n'est
// nouveau : ce qui existait déjà au chargement de la page ne sonne pas.
export function newArrivals(previous: Set<number> | null, current: number[]): number[] {
  if (!previous) return [];
  return current.filter((id) => !previous.has(id));
}

// Relit les « Vu » gardés dans le navigateur. La donnée vient du disque, donc de l'extérieur : on vérifie
// sa forme avant de s'en servir.
export function parseAcknowledged(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is number => Number.isInteger(value)) : [];
  } catch {
    return [];
  }
}
