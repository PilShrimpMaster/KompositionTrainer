import { keyAlter, nearestOctave } from '../model/pitch';
import type { Clef, DurationType, Pitch, Step } from '../model/types';
import type { EditorAction } from './state';

export interface KeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

export interface ShortcutContext {
  /** Note, an der sich die Oktave der Buchstabeneingabe orientiert */
  refPitch: Pitch | null;
  fifths: number;
  clef: Clef;
  /** Oktave für den ersten Ton ohne Bezug (z. B. Mitte der guten Lage eines Instruments) */
  oktave?: number;
  inputDuration: DurationType;
  inputDots: number;
}

export type ShortcutResult = EditorAction | { type: 'play' } | null;

/** Buchstaben in deutscher Schreibweise: h = H, b = B (Hes) */
const LETTERS: Record<string, { step: Step; alter?: number }> = {
  c: { step: 'C' },
  d: { step: 'D' },
  e: { step: 'E' },
  f: { step: 'F' },
  g: { step: 'G' },
  a: { step: 'A' },
  h: { step: 'B' },
  b: { step: 'B', alter: -1 },
};

/** Ziffern wie in MuseScore: 2 = Sechzehntel … 6 = Ganze */
const DIGITS: Record<string, DurationType> = {
  '2': '16th',
  '3': 'eighth',
  '4': 'quarter',
  '5': 'half',
  '6': 'whole',
};

export function shortcutFor(e: KeyInput, ctx: ShortcutContext): ShortcutResult {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

  if (mod) {
    if (key === 'z') return e.shiftKey ? { type: 'redo' } : { type: 'undo' };
    if (key === 'y') return { type: 'redo' };
    if (key === 'ArrowUp') return { type: 'transpose', steps: 7 };
    if (key === 'ArrowDown') return { type: 'transpose', steps: -7 };
    return null;
  }
  if (e.altKey) return null;

  const letter = LETTERS[key];
  if (letter) {
    const alter = letter.alter ?? keyAlter(letter.step, ctx.fifths);
    const pitch = nearestOctave(letter.step, alter, ctx.refPitch, ctx.oktave ?? (ctx.clef === 'bass' ? 3 : 4));
    return { type: 'insert', event: { pitch, duration: duration(ctx) } };
  }
  if (DIGITS[key]) return { type: 'setDuration', duration: DIGITS[key] };

  switch (key) {
    case '0':
    case 'p':
      return { type: 'insert', event: { duration: duration(ctx) } };
    case '.':
      return { type: 'toggleDot' };
    case 't':
      return { type: 'toggleTie' };
    case '+':
    case '#':
      return { type: 'alter', delta: 1 };
    case '-':
      return { type: 'alter', delta: -1 };
    case '=':
    case 'n':
      return { type: 'natural' };
    case 'ArrowUp':
      return { type: 'transpose', steps: 1 };
    case 'ArrowDown':
      return { type: 'transpose', steps: -1 };
    case 'ArrowLeft':
      return { type: 'moveSelection', delta: -1 };
    case 'ArrowRight':
      return { type: 'moveSelection', delta: 1 };
    case 'Escape':
      return { type: 'select', index: null };
    case 'Backspace':
    case 'Delete':
      return { type: 'delete' };
    case ' ':
      return { type: 'play' };
  }
  return null;
}

function duration(ctx: ShortcutContext) {
  return ctx.inputDots ? { type: ctx.inputDuration, dots: ctx.inputDots } : { type: ctx.inputDuration };
}

/** Übersicht für die Hilfe in der App */
export const SHORTCUT_HELP: [string, string][] = [
  ['C D E F G A H', 'Note eingeben (Oktave nahe der vorigen Note)'],
  ['B', 'B (Hes) eingeben'],
  ['2 3 4 5 6', 'Sechzehntel, Achtel, Viertel, Halbe, Ganze'],
  ['.', 'Punktierung an/aus'],
  ['0 oder P', 'Pause eingeben'],
  ['+ / -', 'Note erhöhen (Kreuz) / erniedrigen (b)'],
  ['N', 'Auflösungszeichen (Vorzeichen entfernen)'],
  ['↑ / ↓', 'Note einen Ton höher / tiefer (in der Tonart)'],
  ['Strg + ↑ / ↓', 'Note eine Oktave höher / tiefer'],
  ['← / →', 'Vorige / nächste Note auswählen'],
  ['T', 'Haltebogen zur nächsten Note'],
  ['Entf / ⌫', 'Note löschen'],
  ['Esc', 'Auswahl aufheben (Eingabe am Ende)'],
  ['Leertaste', 'Abspielen / Stopp'],
  ['Strg + Z / Strg + Y', 'Rückgängig / Wiederholen'],
];
