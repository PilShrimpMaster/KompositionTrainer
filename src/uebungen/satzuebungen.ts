import { diatonicIndex, fromDiatonic, germanKeyName, germanName, keyAlter, toMidi, toToneName } from '../model/pitch';
import type { KeySignature, Pitch, Score } from '../model/types';
import { parsePitch } from '../lexikon/parse';
import { satz } from '../satz/kurzform';
import { UMFANG } from '../satz/regeln';
import type { Aufgabe, Stufe } from './aufgaben';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Dur-Tonarten für Satzübungen und die Verschiebung ihres Grundtons gegenüber C (in Stufen) */
export const SATZ_TONARTEN: { fifths: number; stufen: number }[] = [
  { fifths: 0, stufen: 0 },
  { fifths: 1, stufen: -3 },
  { fifths: -1, stufen: 3 },
  { fifths: 2, stufen: 1 },
  { fifths: -2, stufen: -1 },
];

/** Verschiebt einen Ton aus C-Dur in eine andere Dur-Tonart; chromatische Vorzeichen wandern mit */
export function transponiere(p: Pitch, stufen: number, fifths: number): Pitch {
  const z = fromDiatonic(diatonicIndex(p) + stufen, fifths);
  const alter = keyAlter(z.step, fifths) + (p.alter ?? 0);
  return alter ? { ...z, alter } : { step: z.step, octave: z.octave };
}

/**
 * Transponiert Akkorde (aus C-Dur) in eine Tonart, je nach Lage eine Oktave höher oder tiefer,
 * sodass alle Stimmen im Umfang bleiben. Gibt null zurück, wenn das nicht geht.
 */
export function inTonart(akkorde: string[], t: { fifths: number; stufen: number }): Pitch[][] | null {
  const roh = akkorde.map((a) => akk(a));
  for (const k of [t.stufen, t.stufen + 7, t.stufen - 7].sort((a, b) => Math.abs(a) - Math.abs(b))) {
    const neu = roh.map((a) => a.map((p) => transponiere(p, k, t.fifths)));
    if (neu.every((a) => a.every((p, i) => toMidi(p) >= UMFANG[i][0] && toMidi(p) <= UMFANG[i][1]))) return neu;
  }
  return null;
}

/** Ein Akkord als „S A T B“ in C-Dur */
const akk = (s: string) => s.split(' ').map(parsePitch);

const kurz = (toene: Pitch[]) => toene.map((p) => `${toToneName(p)}:2`).join(' ');

/** Baut aus Akkorden (je Sopran, Alt, Tenor, Bass) einen Satz in halben Noten */
export function akkordSatz(akkorde: Pitch[][], key: KeySignature, titel = ''): Score {
  const stimme = (i: number) => kurz(akkorde.map((a) => a[i]));
  return satz({
    titel,
    tonart: `${key.fifths}`,
    takt: `${akkorde.length * 2}/4`,
    tempo: 60,
    stimmen: [stimme(0), stimme(1), stimme(2), stimme(3)],
  });
}

// ---------- Satzfehler finden ----------

export type Satzfehler = 'Quintparallele' | 'Oktavparallele' | 'Leitton nicht aufgelöst' | 'Kein Fehler';
export const SATZFEHLER: Satzfehler[] = ['Quintparallele', 'Oktavparallele', 'Leitton nicht aufgelöst', 'Kein Fehler'];

/** Zwei Akkorde in C-Dur (Sopran, Alt, Tenor, Bass) mit genau einem bekannten Fehler oder keinem */
export const FEHLER_VORLAGEN: { fehler: Satzfehler; akkorde: [string, string]; erklaerung: string }[] = [
  { fehler: 'Kein Fehler', akkorde: ['E4 C4 G3 C3', 'F4 C4 A3 F3'], erklaerung: 'Der gemeinsame Ton bleibt im Alt liegen, die anderen Oberstimmen gehen auf kürzestem Weg weiter.' },
  { fehler: 'Kein Fehler', akkorde: ['E4 C4 G3 C3', 'D4 B3 G3 G2'], erklaerung: 'Der gemeinsame Ton bleibt im Tenor liegen, Sopran und Alt gehen schrittweise abwärts.' },
  { fehler: 'Kein Fehler', akkorde: ['B4 G4 D4 G3', 'C5 G4 E4 C3'], erklaerung: 'Der Leitton im Sopran geht aufwärts zum Grundton, der Bass springt in Gegenbewegung.' },
  { fehler: 'Kein Fehler', akkorde: ['A4 F4 C4 F3', 'G4 D4 B3 G3'], erklaerung: 'Ohne gemeinsamen Ton gehen die Oberstimmen in Gegenbewegung zum Bass. So entstehen keine Parallelen.' },
  { fehler: 'Quintparallele', akkorde: ['B4 G4 D4 G2', 'C5 E4 E4 A2'], erklaerung: 'Bass und Tenor bilden zweimal hintereinander eine Quinte (über die Oktave hinweg) und gehen dabei in dieselbe Richtung.' },
  { fehler: 'Quintparallele', akkorde: ['E5 G4 C4 C3', 'D5 A4 F4 D3'], erklaerung: 'Bass und Alt gehen beide einen Schritt aufwärts und bleiben dabei im Quintabstand.' },
  { fehler: 'Oktavparallele', akkorde: ['C5 G4 E4 C3', 'F5 A4 C4 F3'], erklaerung: 'Sopran und Bass laufen in Oktaven parallel von C nach F.' },
  { fehler: 'Oktavparallele', akkorde: ['B4 D4 G3 G2', 'C5 E4 C4 C3'], erklaerung: 'Tenor und Bass gehen in Oktaven von G nach C.' },
  { fehler: 'Leitton nicht aufgelöst', akkorde: ['B4 G4 D4 G3', 'G4 E4 E4 C4'], erklaerung: 'Der Leitton im Sopran fällt, statt einen Halbton aufwärts zum Grundton zu gehen.' },
];

export function satzfehlerAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const v = pick(rng, FEHLER_VORLAGEN);
  const moeglich = (stufe === 1 ? SATZ_TONARTEN.slice(0, 1) : stufe === 2 ? SATZ_TONARTEN.slice(0, 3) : SATZ_TONARTEN).filter((t) => inTonart(v.akkorde, t));
  const t = moeglich.length ? pick(rng, moeglich) : SATZ_TONARTEN[0];
  const key: KeySignature = { fifths: t.fifths, mode: 'major' };
  const akkorde = inTonart(v.akkorde, t)!;
  return {
    typ: 'satzfehler-finden',
    frage: `Welcher Fehler steckt in dieser Akkordverbindung (${germanKeyName(key)})?`,
    satz: akkordSatz(akkorde, key),
    klang: { art: 'zusammen', toene: akkorde[0], folge: akkorde },
    optionen: SATZFEHLER,
    loesung: v.fehler,
    erklaerung: v.erklaerung,
    begriff: v.fehler === 'Leitton nicht aufgelöst' ? 'leitton' : v.fehler === 'Kein Fehler' ? 'akkordverbindung' : 'quintparallele',
  };
}

// ---------- Kadenzen hören ----------

export type Schluss = 'Ganzschluss' | 'Halbschluss' | 'Trugschluss' | 'Plagalschluss';

const T = 'G4 E4 C4 C3';
const S = 'A4 F4 C4 F3';
const D = 'G4 D4 B3 G3';
export const SCHLUESSE: Record<Schluss, { akkorde: string[]; erklaerung: string; begriff: string }> = {
  Ganzschluss: { akkorde: [T, S, D, T], erklaerung: 'T – S – D – T: Die Dominante löst sich in die Tonika auf. Das klingt abgeschlossen.', begriff: 'kadenz' },
  Halbschluss: { akkorde: [T, 'A4 E4 C4 A2', 'A4 F4 C4 F2', 'G4 D4 B3 G2'], erklaerung: 'T – Tp – S – D: Die Folge endet auf der Dominante und bleibt offen wie eine Frage.', begriff: 'halbschluss' },
  Trugschluss: { akkorde: [T, S, D, 'E4 C4 C4 A3'], erklaerung: 'T – S – D – Tp: Statt der Tonika kommt nach der Dominante a-Moll, die Tonikaparallele.', begriff: 'trugschluss' },
  Plagalschluss: { akkorde: [T, 'G4 D4 B3 G2', T, S, T], erklaerung: 'Zum Schluss geht die Subdominante in die Tonika, wie beim „Amen“ in der Kirche.', begriff: 'kadenz' },
};

export function kadenzAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const arten = (stufe === 1 ? ['Ganzschluss', 'Halbschluss'] : stufe === 2 ? ['Ganzschluss', 'Halbschluss', 'Trugschluss'] : Object.keys(SCHLUESSE)) as Schluss[];
  const loesung = pick(rng, arten);
  const t = stufe === 3 ? pick(rng, SATZ_TONARTEN) : SATZ_TONARTEN[0];
  const folge = inTonart(SCHLUESSE[loesung].akkorde, t) ?? inTonart(SCHLUESSE[loesung].akkorde, SATZ_TONARTEN[0])!;
  return {
    typ: 'kadenz-hoeren',
    frage: 'Hör dir die Akkordfolge an. Wie endet sie?',
    klang: { art: 'zusammen', toene: folge[0], folge },
    optionen: arten,
    loesung,
    erklaerung: SCHLUESSE[loesung].erklaerung,
    begriff: SCHLUESSE[loesung].begriff,
  };
}

// ---------- Funktionen bestimmen ----------

const FUNKTIONEN: { name: string; stufe: number; septime?: boolean; terzHoch?: boolean }[] = [
  { name: 'T', stufe: 1 },
  { name: 'S', stufe: 4 },
  { name: 'D', stufe: 5 },
  { name: 'Tp', stufe: 6 },
  { name: 'Sp', stufe: 2 },
  { name: 'Dp', stufe: 3 },
  { name: 'D⁷', stufe: 5, septime: true },
  { name: 'DD', stufe: 2, terzHoch: true },
];

export function funktionAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const auswahl = FUNKTIONEN.slice(0, stufe === 1 ? 3 : stufe === 2 ? 6 : 8);
  const f = pick(rng, auswahl);
  const fifths = stufe === 1 ? pick(rng, [0, 1, -1]) : pick(rng, [-3, -2, -1, 0, 1, 2, 3]);
  const key: KeySignature = { fifths, mode: 'major' };
  // Grundton der Tonart zwischen c′ und h′
  const tonika = ((fifths * 4) % 7 + 7) % 7;
  const g = diatonicIndex({ step: 'C', octave: 4 }) + tonika + f.stufe - 1;
  const toene = [0, 2, 4, ...(f.septime ? [6] : [])].map((d, i) => {
    const p = fromDiatonic(g + d, fifths);
    return i === 1 && f.terzHoch ? { ...p, alter: (p.alter ?? 0) + 1 } : p;
  });
  const optionen = shuffle(rng, auswahl.map((x) => x.name)).slice(0, 4);
  if (!optionen.includes(f.name)) optionen[Math.floor(rng() * optionen.length)] = f.name;
  return {
    typ: 'funktion-bestimmen',
    frage: `Welche Funktion hat dieser Akkord in ${germanKeyName(key)}?`,
    noten: { clef: 'treble', key, groups: [toene] },
    klang: { art: 'zusammen', toene },
    optionen,
    loesung: f.name,
    erklaerung: `${toene.map(germanName).join('–')} steht auf der ${f.stufe}. Stufe von ${germanKeyName(key)}${
      f.terzHoch ? ' mit erhöhter Terz, also als Dur-Akkord: die Dominante der Dominante' : f.septime ? ' mit kleiner Septime' : ''
    }. Das ist ${f.name}.`,
    begriff: f.name === 'DD' ? 'doppeldominante' : f.name === 'D⁷' ? 'dominantseptakkord' : f.name.endsWith('p') ? 'parallelklang' : 'funktionstheorie',
  };
}

// ---------- Umkehrungen bestimmen ----------

const STELLUNGEN = ['Grundstellung', 'Sextakkord', 'Quartsextakkord'] as const;

export function umkehrungAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const fifths = stufe === 1 ? 0 : pick(rng, [-2, -1, 0, 1, 2]);
  const key: KeySignature = { fifths, mode: 'major' };
  const stufeImTon = pick(rng, [1, 2, 4, 5, 6]);
  const tonika = ((fifths * 4) % 7 + 7) % 7;
  const g = diatonicIndex({ step: 'C', octave: 3 }) + tonika + stufeImTon - 1;
  const welche = Math.floor(rng() * 3);
  // Bass eine Oktave unter den Oberstimmen; die Oberstimmen in enger Lage darüber
  const rollen = [0, 2, 4];
  const bassRolle = rollen[welche];
  const oben = rollen.map((r) => g + 7 + r + (r < bassRolle ? 7 : 0)).sort((a, b) => a - b);
  const toene = [g + bassRolle, ...oben].map((d) => fromDiatonic(d, fifths));
  const clef = stufe === 3 ? 'bass' : 'treble';
  const gesetzt = clef === 'treble' ? toene.map((p) => ({ ...p, octave: p.octave + 1 })) : toene;
  return {
    typ: 'umkehrung-bestimmen',
    frage: `In welcher Stellung steht dieser Akkord? (${germanKeyName(key)})`,
    noten: { clef, key, groups: [gesetzt] },
    klang: { art: 'zusammen', toene: gesetzt },
    optionen: [...STELLUNGEN],
    loesung: STELLUNGEN[welche],
    erklaerung: `Im Bass liegt ${germanName(gesetzt[0])}, ${
      welche === 0 ? 'der Grundton' : welche === 1 ? 'die Terz' : 'die Quinte'
    } des Akkords mit dem Grundton ${germanName(fromDiatonic(g, fifths))}. Entscheidend ist nur der tiefste Ton.`,
    begriff: welche === 2 ? 'quartsextakkord' : welche === 1 ? 'sextakkord' : 'umkehrung',
  };
}
