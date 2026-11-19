import { diatonicIndex, germanName, toMidi } from '../model/pitch';
import type { Pitch, Step } from '../model/types';

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMIS: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export const INTERVALL_NAMEN = ['Prime', 'Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave'];
/** Halbtöne der großen bzw. reinen Intervalle innerhalb der Oktave */
const BASIS = [0, 2, 4, 5, 7, 9, 11, 12];
const REIN = new Set([1, 4, 5, 8]);

export type Qualitaet = 'rein' | 'groß' | 'klein' | 'übermäßig' | 'vermindert' | 'doppelt übermäßig' | 'doppelt vermindert';

export interface Intervall {
  /** 1 = Prime … 8 = Oktave (größere Intervalle werden auf die Oktave reduziert) */
  nummer: number;
  qualitaet: Qualitaet;
  halbtoene: number;
}

/** Bestimmt das Intervall zwischen zwei Tönen (der tiefere Ton zuerst oder egal in welcher Reihenfolge). */
export function intervall(a: Pitch, b: Pitch): Intervall {
  const [lo, hi] = toMidi(a) <= toMidi(b) ? [a, b] : [b, a];
  const stufen = diatonicIndex(hi) - diatonicIndex(lo);
  const halbtoene = toMidi(hi) - toMidi(lo);
  const nummer = stufen >= 7 && stufen % 7 === 0 ? 8 : (stufen % 7) + 1;
  const oktaven = stufen >= 7 && nummer !== 8 ? Math.floor(stufen / 7) : nummer === 8 ? stufen / 7 - 1 : 0;
  const diff = halbtoene - 12 * oktaven - BASIS[nummer - 1];
  let qualitaet: Qualitaet;
  if (REIN.has(nummer)) {
    qualitaet = diff === 0 ? 'rein' : diff === 1 ? 'übermäßig' : diff === -1 ? 'vermindert' : diff > 0 ? 'doppelt übermäßig' : 'doppelt vermindert';
  } else {
    qualitaet =
      diff === 0 ? 'groß' : diff === -1 ? 'klein' : diff === 1 ? 'übermäßig' : diff === -2 ? 'vermindert' : diff > 0 ? 'doppelt übermäßig' : 'doppelt vermindert';
  }
  return { nummer, qualitaet, halbtoene };
}

/** „große Terz“, „reine Quinte“, „übermäßige Quarte“ … */
export function intervallName(i: Pick<Intervall, 'nummer' | 'qualitaet'>): string {
  const adj: Record<Qualitaet, string> = {
    rein: 'reine',
    groß: 'große',
    klein: 'kleine',
    übermäßig: 'übermäßige',
    vermindert: 'verminderte',
    'doppelt übermäßig': 'doppelt übermäßige',
    'doppelt vermindert': 'doppelt verminderte',
  };
  return `${adj[i.qualitaet]} ${INTERVALL_NAMEN[i.nummer - 1]}`;
}

/** Ton im Abstand eines Intervalls über dem Grundton, richtig geschrieben (Terz bleibt Terz) */
export function intervallUeber(grund: Pitch, nummer: number, halbtoene: number): Pitch {
  const d = diatonicIndex(grund) + nummer - 1;
  const step = STEPS[d % 7];
  const octave = Math.floor(d / 7);
  const natural = (octave + 1) * 12 + SEMIS[step];
  const alter = toMidi(grund) + halbtoene - natural;
  return alter ? { step, alter, octave } : { step, octave };
}

export type DreiklangArt = 'Dur' | 'Moll' | 'vermindert' | 'übermäßig';
export const DREIKLANG_ARTEN: DreiklangArt[] = ['Dur', 'Moll', 'vermindert', 'übermäßig'];
const DREIKLANG_HALBTOENE: Record<DreiklangArt, [number, number]> = {
  Dur: [4, 7],
  Moll: [3, 7],
  vermindert: [3, 6],
  übermäßig: [4, 8],
};

export function dreiklang(grund: Pitch, art: DreiklangArt): Pitch[] {
  const [t, q] = DREIKLANG_HALBTOENE[art];
  return [grund, intervallUeber(grund, 3, t), intervallUeber(grund, 5, q)];
}

/** „C-Dur“, „fis-Moll“, „H vermindert“, „Es übermäßig“ */
export function dreiklangName(grund: Pitch, art: DreiklangArt): string {
  const n = germanName(grund);
  if (art === 'Dur') return `${n}-Dur`;
  if (art === 'Moll') return `${n.toLowerCase()}-Moll`;
  return `${n} ${art}`;
}

/** Erkennt einen Dreiklang in Grundstellung (Grundton, Terz, Quinte) */
export function dreiklangArt(toene: Pitch[]): DreiklangArt | null {
  if (toene.length !== 3) return null;
  const [g, t, q] = toene;
  const terz = intervall(g, t);
  const quinte = intervall(g, q);
  if (terz.nummer !== 3 || quinte.nummer !== 5) return null;
  for (const art of DREIKLANG_ARTEN) {
    const [ht, hq] = DREIKLANG_HALBTOENE[art];
    if (terz.halbtoene === ht && quinte.halbtoene === hq) return art;
  }
  return null;
}

