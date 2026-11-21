import { germanName, toMidi } from '../model/pitch';
import type { Pitch, Step } from '../model/types';

/**
 * Akkordsymbole wie in Leadsheets (Real Book, MuseScore): internationale Tonbuchstaben,
 * also B = deutsches H und Bb = deutsches B. Beispiele: C, Cm, C7, Cmaj7, CΔ, Dm7, F#ø7,
 * Bb7#11, G7b9, Am7b5, Cdim7, C+, Csus4, C6/9, C/E.
 */

/** Ein Ton des Akkords: Stufe über dem Grundton (1, 3, 5, 7, 9 …) und Abstand in Halbtönen */
export interface AkkordTon {
  stufe: number;
  halb: number;
}

export type Geschlecht = 'dur' | 'moll' | 'vermindert' | 'uebermaessig' | 'sus4' | 'sus2';

export interface AkkordSymbol {
  /** Das Symbol, wie es geschrieben wurde (ohne Leerzeichen) */
  text: string;
  grund: { step: Step; alter: number };
  bass?: { step: Step; alter: number };
  geschlecht: Geschlecht;
  /** 'klein' (7), 'gross' (maj7), 'vermindert' (dim7) oder keine */
  septime?: 'klein' | 'gross' | 'vermindert';
  /** Alle Töne von unten nach oben (Grundton zuerst), ohne Doppelungen */
  toene: AkkordTon[];
}

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const STAMM: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function liesTon(s: string): { step: Step; alter: number; rest: string } | null {
  const m = /^([A-G])(##|bb|#|b|♯|♭)?/.exec(s);
  if (!m) return null;
  const a = m[2] ?? '';
  const alter = a === '#' || a === '♯' ? 1 : a === 'b' || a === '♭' ? -1 : a === '##' ? 2 : a === 'bb' ? -2 : 0;
  return { step: m[1] as Step, alter, rest: s.slice(m[0].length) };
}

/** Liest ein Akkordsymbol; null, wenn es keins ist */
export function parseAkkordsymbol(eingabe: string): AkkordSymbol | null {
  const text = eingabe.replace(/\s+/g, '');
  if (!text) return null;
  const [haupt, bassText, ...zuviel] = text.split('/');
  if (zuviel.length) {
    // „C6/9“ ist kein Slash-Akkord
    if (!(bassText === '9' || /^9/.test(bassText))) return null;
  }
  let hauptText = haupt;
  let slash = bassText;
  if (slash !== undefined && /^\d/.test(slash)) {
    hauptText = `${haupt}/${slash}`;
    slash = zuviel[0];
  }
  const g = liesTon(hauptText);
  if (!g) return null;
  let bass: AkkordSymbol['bass'];
  if (slash !== undefined) {
    const b = liesTon(slash);
    if (!b || b.rest) return null;
    bass = { step: b.step, alter: b.alter };
  }

  let r = g.rest
    .replace(/Δ/g, 'maj')
    .replace(/^M(?=7|9|13|aj)/, 'maj')
    .replace(/^(min|mi|-)/, 'm')
    .replace(/ø7?/g, 'm7b5')
    .replace(/[°o](?=7|$)/, 'dim')
    .replace(/[()]/g, '')
    .replace(/,/g, '');

  let geschlecht: Geschlecht = 'dur';
  let septime: AkkordSymbol['septime'];
  const toene = new Map<number, number>([
    [1, 0],
    [3, 4],
    [5, 7],
  ]);
  const setze = (stufe: number, halb: number) => toene.set(stufe, halb);

  // Geschlecht
  if (/^m(?!aj)/.test(r)) {
    geschlecht = 'moll';
    setze(3, 3);
    r = r.slice(1);
  } else if (/^dim/.test(r)) {
    geschlecht = 'vermindert';
    setze(3, 3);
    setze(5, 6);
    r = r.slice(3);
  } else if (/^(aug|\+)/.test(r)) {
    geschlecht = 'uebermaessig';
    setze(5, 8);
    r = r.replace(/^(aug|\+)/, '');
  }

  // Sexte, Septime, Optionen
  const sept = (art: 'klein' | 'gross') => {
    if (geschlecht === 'vermindert' && art === 'klein') {
      septime = 'vermindert';
      setze(7, 9);
    } else {
      septime = art;
      setze(7, art === 'gross' ? 11 : 10);
    }
  };
  const kopf = /^(maj13|maj11|maj9|maj7|maj|69|6\/9|6|13|11|9|7)/.exec(r);
  if (kopf) {
    const k = kopf[1];
    r = r.slice(k.length);
    if (k.startsWith('maj')) {
      sept('gross');
      if (k === 'maj9') setze(9, 14);
      if (k === 'maj11') (setze(9, 14), setze(11, 17));
      if (k === 'maj13') (setze(9, 14), setze(13, 21));
    } else if (k === '6') setze(6, 9);
    else if (k === '69' || k === '6/9') (setze(6, 9), setze(9, 14));
    else {
      sept('klein');
      if (k === '9') setze(9, 14);
      if (k === '11') (setze(9, 14), setze(11, 17));
      if (k === '13') (setze(9, 14), setze(13, 21));
    }
  }
  // Moll mit großer Septime: Cm(maj7) → „mmaj7“ wurde oben schon als moll + maj7 gelesen
  while (r.length) {
    let m: RegExpExecArray | null;
    if ((m = /^sus(4|2)?/.exec(r))) {
      const zwei = m[1] === '2';
      toene.delete(3);
      setze(zwei ? 2 : 4, zwei ? 2 : 5);
      geschlecht = zwei ? 'sus2' : 'sus4';
    } else if ((m = /^add(2|4|9|11|13)/.exec(r))) {
      const s = Number(m[1]);
      setze(s, { 2: 2, 4: 5, 9: 14, 11: 17, 13: 21 }[s]!);
    } else if ((m = /^alt/.exec(r))) {
      if (!septime) sept('klein');
      toene.delete(5);
      setze(9, 13);
      setze(10, 15);
      setze(11, 18);
      setze(13, 20);
    } else if ((m = /^(b|#|♭|♯)(5|9|11|13)/.exec(r))) {
      const hoch = m[1] === '#' || m[1] === '♯';
      const s = Number(m[2]);
      if (s === 5) {
        setze(5, hoch ? 8 : 6);
        if (geschlecht === 'moll' && !hoch && septime === 'klein') geschlecht = 'vermindert';
      } else if (s === 9) {
        if (!septime) sept('klein');
        if (hoch) setze(10, 15);
        else setze(9, 13);
      } else if (s === 11) {
        if (!septime) sept('klein');
        setze(11, hoch ? 18 : 16);
      } else {
        if (!septime) sept('klein');
        setze(13, hoch ? 22 : 20);
      }
    } else if ((m = /^(9|11|13)/.exec(r))) {
      const s = Number(m[1]);
      setze(s, { 9: 14, 11: 17, 13: 21 }[s]!);
    } else if ((m = /^(maj7|maj)/.exec(r))) {
      sept('gross');
    } else if ((m = /^7/.exec(r))) {
      sept('klein');
    } else return null;
    r = r.slice(m[0].length);
  }
  // m7b5: halbvermindert, Geschlecht „vermindert“, Septime klein
  if (geschlecht === 'vermindert' && septime === 'klein') setze(7, 10);

  const liste = [...toene.entries()].map(([stufe, halb]) => ({ stufe: stufe === 10 ? 9 : stufe, halb })).sort((a, b) => a.halb - b.halb);
  return { text, grund: { step: g.step, alter: g.alter }, ...(bass ? { bass } : {}), geschlecht, ...(septime ? { septime } : {}), toene: liste };
}

export const istAkkordsymbol = (s: string) => parseAkkordsymbol(s) !== null;

/** Tonklasse 0–11 des Grundtons */
export const grundPc = (a: AkkordSymbol) => (((STAMM[a.grund.step] + a.grund.alter) % 12) + 12) % 12;

/** Der Ton auf einer Stufe über dem Grundton, richtig geschrieben (Terz von E ist Gis, nicht As) */
export function tonUeber(grund: { step: Step; alter: number }, oktave: number, t: AkkordTon): Pitch {
  const gi = STEPS.indexOf(grund.step);
  const schritte = t.stufe - 1;
  const zi = gi + schritte;
  const step = STEPS[zi % 7];
  const okt = oktave + Math.floor(zi / 7);
  const soll = STAMM[grund.step] + grund.alter + t.halb + 12 * oktave;
  const ohne = STAMM[step] + 12 * okt;
  const alter = soll - ohne;
  // Doppelkreuz und Doppel-b vermeiden, wie im Leadsheet üblich (E7#9 klingt mit g, nicht fisis)
  if (Math.abs(alter) >= 2) {
    const zj = zi + Math.sign(alter);
    const s2 = STEPS[((zj % 7) + 7) % 7];
    const o2 = oktave + Math.floor(zj / 7);
    return { step: s2, alter: soll - (STAMM[s2] + 12 * o2), octave: o2 };
  }
  return { step, alter, octave: okt };
}

/** Alle Töne des Akkords in enger Lage ab dem Grundton in der gegebenen Oktave */
export function akkordToene(a: AkkordSymbol, oktave = 3): Pitch[] {
  return a.toene.map((t) => tonUeber(a.grund, oktave, t));
}

/** Tonklassen des Akkords (0–11) */
export function akkordPcs(a: AkkordSymbol): number[] {
  return [...new Set(a.toene.map((t) => (grundPc(a) + t.halb) % 12))];
}

/**
 * Einfaches Begleit-Voicing für die Wiedergabe: Grundton (oder Slash-Bass) tief,
 * darüber Terz, Septime (bzw. Quinte/Sexte) und eine Option, zwischen e und e′.
 */
export function begleitVoicing(a: AkkordSymbol): Pitch[] {
  const bassTon = a.bass ?? a.grund;
  let bass = tonUeber(bassTon, 2, { stufe: 1, halb: 0 });
  if (toMidi(bass) < 40) bass = { ...bass, octave: bass.octave + 1 };
  const wichtig = a.toene.filter((t) => t.stufe !== 1 && !(t.stufe === 5 && t.halb === 7 && a.toene.length > 4));
  const oben = wichtig.map((t) => {
    let p = tonUeber(a.grund, 3, t);
    while (toMidi(p) < 52) p = { ...p, octave: p.octave + 1 };
    while (toMidi(p) > 67) p = { ...p, octave: p.octave - 1 };
    return p;
  });
  const gesehen = new Set<number>();
  return [bass, ...oben.filter((p) => !gesehen.has(toMidi(p)) && gesehen.add(toMidi(p)))].sort((x, y) => toMidi(x) - toMidi(y));
}

/** Deutsche Beschreibung, z. B. „Dm7: d-Moll mit kleiner Septime (d f a c)“ */
export function akkordBeschreibung(a: AkkordSymbol): string {
  const g = germanName({ ...a.grund, octave: 4 });
  const gross = g.charAt(0).toUpperCase() + g.slice(1);
  const klein = g.toLowerCase();
  const art: Record<Geschlecht, string> = {
    dur: `${gross}-Dur`,
    moll: `${klein}-Moll`,
    vermindert: a.septime === 'klein' ? `${klein} halbvermindert` : `${klein} vermindert`,
    uebermaessig: `${gross} übermäßig`,
    sus4: `${gross} mit Quarte statt Terz`,
    sus2: `${gross} mit Sekunde statt Terz`,
  };
  const zusatz = a.septime === 'gross' ? ' mit großer Septime' : a.septime === 'klein' && a.geschlecht !== 'vermindert' ? ' mit kleiner Septime' : a.septime === 'vermindert' ? ' mit verminderter Septime' : '';
  const namen = akkordToene(a, 4).map((p) => germanName(p).toLowerCase());
  const bass = a.bass ? `, ${germanName({ ...a.bass, octave: 3 })} im Bass` : '';
  return `${a.text}: ${art[a.geschlecht]}${zusatz}${bass} (${namen.join(' ')})`;
}
