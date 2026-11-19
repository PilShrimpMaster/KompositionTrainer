/**
 * Der API-Schlüssel und der Anfragenzähler liegen nur im Browser (localStorage),
 * nie im Repository und nie auf einem Server außer dem von Anthropic.
 */
const SCHLUESSEL_KEY = 'kt-ki-schluessel';
const ZAEHLER_KEY = 'kt-ki-zaehler';

export function kiSchluessel(): string | null {
  try {
    return localStorage.getItem(SCHLUESSEL_KEY) || null;
  } catch {
    return null;
  }
}

export function setKiSchluessel(s: string | null) {
  try {
    if (s && s.trim()) localStorage.setItem(SCHLUESSEL_KEY, s.trim());
    else localStorage.removeItem(SCHLUESSEL_KEY);
  } catch {
    /* ignorieren */
  }
}

/** „2026-11“ */
export function monat(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface Zaehler {
  monat: string;
  anfragen: number;
  /** Ein- und Ausgabe-Token im Monat, für eine grobe Kostenschätzung */
  eingabe: number;
  ausgabe: number;
}

export function kiZaehler(jetzt = new Date()): Zaehler {
  const leer: Zaehler = { monat: monat(jetzt), anfragen: 0, eingabe: 0, ausgabe: 0 };
  try {
    const z = JSON.parse(localStorage.getItem(ZAEHLER_KEY) ?? 'null') as Zaehler | null;
    return z && z.monat === leer.monat ? { ...leer, ...z } : leer;
  } catch {
    return leer;
  }
}

export function zaehle(eingabe: number, ausgabe: number, jetzt = new Date()): Zaehler {
  const z = kiZaehler(jetzt);
  const neu = { ...z, anfragen: z.anfragen + 1, eingabe: z.eingabe + eingabe, ausgabe: z.ausgabe + ausgabe };
  try {
    localStorage.setItem(ZAEHLER_KEY, JSON.stringify(neu));
  } catch {
    /* ignorieren */
  }
  return neu;
}

/** Grobe Kosten in US-Dollar (Claude Opus 5.5: 4 $ je Million Eingabe-, 20 $ je Million Ausgabe-Token) */
export function kostenSchaetzung(z: Pick<Zaehler, 'eingabe' | 'ausgabe'>): number {
  return (z.eingabe * 4 + z.ausgabe * 20) / 1_000_000;
}
