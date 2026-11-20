import { rebar } from '../editor/rebar';
import { emptyDoc } from '../editor/state';
import { kpSatz } from '../kontrapunkt/kurzform';
import { parseNotenfolge } from '../lernpfad/kompakt';
import { diatonicIndex, fromDiatonic, germanKeyName } from '../model/pitch';
import type { Pitch, Score } from '../model/types';
import { grundton } from '../model/tonart';
import { analysiereForm, kadenzText } from '../satz/form';
import { pruefeKlaviersatz } from '../satz/klavier';
import type { Aufgabe, Stufe } from './aufgaben';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

interface Ton {
  /** Stufe relativ zum Grundton (0 = Grundton in der 4. Oktave) */
  s: number;
  d: string;
}

const RHYTHMEN: Record<3 | 4, string[][]> = {
  4: [['4', '4', '4', '4'], ['4.', '8', '4', '4'], ['8', '8', '4', '4', '4'], ['4', '8', '8', '4', '4'], ['2', '4', '4'], ['4', '4', '2']],
  3: [['4', '4', '4'], ['4.', '8', '4'], ['2', '4'], ['8', '8', '4', '4'], ['4', '8', '8', '4']],
};
const BEWEGT: Record<3 | 4, string[][]> = {
  4: [['8', '8', '8', '8', '4', '4'], ['8', '8', '8', '8', '8', '8', '4'], ['4', '8', '8', '8', '8', '4']],
  3: [['8', '8', '8', '8', '4'], ['8', '8', '8', '8', '8', '8']],
};
const SCHLUSS: Record<3 | 4, string[][]> = {
  4: [['2', '2'], ['4', '4', '2'], ['1']],
  3: [['2.'], ['4', '2']],
};

/** Zufallsweg in Schritten und kleinen Sprüngen; optional mit Zielton, der im Schritt erreicht wird */
function weg(rng: Rng, rhythmus: string[], start: number, ziel?: number): Ton[] {
  for (let versuch = 0; versuch < 200; versuch++) {
    const out: Ton[] = [];
    let s = start;
    for (let i = 0; i < rhythmus.length; i++) {
      if (i > 0 || versuch > 0) s += pick(rng, [-2, -1, -1, 1, 1, 2]);
      s = Math.max(-3, Math.min(9, s));
      out.push({ s, d: rhythmus[i] });
    }
    if (ziel === undefined) return out;
    const vorletzter = out.length > 1 ? out[out.length - 2].s : start;
    if (Math.abs(vorletzter - ziel) <= 2 && vorletzter !== ziel) {
      out[out.length - 1].s = ziel;
      return out;
    }
  }
  return rhythmus.map((d, i) => ({ s: i === rhythmus.length - 1 ? ziel! : ziel! + 1, d }));
}

const letzter = (takt: Ton[]) => takt[takt.length - 1].s;
const versetzt = (takt: Ton[], um: number) => takt.map((t) => ({ ...t, s: t.s + um }));

function alsScore(takte: Ton[][], fifths: number, beats: 3 | 4, titel: string): Score {
  const g = grundton({ fifths, mode: 'major' });
  const basis = diatonicIndex({ step: g.step, octave: 4 });
  const name = (p: Pitch) => `${p.step}${p.alter === 1 ? '#' : p.alter === -1 ? 'b' : ''}${p.octave}`;
  const text = takte.map((t) => t.map((x) => `${name(fromDiatonic(basis + x.s, fifths))}:${x.d}`).join(' ')).join(' | ');
  const doc = { ...emptyDoc(), title: titel, tempo: 100, key: { fifths, mode: 'major' as const }, time: { beats, beatType: 4 }, events: parseNotenfolge(text) };
  return rebar(doc).score;
}

export type FormName = 'Periode' | 'Satz' | 'Liedform (A B A)';
const ERKANNT: Record<FormName, string> = { Periode: 'Periode', Satz: 'Satz', 'Liedform (A B A)': 'Dreiteilige Liedform (A B A)' };

/** Erzeugt eine Melodie in der gewünschten Form (Rohfassung; geprüft wird in formAufgabe) */
export function formMelodie(rng: Rng, form: FormName, beats: 3 | 4): Ton[][] {
  const R = RHYTHMEN[beats];
  const r1 = pick(rng, R);
  const r2 = pick(rng, R);
  const a1 = weg(rng, r1, pick(rng, [0, 2, 4]));
  const a2 = weg(rng, r2, letzter(a1));
  const kadenz = (start: number, ziel: number) => weg(rng, pick(rng, SCHLUSS[beats]), start, ziel);
  if (form === 'Periode') {
    const b1 = weg(rng, pick(rng, R), letzter(a2));
    const hs = kadenz(letzter(b1), pick(rng, [1, 4]));
    const c1 = weg(rng, pick(rng, R), letzter(a2));
    const gs = kadenz(letzter(c1), pick(rng, [0, 7]));
    return [a1, a2, b1, hs, a1, a2, c1, gs];
  }
  if (form === 'Satz') {
    const um = pick(rng, [1, -1, 2]);
    const f1 = weg(rng, pick(rng, BEWEGT[beats]), letzter(a2) + um);
    const f2 = weg(rng, pick(rng, BEWEGT[beats]), letzter(f1));
    const x = weg(rng, pick(rng, R), letzter(f2));
    return [a1, a2, versetzt(a1, um), versetzt(a2, um), f1, f2, x, kadenz(letzter(x), pick(rng, [0, 7]))];
  }
  // Liedform: A (vier Takte mit Ganzschluss), B (Kontrast mit Halbschluss), A
  const x = weg(rng, pick(rng, R), letzter(a2));
  const A = [a1, a2, x, kadenz(letzter(x), 0)];
  const anders = R.filter((r) => r.join() !== r1.join());
  const b1 = weg(rng, pick(rng, BEWEGT[beats]), pick(rng, [4, 5]));
  const b2 = weg(rng, pick(rng, anders), letzter(b1));
  const b3 = weg(rng, pick(rng, BEWEGT[beats]), letzter(b2));
  const B = [b1, b2, b3, kadenz(letzter(b3), 4)];
  return [...A, ...B, ...A];
}

const FORM_ERKLAERUNG: Record<FormName, string> = {
  Periode: 'Eine Periode besteht aus Vordersatz und Nachsatz. Beide beginnen gleich; der Vordersatz endet offen (Halbschluss), der Nachsatz geschlossen (Ganzschluss). Wie Frage und Antwort.',
  Satz: 'Ein Satz stellt einen Zweitakter vor und wiederholt ihn gleich danach (oft versetzt). Dann folgt die Fortspinnung: kürzere Glieder, mehr Bewegung, und die Kadenz.',
  'Liedform (A B A)': 'In der dreiteiligen Liedform kehrt der Anfang nach einem kontrastierenden Mittelteil wieder: A B A.',
};

/** Form einer Melodie bestimmen: Periode, Satz oder Liedform */
export function formAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const formen: FormName[] = stufe === 1 ? ['Periode', 'Satz'] : ['Periode', 'Satz', 'Liedform (A B A)'];
  const form = pick(rng, formen);
  const fifths = pick(rng, [0, 1, -1, 2]);
  const beats = pick(rng, [3, 4] as const);
  let score: Score | null = null;
  for (let i = 0; i < 300 && !score; i++) {
    const s = alsScore(formMelodie(rng, form, beats), fifths, beats, 'Melodie');
    if (analysiereForm(s).form === ERKANNT[form]) score = s;
  }
  if (!score) return formAufgabe(rng, stufe);
  const a = analysiereForm(score);
  const glieder = a.glieder.map((g) => g.name).join(' ');
  return {
    typ: 'form-bestimmen',
    frage: `Welche Form hat diese Melodie in ${germanKeyName(score.key)}? Achte darauf, was sich wiederholt und wie die Abschnitte enden.`,
    satz: score,
    optionen: formen,
    loesung: form,
    erklaerung: `Zweitakter: ${glieder}. ${a.kadenzen.map(kadenzText).join(', ')}. ${FORM_ERKLAERUNG[form]}`,
    begriff: form === 'Periode' ? 'periode' : form === 'Satz' ? 'satz-form' : 'liedform',
  };
}

/* ---------- Begleitmuster ---------- */

export const BEGLEITMUSTER = ['Lange Bässe', 'Trommelbass', 'Alberti-Bass', 'Gebrochener Akkord', 'Walzerbass'] as const;
export type Begleitmuster = (typeof BEGLEITMUSTER)[number];

const MUSTER_TEXT: Record<Begleitmuster, string> = {
  'Lange Bässe': 'Nur der Grundton, lang ausgehalten. Ruhig und feierlich; die Melodie trägt alle Bewegung.',
  Trommelbass: 'Der Grundton in gleichmäßigen Achteln wiederholt. Das treibt nach vorn, typisch für schnelle Sätze der Klassik und später für Rock.',
  'Alberti-Bass': 'Grundton, Quinte, Terz, Quinte in Achteln (z. B. c–g–e–g). Benannt nach Domenico Alberti; Mozart und Haydn verwenden ihn ständig.',
  'Gebrochener Akkord': 'Die Akkordtöne nacheinander aufwärts (und wieder abwärts). Klingt fließend und lässt den Akkord ganz hören.',
  Walzerbass: 'Im 3/4-Takt: der Grundton auf der Eins, dann zweimal Akkordtöne darüber („um-pa-pa“). Typisch für Walzer und Menuett.',
};

/** Akkord-Grundtöne je Takt (Stufen ab dem Grundton) */
const FOLGEN = [
  [0, 3, 4, 0],
  [0, 5, 4, 0],
  [0, 1, 4, 0],
];

function begleitung(muster: Begleitmuster, wurzel: number, beats: 3 | 4): Ton[] {
  const r = wurzel - 7; // eine Oktave tiefer als die Melodie
  const r2 = r > -9 ? r - 7 : r; // Bass in der großen Oktave
  switch (muster) {
    case 'Lange Bässe':
      return [{ s: r2, d: beats === 4 ? '1' : '2.' }];
    case 'Trommelbass':
      return Array.from({ length: beats * 2 }, () => ({ s: r2, d: '8' }));
    case 'Alberti-Bass':
      return [r2, r2 + 4, r2 + 2, r2 + 4, r2, r2 + 4, r2 + 2, r2 + 4].slice(0, beats * 2).map((s) => ({ s, d: '8' }));
    case 'Gebrochener Akkord':
      return (beats === 4 ? [r2, r2 + 2, r2 + 4, r2 + 7, r2, r2 + 2, r2 + 4, r2 + 7] : [r2, r2 + 2, r2 + 4, r2 + 7, r2 + 4, r2 + 2]).map((s) => ({ s, d: '8' }));
    case 'Walzerbass':
      return [{ s: r2, d: '4' }, { s: r2 + 9, d: '4' }, { s: r2 + 11, d: '4' }];
  }
}

/** Begleitmuster erkennen: Klaviersatz mit Melodie und einer Begleitfigur */
export function begleitmusterAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  // Neu würfeln, bis der Satz fehlerfrei ist (keine Parallelen zwischen Melodie und Bass)
  for (let i = 0; i < 50; i++) {
    const a = begleitmusterVersuch(rng, stufe);
    if (pruefeKlaviersatz(a.satz!, { hinweise: false }).length === 0) return a;
  }
  return begleitmusterVersuch(rng, stufe);
}

function begleitmusterVersuch(rng: Rng, stufe: Stufe): Aufgabe {
  const beats = stufe === 1 ? 4 : pick(rng, [3, 4] as const);
  const moegliche: Begleitmuster[] = beats === 4 ? ['Lange Bässe', 'Trommelbass', 'Alberti-Bass', 'Gebrochener Akkord'] : ['Lange Bässe', 'Walzerbass', 'Gebrochener Akkord'];
  const muster = pick(rng, moegliche);
  const fifths = pick(rng, [0, 1, -1]);
  const folge = pick(rng, FOLGEN);
  // Melodie: Akkordtöne in halben (4/4) bzw. punktierten halben Noten, Schluss auf dem Grundton
  let vorher = 4;
  const melodie: Ton[][] = folge.map((w, i) => {
    // Terz und Quinte des Akkords, damit keine Oktaven mit dem Bass entstehen
    const toene = [w + 2, w + 4, w + 9, w + 11, w - 3, w - 5].filter((s) => s >= 0 && s <= 9);
    const ziel = i === folge.length - 1 && w === 0 ? (vorher > 4 ? 7 : 0) : toene.sort((a, b) => Math.abs(a - vorher) - Math.abs(b - vorher))[Math.floor(rng() * 2)];
    vorher = ziel;
    return beats === 4 ? [{ s: ziel, d: '2' }, { s: ziel + (i === folge.length - 1 ? 0 : pick(rng, [-1, 1, 2])), d: '2' }] : [{ s: ziel, d: '2.' }];
  });
  // Die zweite Halbe muss ein Akkordton sein oder im Schritt weitergehen; einfach den Akkordton wiederholen, wenn nötig
  melodie.forEach((t, i) => {
    if (t.length > 1 && ![0, 2, 4].includes((((t[1].s - folge[i]) % 7) + 7) % 7)) t[1].s = t[0].s;
  });
  const g = grundton({ fifths, mode: 'major' });
  const basis = diatonicIndex({ step: g.step, octave: 4 });
  const name = (s: number) => {
    const p = fromDiatonic(basis + s, fifths);
    return `${p.step}${p.alter === 1 ? '#' : p.alter === -1 ? 'b' : ''}${p.octave}`;
  };
  const kurz = (takte: Ton[][]) => takte.map((t) => t.map((x) => `${name(x.s)}:${x.d}`).join(' ')).join(' | ');
  const satz = kpSatz({
    titel: 'Klaviersatz',
    tonart: String(fifths),
    takt: `${beats}/4`,
    tempo: 92,
    oben: kurz(melodie),
    unten: kurz(folge.map((w) => begleitung(muster, w, beats))),
    namen: ['Melodie', 'Begleitung'],
    schluessel: ['treble', 'bass'],
  });
  return {
    typ: 'begleitmuster-bestimmen',
    frage: 'Welches Begleitmuster spielt die linke Hand?',
    satz,
    optionen: moegliche,
    loesung: muster,
    erklaerung: MUSTER_TEXT[muster],
    begriff: 'begleitmuster',
  };
}
