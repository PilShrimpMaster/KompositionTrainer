import type { Clef, KeySignature, Pitch, Step } from '../model/types';

export type Kategorie = 'Grundbegriffe' | 'Rhythmus' | 'Tonarten' | 'Intervalle' | 'Harmonik' | 'Satztechnik' | 'Melodik' | 'Form' | 'Instrumente' | 'Geschichte';
export const KATEGORIEN: Kategorie[] = ['Grundbegriffe', 'Rhythmus', 'Tonarten', 'Intervalle', 'Harmonik', 'Satztechnik', 'Melodik', 'Form', 'Instrumente', 'Geschichte'];

export interface Eintrag {
  id: string;
  titel: string;
  kategorie: Kategorie;
  kurz: string;
  synonyme: string[];
  siehe: string[];
  beispiel?: Pitch[][];
  klang: 'nacheinander' | 'zusammen';
  schluessel: Clef;
  tonart?: KeySignature;
  /** Markdown-Text ohne Kopfzeilen */
  text: string;
}

/** Liest „C4“, „F#4“, „Bb3“, „Ebb5“, „Fx4“ */
export function parsePitch(token: string): Pitch {
  const m = /^([A-G])(##|#|x|bb|b)?(-?\d)$/.exec(token.trim());
  if (!m) throw new Error(`Unbekannter Ton „${token}“`);
  const acc = m[2] ?? '';
  const alter = acc === '#' ? 1 : acc === '##' || acc === 'x' ? 2 : acc === 'b' ? -1 : acc === 'bb' ? -2 : 0;
  const p: Pitch = { step: m[1] as Step, octave: Number(m[3]) };
  if (alter) p.alter = alter;
  return p;
}

/** „C4 E4 G4 | C4 Eb4 G4“ → zwei Gruppen */
export function parseBeispiel(s: string): Pitch[][] {
  return s
    .split('|')
    .map((g) => g.trim())
    .filter(Boolean)
    .map((g) => g.split(/\s+/).map(parsePitch));
}

export function liste(s: string | undefined): string[] {
  return (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

/** Liest „schlüssel: wert“-Zeilen */
export function leseFelder(text: string): Record<string, string> {
  const felder: Record<string, string> = {};
  for (const zeile of text.split(/\r?\n/)) {
    const i = zeile.indexOf(':');
    if (i < 0) continue;
    felder[zeile.slice(0, i).trim()] = zeile.slice(i + 1).trim();
  }
  return felder;
}

/** Trennt die Kopfzeilen zwischen „---“ vom Markdown-Text */
export function trenneKopf(quelle: string, datei = '?'): { kopf: Record<string, string>; text: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(quelle);
  if (!m) throw new Error(`${datei}: Kopfzeilen fehlen`);
  return { kopf: leseFelder(m[1]), text: m[2].trim() };
}

/** Zerlegt eine Lexikon-Datei */
export function parseEintrag(quelle: string, datei = '?'): Eintrag {
  const { kopf, text } = trenneKopf(quelle, datei);
  for (const k of ['id', 'titel', 'kategorie', 'kurz']) {
    if (!kopf[k]) throw new Error(`${datei}: Feld „${k}“ fehlt`);
  }
  if (!KATEGORIEN.includes(kopf.kategorie as Kategorie)) throw new Error(`${datei}: unbekannte Kategorie „${kopf.kategorie}“`);
  let tonart: KeySignature | undefined;
  if (kopf.tonart) {
    const [f, mode] = kopf.tonart.split(/\s+/);
    tonart = { fifths: Number(f), mode: mode === 'minor' ? 'minor' : 'major' };
    if (!Number.isInteger(tonart.fifths)) throw new Error(`${datei}: Tonart „${kopf.tonart}“ ungültig`);
  }
  return {
    id: kopf.id,
    titel: kopf.titel,
    kategorie: kopf.kategorie as Kategorie,
    kurz: kopf.kurz,
    synonyme: liste(kopf.synonyme),
    siehe: liste(kopf.siehe),
    beispiel: kopf.beispiel ? parseBeispiel(kopf.beispiel) : undefined,
    klang: kopf.klang === 'zusammen' ? 'zusammen' : 'nacheinander',
    schluessel: kopf.schluessel === 'bass' ? 'bass' : 'treble',
    tonart,
    text,
  };
}
