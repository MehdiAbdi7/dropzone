// Quand le back-office montre-t-il les prix d'achat (27/11, demande de Mehdi) ? La logique, sans React.
//
// Le but : un client qui regarde l'écran du vendeur ne doit pas voir le prix d'achat. L'admin règle un code à 4 chiffres,
// tout ce qui révèle un prix d'achat (le prix, la marge, le bénéfice) est caché par défaut, et taper le code le montre
// jusqu'à ce qu'on le recache, qu'on recharge la page ou qu'on n'y touche plus pendant cinq minutes. Sans code réglé, rien
// n'est caché (le comportement d'avant).

// Cinq minutes sans toucher à l'écran : les prix se recachent tout seuls.
export const COST_IDLE_MS = 5 * 60_000;

// Le code est de 4 chiffres, tapé au pavé numérique : tout autre caractère est écarté dès la saisie.
export const COST_PIN_LENGTH = 4;
export const digitsOnly = (text: string) => text.replace(/\D/g, "").slice(0, COST_PIN_LENGTH);
export const isCompletePin = (text: string) => new RegExp(`^\\d{${COST_PIN_LENGTH}}$`).test(text);

// Les prix d'achat se voient-ils ? Tant que l'état du code n'est pas connu (la page vient de s'ouvrir, l'API répond
// lentement ou pas du tout), ils restent cachés : en cas de doute, on cache plutôt qu'on montre. Sans code réglé, tout se voit.
export function costsVisible(state: { loaded: boolean; configured: boolean; unlocked: boolean }): boolean {
  return state.loaded && (!state.configured || state.unlocked);
}

// Le temps sans activité a-t-il atteint la limite ?
export function idleExpired(lastActivity: number, now: number, limit = COST_IDLE_MS): boolean {
  return now - lastActivity >= limit;
}

// Ce qui remplace un prix caché : des points, jamais un chiffre, et jamais assez longs pour deviner la taille du prix.
export const MASKED_COST = "••••";
