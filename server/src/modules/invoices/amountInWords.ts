// Le total en lettres d'une facture (lot 6) : « deux cent quarante-cinq mille dinars algériens ».
// Les règles du français tiennent en trois pièges, qu'on traite avec un drapeau `final` (« rien ne
// vient derrière ce groupe ») :
//  - « quatre-vingts » et « deux cents » prennent un s seulement quand rien ne les suit ;
//  - « mille » ne varie jamais : « quatre-vingt mille », « deux cent mille » sans s ;
//  - « million » et « milliard » sont des noms : ils prennent un s au pluriel, et un « de » quand ils
//    terminent le nombre (« deux millions de dinars », mais « deux millions un dinars »).

const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

// 0 à 99. `final` : « quatre-vingts » prend son s seulement s'il termine le groupe.
function below100(n: number, final: boolean): string {
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  const ten = Math.floor(n / 10);
  const unit = n % 10;
  if (ten <= 6) {
    if (unit === 0) return TENS[ten];
    return unit === 1 ? `${TENS[ten]} et un` : `${TENS[ten]}-${UNITS[unit]}`;
  }
  // 70 à 79 : soixante + 10 à 19. « soixante et onze » (71) est le seul à prendre « et ».
  if (ten === 7) return unit === 1 ? "soixante et onze" : `soixante-${below100(10 + unit, final)}`;
  // 80 à 89 : quatre-vingt + 1 à 9. 90 à 99 : quatre-vingt + 10 à 19.
  if (ten === 8) return unit === 0 ? (final ? "quatre-vingts" : "quatre-vingt") : `quatre-vingt-${UNITS[unit]}`;
  return `quatre-vingt-${below100(10 + unit, final)}`;
}

// 0 à 999. « cent » prend un s s'il est multiplié (« deux cents ») et si rien ne le suit.
function below1000(n: number, final: boolean): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return below100(rest, final);
  const prefix = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`;
  if (rest === 0) return hundreds > 1 && final ? `${prefix}s` : prefix;
  return `${prefix} ${below100(rest, final)}`;
}

const MAX = 2_999_999_999;

export function amountInWords(amount: number): string {
  if (!Number.isInteger(amount) || amount < 0 || amount > MAX) {
    throw new RangeError("Un montant en dinars entiers, de 0 à 2 999 999 999");
  }
  const billions = Math.floor(amount / 1_000_000_000);
  const millions = Math.floor(amount / 1_000_000) % 1000;
  const thousands = Math.floor(amount / 1000) % 1000;
  const rest = amount % 1000;

  const parts: string[] = [];
  if (billions > 0) parts.push(billions === 1 ? "un milliard" : `${below1000(billions, true)} milliards`);
  if (millions > 0) parts.push(millions === 1 ? "un million" : `${below1000(millions, true)} millions`);
  if (thousands > 0) parts.push(thousands === 1 ? "mille" : `${below1000(thousands, false)} mille`);
  if (rest > 0 || amount === 0) parts.push(below1000(rest, true));

  // « de » quand le nombre finit par des millions ou des milliards entiers : « deux millions de dinars ».
  const round = amount >= 1_000_000 && amount % 1_000_000 === 0;
  const unit = amount <= 1 ? "dinar algérien" : "dinars algériens";
  return `${parts.join(" ")}${round ? " de" : ""} ${unit}`;
}
