import { diatonicIndex, germanName, keyAlter, toMidi } from '../model/pitch';
import type { KeySignature, Pitch, Step } from '../model/types';
import { grundton } from '../model/tonart';

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
  /** Rolle jedes Tons: 1 = Grundton, 3 = Terz, 5 = Quinte, 7 = Septime, 9 = None (null bei Pausen) */
  rollen: (Rolle | null)[];
  /** None über der Septime: groß (D⁹) oder klein (D⁹>) */
  none?: 'groß' | 'klein';
  /** Alterierte Akkorde: Neapolitaner, übermäßige Sextakkorde, Zwischendominanten, Medianten */
  alteriert?: 'neapolitaner' | 'uebermaessig' | 'zwischendominante' | 'mediante';
  /** Stufe in der Tonart, 1–7 */
  stufe: number;
  /** z. B. „C-Dur“, „G⁷“, „H vermindert“ */
  name: string;
  /** Funktion, z. B. „T“, „S“, „D⁷“, „Tp“ */
  funktion: string;
}

export type Rolle = 1 | 3 | 5 | 7 | 9;

const pc = (p: Pitch) => ((toMidi(p) % 12) + 12) % 12;
/** Wie weit ist der Ton gegenüber der Tonleiter alteriert? (−1 = tiefalteriert) */
const alteration = (p: Pitch, key: KeySignature) => (p.alter ?? 0) - keyAlter(p.step, key.fifths);

/**
 * Übermäßiger Sextakkord: über dem Bass liegt eine übermäßige Sexte (z. B. As–Fis in C-Dur).
 * Italienisch: Bass, Terz, Sexte; deutsch: dazu die Quinte; französisch: dazu die Quarte.
 */
function uebermaessigerSextakkord(toene: (Pitch | null)[], bass: Pitch, key: KeySignature): Akkord | null {
  const klingend = toene.filter((p): p is Pitch => !!p);
  const sexte = klingend.find((p) => (((diatonicIndex(p) - diatonicIndex(bass)) % 7) + 7) % 7 === 5 && (((pc(p) - pc(bass)) % 12) + 12) % 12 === 10);
  if (!sexte) return null;
  const rel = new Set(klingend.map((p) => (((pc(p) - pc(bass)) % 12) + 12) % 12));
  if (![...rel].every((x) => [0, 4, 6, 7, 10].includes(x)) || !rel.has(4)) return null;
  const typ = rel.has(7) ? 'deutscher' : rel.has(6) ? 'französischer' : 'italienischer';
  const rollen = toene.map((p) => {
    if (!p) return null;
    const d = (((pc(p) - pc(bass)) % 12) + 12) % 12;
    // Gedacht als Doppeldominante mit tiefalterierter Quinte im Bass: in C-Dur D–Fis–As–C (–Es)
    return (d === 0 ? 5 : d === 4 ? 7 : d === 6 ? 1 : d === 7 ? 9 : 3) as Rolle;
  });
  const rootStep = STEPS[(STEPS.indexOf(sexte.step) + 5) % 7];
  const rootPc = (pc(sexte) + 8) % 12;
  const natur = pc({ step: rootStep, octave: 4 });
  const grundTon: Pitch = { step: rootStep, octave: sexte.octave, ...(((rootPc - natur + 18) % 12) - 6 ? { alter: ((rootPc - natur + 18) % 12) - 6 } : {}) };
  const g = grundton(key);
  const stufe = ((((STEPS.indexOf(bass.step) - STEPS.indexOf(g.step)) % 7) + 7) % 7) + 1;
  return {
    grundton: grundTon,
    art: null,
    sept: typ === 'italienischer' ? null : 'Septakkord',
    umkehrung: 0,
    rollen,
    stufe,
    name: `${typ[0].toUpperCase()}${typ.slice(1)} Sextakkord`,
    funktion: typ === 'italienischer' ? 'DD>' : 'DD⁷>',
    alteriert: 'uebermaessig',
  };
}

/**
 * Erkennt einen Dreiklang oder Septakkord aus den klingenden Tönen (tiefster Ton = Bass).
 * Gesucht wird der Grundton, über dem alle Töne als Terzen geschichtet sind.
 */
export function erkenneAkkord(toene: (Pitch | null)[], key: KeySignature): Akkord | null {
  const klingend = toene.filter((p): p is Pitch => !!p);
  if (klingend.length < 2) return null;
  const bass = klingend.reduce((a, b) => (toMidi(b) < toMidi(a) ? b : a));
  const ueber = uebermaessigerSextakkord(toene, bass, key);
  if (ueber) return ueber;

  let best: { root: Pitch; rollen: (Rolle | null)[]; punkte: number } | null = null;
  for (const root of klingend) {
    const rollen = toene.map((p) => {
      if (!p) return null;
      const d = (((STEPS.indexOf(p.step) - STEPS.indexOf(root.step)) % 7) + 7) % 7;
      return d === 0 ? 1 : d === 2 ? 3 : d === 4 ? 5 : d === 6 ? 7 : d === 1 ? 9 : -1;
    });
    if (rollen.some((r) => r === -1)) continue;
    // Eine None nur im Septakkord (Dominantnonakkord), sonst ist sie Vorhalt oder Durchgang; nie im Bass
    if (rollen.includes(9) && (!rollen.includes(7) || !rollen.includes(3) || rollen[toene.indexOf(bass)] === 9)) continue;
    const r = rollen as (Rolle | null)[];
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
  const nn = abst(ton(9));
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

  const none = nn === 2 ? 'groß' : nn === 1 ? 'klein' : undefined;
  const bassRolle = rollen[toene.indexOf(bass)] ?? 1;
  const umkehrung = bassRolle === 1 ? 0 : bassRolle === 3 ? 1 : bassRolle === 5 ? 2 : 3;
  const g = grundton(key);
  const stufe = ((((STEPS.indexOf(root.step) - STEPS.indexOf(g.step)) % 7) + 7) % 7) + 1;
  const tief = alteration(root, key) < 0;

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

  const nonName = none ? ` mit ${none === 'klein' ? 'kleiner' : 'großer'} None` : '';
  const basis = { grundton: root, art, sept, umkehrung, rollen, stufe, name: name + nonName, funktion: funktion(stufe, art, sept, key) };
  // Dominantnonakkord
  if (none && sept === 'Dominantseptakkord') return { ...basis, none, funktion: basis.funktion.replace('⁷', none === 'klein' ? '⁹>' : '⁹') };
  const alt = alteriert(stufe, art, sept, tief, root, key);
  return alt ? { ...basis, ...alt, ...(none ? { none } : {}) } : { ...basis, ...(none ? { none } : {}) };
}

/**
 * Leiterfremde Akkorde der Romantik: Neapolitaner (sN), Zwischendominanten (D) und
 * Medianten aus der gleichnamigen Molltonart (tP, tG in Dur).
 */
function alteriert(stufe: number, art: Akkordart | null, sept: Septart | null, tief: boolean, root: Pitch, key: KeySignature): Pick<Akkord, 'funktion' | 'alteriert'> | null {
  const dur = art === 'Dur';
  const s7 = sept === 'Dominantseptakkord' ? '⁷' : '';
  if (stufe === 2 && dur && tief && !sept) return { funktion: 'sN', alteriert: 'neapolitaner' };
  if (key.mode === 'major') {
    if (dur && tief && stufe === 3) return { funktion: 'tP', alteriert: 'mediante' };
    if (dur && tief && stufe === 6) return { funktion: 'sP', alteriert: 'mediante' };
    if (dur && tief && stufe === 7) return { funktion: 'dP', alteriert: 'mediante' };
    if (tief) return null;
    // Zwischendominanten: Dur- oder Dominantseptakkord vor einer leitereigenen Stufe (außer T → S ohne Septime, D und DD)
    const ziel: Record<number, string> = { 1: 'S', 3: 'Tp', 6: 'Sp', 7: 'Dp' };
    if (dur && ziel[stufe] && (stufe !== 1 || sept === 'Dominantseptakkord') && (sept === null || sept === 'Dominantseptakkord'))
      return { funktion: `(D${s7})${ziel[stufe]}`, alteriert: 'zwischendominante' };
    return null;
  }
  // Moll: Zwischendominante zur Subdominante (Tonika mit kleiner Septime) und zur Parallele
  if (dur && stufe === 1 && sept === 'Dominantseptakkord') return { funktion: '(D⁷)s', alteriert: 'zwischendominante' };
  if (dur && stufe === 7 && sept === 'Dominantseptakkord' && alteration(root, key) === 0) return { funktion: '(D⁷)tP', alteriert: 'zwischendominante' };
  return null;
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
  if (stufe === 1 && dur) return 'T'; // pikardische Terz
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
