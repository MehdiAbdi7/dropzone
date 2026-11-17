// Les sons d'alerte du back-office, générés à la volée avec Web Audio (pas de fichier .mp3 à héberger).
// Choix pour DropZone (un magasin de téléphones, au comptoir) : un carillon clair à deux notes qui
// MONTENT (« ding-dong » vers l'aigu, comme l'annonce d'un magasin), sinon que la cloche de comptoir de
// Niwa Food (cuisine bruyante). Il se distingue aussi d'une sonnerie de téléphone. Une commande à
// confirmer sonne deux notes ; une nouvelle réservation, une seule note plus douce.

const NOTE_MI6_HZ = 1318.51;
const NOTE_LA6_HZ = 1760;
const NOTE_DO6_HZ = 1046.5;

// [rapport à la fondamentale, volume de crête, durée de résonance en s] : un son rond (la fondamentale)
// avec un peu d'éclat (l'octave et la quinte au-dessus).
const CHIME_PARTIALS = [
  [1, 0.26, 1.1],
  [2, 0.09, 0.6],
  [3, 0.04, 0.35],
] as const;

// Le premier coup, puis le second qui monte, 0,28 s plus tard.
const CONFIRM_NOTES: [number, number][] = [
  [NOTE_MI6_HZ, 0],
  [NOTE_LA6_HZ, 0.28],
];

// Une seule AudioContext pour toute la session : c'est elle qui porte l'autorisation du navigateur.
// Chrome et Safari la créent « suspendue » tant que la page n'a reçu aucun clic ni toucher, et seul un
// resume() appelé PENDANT un geste la débloque. En recréer une à chaque alerte reperdrait ce déblocage.
let context: AudioContext | null = null;
const listeners = new Set<() => void>();

// Vrai une fois qu'un son (muet) a réellement démarré pendant un geste : sur iPhone, c'est ce qui ouvre
// la sortie audio (resume() seul ne suffit pas).
let isOutputOpened = false;

type NavigatorWithAudioSession = Navigator & { audioSession?: { type: string } };

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    try {
      // Par défaut, Safari classe le son d'une page en « ambiance » (coupé par le mode silencieux).
      // « playback » le traite comme un son multimédia : une alerte de magasin doit s'entendre.
      const nav = navigator as NavigatorWithAudioSession;
      if (nav.audioSession) nav.audioSession.type = "playback";
      context = new AudioContext();
    } catch {
      return null;
    }
    context.onstatechange = () => {
      // Suspendue ou interrompue (appel, application en arrière-plan) : la sortie se referme sur iPhone.
      if (context?.state !== "running") isOutputOpened = false;
      listeners.forEach((listener) => listener());
    };
  }
  return context;
}

// À appeler depuis un geste de l'utilisateur (clic, toucher, touche) : débloque le son. Un buffer muet
// d'un seul échantillon démarre pendant le geste, la parade des bibliothèques audio pour iPhone.
export function unlockAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "running" && isOutputOpened) return;
  if (ctx.state !== "running") void ctx.resume().catch(() => {});
  const silence = ctx.createBufferSource();
  silence.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  silence.connect(ctx.destination);
  silence.start(0);
  isOutputOpened = true;
}

// Abonnement pour useSyncExternalStore : prévient à chaque blocage ou déblocage du son.
export function subscribeAudioState(listener: () => void): () => void {
  getContext();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Vrai tant que le navigateur refuse de jouer du son. Sans AudioContext du tout (navigateur très
// ancien), rien à débloquer : inutile d'afficher un message que personne ne pourrait résoudre.
export function isAudioBlocked(): boolean {
  const ctx = getContext();
  return ctx !== null && ctx.state !== "running";
}

function ring(ctx: AudioContext, freq: number, start: number, volume: number) {
  CHIME_PARTIALS.forEach(([ratio, peak, decay]) => {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = freq * ratio;
    // Attaque quasi instantanée puis décroissance exponentielle ; exponentialRamp refuse 0, d'où 0.0001.
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak * volume, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.004 + decay);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + decay + 0.05);
  });
}

// Une commande à confirmer par téléphone vient d'arriver : deux notes qui montent.
export function playNewOrderChime(): void {
  const ctx = getContext();
  // Son bloqué : on n'insiste pas, la bannière demande déjà de toucher l'écran et le carillon repartira
  // au déblocage.
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime + 0.03;
  CONFIRM_NOTES.forEach(([freq, offset]) => ring(ctx, freq, now + offset, 1));
}

// Une nouvelle réservation (réservation au magasin) : une seule note, plus douce, qui n'exige aucune action.
export function playReservationChime(): void {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running") return;
  ring(ctx, NOTE_DO6_HZ, ctx.currentTime + 0.03, 0.7);
}

// Le bouton « Tester le son » : débloque et sonne dans le même geste. Renvoie faux si le navigateur
// refuse toujours le son.
export async function playTestChime(): Promise<boolean> {
  unlockAudio();
  const ctx = getContext();
  if (!ctx) return false;
  // resume() est asynchrone : sans cette attente, le carillon verrait encore « suspended ».
  try {
    await ctx.resume();
  } catch {
    return false;
  }
  playNewOrderChime();
  return ctx.state === "running";
}
