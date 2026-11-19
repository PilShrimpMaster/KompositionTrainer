import { diatonicIndex, germanName, toMidi } from '../model/pitch';
import type { KeySignature, Pitch, Step } from '../model/types';
import { grundton } from '../lernpfad/pruefung';

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export type Akkordart = 'Dur' | 'Moll' | 'vermindert' | 'übermäßig';
export type Septart = 'Dominantseptakkord' | 'kleiner Mollseptakkord' | 'großer Durseptakkord' | 'halbverminderter Septakkord' | 'verminderter Septakkord' | 'Septakkord';

export interface Akkord {
  grundton: Pitch;
  art: Akkordart | null;
  /** Septime vorhanden? */
  sept: Septart | null;
  /** 0 = Grundstellung, 1 = Terz im Bass (Sextakkord), 2 = Quinte im Bass (Quartsextakkord), 3 = Septime im Bass */
  umkehrung: number;
  /** Rolle jedes Tons: 1 = Grundton, 3 = Terz, 5 = Quinte, 7 = Septime (null bei Pausen) */
  rollen: (1 | 3 | 5 | 7 | null)[];
  /** Stufe in der Tonart, 1–7 */
  stufe: number;
  /** z. B. „C-Dur“, „G⁷“, „H vermindert“ */
  name: string;
  /** Funktion, z. B. „T“, „S“, „D⁷“, „Tp“ */
  funktion: string;
}

const pc = (p: Pitch) => ((toMidi(p) % 12) + 12) % 12;

/**
 * Erkennt einen Dreiklang oder Septakkord aus den klingenden Tönen (tiefster Ton = Bass).
 * Gesucht wird der Grundton, über dem alle Töne als Terzen geschichtet sind.
 */
export function erkenneAkkord(toene: (Pitch | null)[], key: KeySignature): Akkord | null {
  const klingend = toene.filter((p): p is Pitch => !!p);
  if (klingend.length < 2) return null;
  const bass = klingend.reduce((a, b) => (toMidi(b) < toMidi(a) ? b : a));

  let best: { root: Pitch; rollen: (1 | 3 | 5 | 7 | null)[]; punkte: number } | null = null;
  for (const root of klingend) {
    const rollen = toene.map((p) => {
      if (!p) return null;
      const d = (((STEPS.indexOf(p.step) - STEPS.indexOf(root.step)) % 7) + 7) % 7;
      return d === 0 ? 1 : d === 2 ? 3 : d === 4 ? 5 : d === 6 ? 7 : -1;
    });
    if (rollen.some((r) => r === -1)) continue;
    const r = rollen as (1 | 3 | 5 | 7 | null)[];
    // Bevorzugt: Terz vorhanden, Grundton im Bass, wenig Lücken
    const punkte = (r.includes(3) ? 4 : 0) + (r.includes(5) ? 1 : 0) + (pc(root) === pc(bass) ? 2 : 0) - (r.includes(7) ? 1 : 0);
    if (!best || punkte > best.punkte) best = { root, rollen: r, punkte };
  }
  if (!best) return null;

  const { root, rollen } = best;
  const ton = (rolle: number) => toene.find((p, i) => p && rollen[i] === rolle) ?? null;
  const abst = (p: Pitch | null) => (p ? (((pc(p) - pc(root)) % 12) + 12) % 12 : null);
  const t = abst(ton(3));
  const q = abst(ton(5));
  const s = abst(ton(7));
  let art: Akkordart | null = null;
  if (t === 4 && (q === 7 || q === null)) art = 'Dur';
  else if (t === 3 && (q === 7 || q === null)) art = 'Moll';
  else if (t === 3 && q === 6) art = 'vermindert';
  else if (t === 4 && q === 8) art = 'übermäßig';
  else if (t === null && q === 7) art = null;

  let sept: Septart | null = null;
  if (s !== null) {
    if (art === 'Dur' && s === 10) sept = 'Dominantseptakkord';
    else if (art === 'Moll' && s === 10) sept = 'kleiner Mollseptakkord';
    else if (art === 'Dur' && s === 11) sept = 'großer Durseptakkord';
    else if (art === 'vermindert' && s === 10) sept = 'halbverminderter Septakkord';
    else if (art === 'vermindert' && s === 9) sept = 'verminderter Septakkord';
    else sept = 'Septakkord';
  }

  const bassRolle = rollen[toene.indexOf(bass)] ?? 1;
  const umkehrung = bassRolle === 1 ? 0 : bassRolle === 3 ? 1 : bassRolle === 5 ? 2 : 3;
  const g = grundton(key);
  const stufe = ((((STEPS.indexOf(root.step) - STEPS.indexOf(g.step)) % 7) + 7) % 7) + 1;

  const n = germanName(root);
  const name =
    sept === 'Dominantseptakkord'
      ? `${n}⁷`
      : sept === 'verminderter Septakkord'
        ? `${n} vermindert⁷`
        : art === 'Dur'
          ? `${n}-Dur${sept ? ' mit Septime' : ''}`
          : art === 'Moll'
            ? `${n.toLowerCase()}-Moll${sept ? ' mit Septime' : ''}`
            : art
              ? `${n} ${art}`
              : `${n} (ohne Terz)`;

  return { grundton: root, art, sept, umkehrung, rollen, stufe, name, funktion: funktion(stufe, art, sept, key) };
}

const ROEMISCH = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Funktionsbezeichnung nach Riemann (vereinfacht); sonst die Stufe in römischen Ziffern */
function funktion(stufe: number, art: Akkordart | null, sept: Septart | null, key: KeySignature): string {
  const s7 = sept ? '⁷' : '';
  const dur = art === 'Dur';
  const moll = art === 'Moll';
  const roem = ROEMISCH[stufe - 1] + (art === 'vermindert' ? '°' : art === 'übermäßig' ? '+' : '') + s7;
  if (art === 'vermindert' && stufe === 7) return sept === 'verminderter Septakkord' ? 'D⁹ verkürzt' : 'D⁷ verkürzt';
  if (key.mode === 'major') {
    if (stufe === 1 && dur) return 'T' + (sept === 'Dominantseptakkord' ? '⁷' : '');
    if (stufe === 2 && moll) return 'Sp' + s7;
    if (stufe === 2 && dur) return 'DD' + s7;
    if (stufe === 3 && moll) return 'Dp' + s7;
    if (stufe === 4 && dur) return 'S' + (sept === 'großer Durseptakkord' ? '⁷' : '');
    if (stufe === 4 && moll) return 's';
    if (stufe === 5 && dur) return 'D' + s7;
    if (stufe === 6 && moll) return 'Tp' + s7;
    return roem;
  }
  if (stufe === 1 && moll) return 't';
  if (stufe === 3 && dur) return 'tP';
  if (stufe === 4 && moll) return 's' + s7;
  if (stufe === 4 && dur) return 'S';
  if (stufe === 5 && moll) return 'd';
  if (stufe === 5 && dur) return 'D' + s7;
  if (stufe === 6 && dur) return 'sP';
  if (stufe === 7 && dur) return 'dP';
  return roem;
}

/** Leitton der Tonart (in Moll die erhöhte 7. Stufe) */
export function leitton(key: KeySignature): { step: Step; pc: number } {
  const g = grundton(key);
  const step = STEPS[(STEPS.indexOf(g.step) + 6) % 7];
  const tonikaPc = pc({ step: g.step, alter: g.alter, octave: 4 });
  return { step, pc: (tonikaPc + 11) % 12 };
}

export function istLeitton(p: Pitch, key: KeySignature) {
  const l = leitton(key);
  return p.step === l.step && pc(p) === l.pc;
}

export { pc as tonklasse, diatonicIndex };
