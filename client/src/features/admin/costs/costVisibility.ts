// Quand le back-office montre un prix d'achat (27/11, demande de Mehdi, revue le même jour) ? La logique, sans React.
//
// Le but : un client qui regarde l'écran du vendeur ne doit pas voir un prix d'achat. L'admin règle un code à 4 chiffres ;
// tout ce qui révèle un prix d'achat (le prix, la marge, le bénéfice) est caché par défaut, et le code se tape POUR UN PRIX
// À LA FOIS : on débloque celui qu'on veut voir, les autres restent cachés. Un prix débloqué se recache d'un toucher, tout
// seul après trente secondes, ou en quittant la page. Sans code réglé, rien n'est caché (le comportement d'avant).

// Trente secondes : le temps de lire un prix, pas de le laisser affiché pendant que le client regarde l'écran.
export const COST_REVEAL_MS = 30_000;

// Le code est de 4 chiffres, tapé au pavé numérique : tout autre caractère est écarté dès la saisie.
export const COST_PIN_LENGTH = 4;
export const digitsOnly = (text: string) => text.replace(/\D/g, "").slice(0, COST_PIN_LENGTH);
export const isCompletePin = (text: string) => new RegExp(`^\\d{${COST_PIN_LENGTH}}$`).test(text);

// Les prix d'achat sont-ils cachés par défaut ? Oui dès qu'un code est réglé, et aussi tant que l'état du code n'est pas
// connu (la page vient de s'ouvrir, l'API répond lentement ou pas du tout) : en cas de doute, on cache plutôt qu'on montre.
export function costsHiddenByDefault(state: { loaded: boolean; configured: boolean }): boolean {
  return !state.loaded || state.configured;
}

// Ce prix précis se voit-il ? Quand rien n'est caché par défaut, oui ; sinon seulement s'il a été débloqué et que son délai
// n'est pas écoulé. `expiresAt` : l'heure (en millisecondes) où son déblocage prend fin, absente s'il n'a pas été débloqué.
export function isCostVisible(state: { loaded: boolean; configured: boolean; expiresAt: number | undefined; now: number }): boolean {
  return !costsHiddenByDefault(state) || (state.expiresAt ?? 0) > state.now;
}

// Les prix débloqués : la clé d'un prix (« hit:IP-R-DEAL ») vers l'heure où il se recache.
export type Revealed = Record<string, number>;

// Débloque un prix à partir de `now` pour la durée normale.
export function withReveal(revealed: Revealed, key: string, now: number): Revealed {
  return { ...revealed, [key]: now + COST_REVEAL_MS };
}

// Recache un prix tout de suite (un toucher sur lui).
export function withoutReveal(revealed: Revealed, key: string): Revealed {
  return Object.fromEntries(Object.entries(revealed).filter(([other]) => other !== key));
}

// Les déblocages encore valables : ceux dont le délai est écoulé disparaissent.
export function stillRevealed(revealed: Revealed, now: number): Revealed {
  return Object.fromEntries(Object.entries(revealed).filter(([, expiresAt]) => expiresAt > now));
}

// Le prochain déblocage qui se termine (l'heure), pour programmer le recachage ; rien s'il n'y en a plus.
export function nextExpiry(revealed: Revealed): number | null {
  const times = Object.values(revealed);
  return times.length === 0 ? null : Math.min(...times);
}

// Ce qui remplace un prix caché : des points, jamais un chiffre, et jamais assez longs pour deviner la taille du prix.
export const MASKED_COST = "••••";
