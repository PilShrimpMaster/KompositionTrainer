import { konsonanzAufgabe, kpFehlerAufgabe, motivformAufgabe } from '../kontrapunkt/uebungen';
import { quarterLength } from '../model/duration';
import { modusAufgabe } from './modal';
import { analyseAufgabe } from './analyse';
import { begleitmusterAufgabe, formAufgabe } from './form';
import { transpositionAufgabe } from './instrumente';
import { altschluesselAufgabe, instrumentHoerenAufgabe, lageAufgabe } from './orchester';
import { alteriertAufgabe, epocheAufgabe } from './stile';
import { eqAufgabe, grooveAufgabe, tempoAufgabe, wellenformAufgabe } from './produktion';
import type { Beat } from '../produktion/beat';
import { akkordsymbolAufgabe, optionstonAufgabe, pcsetAufgabe, reihenformAufgabe, tritonusAufgabe, zweiFuenfEinsAufgabe } from './jazz';
import { fromDiatonic, germanKeyName, germanName, germanNameWithOctave, toMidi, diatonicIndex } from '../model/pitch';
import type { Clef, Duration, KeySignature, Pitch, Score, Step } from '../model/types';
import { funktionAufgabe, kadenzAufgabe, satzfehlerAufgabe, umkehrungAufgabe } from './satzuebungen';
import {
  DREIKLANG_ARTEN,
  dreiklang,
  dreiklangName,
  intervall,
  intervallName,
  intervallUeber,
  type DreiklangArt,
} from './theorie';

/**
 * Eine Übungsaufgabe als reines JSON-Objekt. Generatoren erzeugen sie zufällig;
 * feste Aufgaben können später im selben Format als JSON im Repository liegen.
 */
export interface Aufgabe {
  typ: UebungTyp;
  frage: string;
  /** Notenbild (optional) */
  noten?: { clef: Clef; key?: KeySignature; groups: Pitch[][] };
  /** Klang (optional): Töne nacheinander oder gleichzeitig; `folge` spielt mehrere Akkorde nacheinander */
  klang?: { art: 'nacheinander' | 'zusammen'; toene: Pitch[]; folge?: Pitch[][]; instrument?: string };
  /** Mehrstimmiges Notenbild (z. B. zwei Akkorde im Chorsatz) */
  satz?: Score;
  /** Antwortmöglichkeiten; leer bei Diktaten */
  optionen: string[];
  loesung: string;
  /** Erklärung nach dem Antworten */
  erklaerung: string;
  /** Lexikon-Begriff zum Nachschlagen */
  begriff: string;
  /** Diktat: erwartete Töne (der erste ist vorgegeben) */
  diktat?: Pitch[];
  /** Analyse: Takte (ab 0), die man im Notenbild markieren soll */
  markieren?: number[];
  /** Höraufgabe zur Produktion: Wellenform, EQ-Vergleich oder Beat */
  produktion?: { art: 'welle'; welle: 'sine' | 'triangle' | 'sawtooth' | 'square' } | { art: 'eq'; band: number } | { art: 'beat'; beat: Beat };
}

export type UebungTyp =
  | 'noten-lesen'
  | 'notenwerte'
  | 'intervall-lesen'
  | 'intervall-hoeren'
  | 'dreiklang-lesen'
  | 'dreiklang-hoeren'
  | 'tonart-vorzeichen'
  | 'paralleltonart'
  | 'melodiediktat'
  | 'funktion-bestimmen'
  | 'kadenz-hoeren'
  | 'umkehrung-bestimmen'
  | 'satzfehler-finden'
  | 'konsonanz-bestimmen'
  | 'kp-fehler-finden'
  | 'motivform-bestimmen'
  | 'modus-hoeren'
  | 'analyse-markieren'
  | 'form-bestimmen'
  | 'begleitmuster-bestimmen'
  | 'transponieren'
  | 'altschluessel-lesen'
  | 'instrument-hoeren'
  | 'lage-einschaetzen'
  | 'alteriert-bestimmen'
  | 'epoche-erkennen'
  | 'akkordsymbol-lesen'
  | 'zwei-fuenf-eins'
  | 'optionston-bestimmen'
  | 'tritonus-substitution'
  | 'pcset-bestimmen'
  | 'reihenform-bestimmen'
  | 'wellenform-hoeren'
  | 'eq-hoeren'
  | 'groove-erkennen'
  | 'tempo-schaetzen';

export interface UebungInfo {
  typ: UebungTyp;
  titel: string;
  modul: string;
  hoeren: boolean;
}

export const UEBUNGEN: UebungInfo[] = [
  { typ: 'noten-lesen', titel: 'Noten lesen', modul: 's1-noten', hoeren: false },
  { typ: 'notenwerte', titel: 'Notenwerte rechnen', modul: 's1-rhythmus', hoeren: false },
  { typ: 'intervall-lesen', titel: 'Intervalle bestimmen', modul: 's1-intervalle', hoeren: false },
  { typ: 'intervall-hoeren', titel: 'Intervalle hören', modul: 's1-intervalle', hoeren: true },
  { typ: 'tonart-vorzeichen', titel: 'Tonart an den Vorzeichen erkennen', modul: 's1-tonleitern', hoeren: false },
  { typ: 'melodiediktat', titel: 'Melodiediktat', modul: 's1-tonleitern', hoeren: true },
  { typ: 'paralleltonart', titel: 'Paralleltonarten', modul: 's1-quintenzirkel', hoeren: false },
  { typ: 'dreiklang-lesen', titel: 'Dreiklänge bestimmen', modul: 's1-dreiklaenge', hoeren: false },
  { typ: 'dreiklang-hoeren', titel: 'Dreiklänge hören', modul: 's1-dreiklaenge', hoeren: true },
  { typ: 'funktion-bestimmen', titel: 'Funktionen bestimmen', modul: 's2-funktionen', hoeren: false },
  { typ: 'satzfehler-finden', titel: 'Satzfehler finden', modul: 's2-satz', hoeren: false },
  { typ: 'umkehrung-bestimmen', titel: 'Umkehrungen bestimmen', modul: 's2-umkehrungen', hoeren: false },
  { typ: 'kadenz-hoeren', titel: 'Schlüsse hören', modul: 's2-nebenfunktionen', hoeren: true },
  { typ: 'konsonanz-bestimmen', titel: 'Konsonanz oder Dissonanz', modul: 's3-gattung1', hoeren: false },
  { typ: 'kp-fehler-finden', titel: 'Fehler im Kontrapunkt finden', modul: 's3-gattung2', hoeren: false },
  { typ: 'motivform-bestimmen', titel: 'Motiv, Umkehrung, Krebs', modul: 's3-imitation', hoeren: false },
  { typ: 'modus-hoeren', titel: 'Modi hören', modul: 's3-modal-heute', hoeren: true },
  { typ: 'analyse-markieren', titel: 'Werke analysieren', modul: 's3-invention', hoeren: false },
  { typ: 'form-bestimmen', titel: 'Formen erkennen', modul: 's4-periode', hoeren: false },
  { typ: 'begleitmuster-bestimmen', titel: 'Begleitmuster erkennen', modul: 's4-begleitung', hoeren: false },
  { typ: 'transponieren', titel: 'Transponierende Instrumente', modul: 's4-instrumente', hoeren: false },
  { typ: 'altschluessel-lesen', titel: 'Altschlüssel lesen', modul: 's5-streicher', hoeren: false },
  { typ: 'instrument-hoeren', titel: 'Instrumente am Klang erkennen', modul: 's5-holz', hoeren: true },
  { typ: 'lage-einschaetzen', titel: 'Umfang und Lage einschätzen', modul: 's5-blech', hoeren: false },
  { typ: 'alteriert-bestimmen', titel: 'Alterierte Akkorde bestimmen', modul: 's6-romantik', hoeren: false },
  { typ: 'epoche-erkennen', titel: 'Epoche erkennen', modul: 's6-werkanalyse', hoeren: false },
  { typ: 'akkordsymbol-lesen', titel: 'Akkordsymbole lesen', modul: 's7-akkordsymbole', hoeren: false },
  { typ: 'zwei-fuenf-eins', titel: 'II–V–I erkennen', modul: 's7-zwei-fuenf-eins', hoeren: false },
  { typ: 'optionston-bestimmen', titel: 'Optionstöne bestimmen', modul: 's7-voicings', hoeren: false },
  { typ: 'tritonus-substitution', titel: 'Tritonus-Substitution', modul: 's7-reharmonisation', hoeren: false },
  { typ: 'pcset-bestimmen', titel: 'Tonmengen bestimmen (Primform)', modul: 's7-neue-musik', hoeren: false },
  { typ: 'reihenform-bestimmen', titel: 'Reihenformen erkennen', modul: 's7-neue-musik', hoeren: false },
  { typ: 'groove-erkennen', titel: 'Grooves erkennen', modul: 's8-beats', hoeren: true },
  { typ: 'tempo-schaetzen', titel: 'Tempo schätzen', modul: 's8-beats', hoeren: true },
  { typ: 'wellenform-hoeren', titel: 'Wellenformen hören', modul: 's8-sounddesign', hoeren: true },
  { typ: 'eq-hoeren', titel: 'Frequenzbereiche hören', modul: 's8-mixing', hoeren: true },
];

/** Schwierigkeit 1–3, abhängig von der Sicherheit im Modul */
export type Stufe = 1 | 2 | 3;
export function stufeFuer(sicherheit: number): Stufe {
  return sicherheit >= 0.8 ? 3 : sicherheit >= 0.5 ? 2 : 1;
}

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Richtige Antwort plus Ablenker, ohne Doppelte, gemischt */
function optionen(rng: Rng, loesung: string, kandidaten: string[], anzahl = 4): string[] {
  const rest = shuffle(rng, [...new Set(kandidaten.filter((k) => k !== loesung))]).slice(0, anzahl - 1);
  return shuffle(rng, [loesung, ...rest]);
}

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function zufallsTon(rng: Rng, clef: Clef, stufe: Stufe, vorzeichen: boolean): Pitch {
  // Violinschlüssel: c′ bis a″, Bassschlüssel: E bis c′; ab Stufe 3 mit Hilfslinien
  const [lo, hi] =
    clef === 'treble'
      ? stufe === 3
        ? [diatonicIndex({ step: 'A', octave: 3 }), diatonicIndex({ step: 'E', octave: 6 })]
        : [diatonicIndex({ step: 'D', octave: 4 }), diatonicIndex({ step: 'G', octave: 5 })]
      : stufe === 3
        ? [diatonicIndex({ step: 'C', octave: 2 }), diatonicIndex({ step: 'E', octave: 4 })]
        : [diatonicIndex({ step: 'F', octave: 2 }), diatonicIndex({ step: 'B', octave: 3 })];
  const p = fromDiatonic(int(rng, lo, hi), 0);
  if (vorzeichen && rng() < 0.5) {
    const alter = rng() < 0.5 ? 1 : -1;
    return { ...p, alter };
  }
  return p;
}

// ---------- Generatoren ----------

function notenLesen(rng: Rng, stufe: Stufe): Aufgabe {
  const clef: Clef = stufe === 1 ? 'treble' : pick(rng, ['treble', 'bass'] as const);
  const ton = zufallsTon(rng, clef, stufe, stufe === 3);
  const loesung = germanName(ton);
  const kandidaten =
    stufe === 3
      ? STEPS.flatMap((s) => [0, 1, -1].map((a) => germanName({ step: s, alter: a, octave: 4 })))
      : STEPS.map((s) => germanName({ step: s, octave: 4 }));
  return {
    typ: 'noten-lesen',
    frage: `Wie heißt diese Note im ${clef === 'treble' ? 'Violinschlüssel' : 'Bassschlüssel'}?`,
    noten: { clef, groups: [[ton]] },
    klang: { art: 'nacheinander', toene: [ton] },
    optionen: stufe === 3 ? optionen(rng, loesung, kandidaten, 6) : STEPS.map((s) => germanName({ step: s, octave: 4 })),
    loesung,
    erklaerung: `Das ist ${germanNameWithOctave(ton)} (${loesung}). ${
      clef === 'treble'
        ? 'Merkhilfe: Der Violinschlüssel legt das g′ auf die zweite Linie von unten.'
        : 'Merkhilfe: Der Bassschlüssel legt das f auf die zweite Linie von oben, zwischen die beiden Punkte.'
    }`,
    begriff: clef === 'treble' ? 'violinschluessel' : 'bassschluessel',
  };
}

const NOTENWERTE: { d: Duration; name: string }[] = [
  { d: { type: 'whole' }, name: 'Ganze' },
  { d: { type: 'half', dots: 1 }, name: 'punktierte Halbe' },
  { d: { type: 'half' }, name: 'Halbe' },
  { d: { type: 'quarter', dots: 1 }, name: 'punktierte Viertel' },
  { d: { type: 'quarter' }, name: 'Viertel' },
  { d: { type: 'eighth', dots: 1 }, name: 'punktierte Achtel' },
  { d: { type: 'eighth' }, name: 'Achtel' },
  { d: { type: '16th' }, name: 'Sechzehntel' },
];

function notenwerte(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = stufe === 1 ? NOTENWERTE.filter((n) => !n.d.dots) : NOTENWERTE;
  let gross = pick(rng, pool);
  let klein = pick(rng, NOTENWERTE.filter((n) => !n.d.dots));
  if (quarterLength(klein.d) > quarterLength(gross.d)) [gross, klein] = [klein, gross];
  const ergebnis = quarterLength(gross.d) / quarterLength(klein.d);
  if (!Number.isInteger(ergebnis) || ergebnis < 1) return notenwerte(rng, stufe);
  const loesung = String(ergebnis);
  const kandidaten = ['1', '2', '3', '4', '6', '8', '12', '16'];
  return {
    typ: 'notenwerte',
    frage: `Wie viele ${klein.name} dauern so lang wie eine ${gross.name}?`,
    optionen: optionen(rng, loesung, kandidaten, 4).sort((a, b) => Number(a) - Number(b)),
    loesung,
    erklaerung: `Eine ${gross.name} dauert ${fmt(quarterLength(gross.d))} Viertel, eine ${klein.name} ${fmt(
      quarterLength(klein.d),
    )} Viertel, also passen ${loesung} hinein.${gross.d.dots ? ' Der Punkt verlängert eine Note um die Hälfte ihres Werts.' : ''}`,
    begriff: gross.d.dots ? 'punktierung' : 'notenwert',
  };
}

const fmt = (q: number) => q.toLocaleString('de-DE');

/** Intervalle je Schwierigkeit: [Nummer, Halbtöne] */
const INTERVALLE: Record<Stufe, [number, number][]> = {
  1: [[2, 2], [3, 4], [5, 7], [8, 12]],
  2: [[2, 1], [2, 2], [3, 3], [3, 4], [4, 5], [5, 7], [6, 8], [6, 9], [7, 10], [7, 11], [8, 12]],
  3: [[1, 0], [2, 1], [2, 2], [3, 3], [3, 4], [4, 5], [4, 6], [5, 6], [5, 7], [6, 8], [6, 9], [7, 10], [7, 11], [8, 12]],
};

function intervallAufgabe(rng: Rng, stufe: Stufe, hoeren: boolean): Aufgabe {
  const [nummer, halbtoene] = pick(rng, INTERVALLE[stufe]);
  const grund = zufallsTon(rng, 'treble', 1, stufe === 3 && !hoeren);
  // Grundton nicht zu hoch, damit das Intervall im System bleibt
  const g = diatonicIndex(grund) > diatonicIndex({ step: 'D', octave: 5 }) ? { ...grund, octave: grund.octave - 1 } : grund;
  const oben = intervallUeber(g, nummer, halbtoene);
  const iv = intervall(g, oben);
  const loesung = intervallName(iv);
  const alle = INTERVALLE[stufe].map(([n, h]) => intervallName(intervall(g, intervallUeber(g, n, h))));
  const zusammen = hoeren && stufe === 3 && rng() < 0.5;
  return {
    typ: hoeren ? 'intervall-hoeren' : 'intervall-lesen',
    frage: hoeren
      ? `Welches Intervall hörst du${zusammen ? ' (beide Töne zusammen)' : ''}?`
      : 'Welches Intervall ist das?',
    noten: hoeren ? undefined : { clef: 'treble', groups: [[g], [oben]] },
    klang: { art: zusammen ? 'zusammen' : 'nacheinander', toene: [g, oben] },
    optionen: hoeren ? [...new Set(alle)] : optionen(rng, loesung, alle, 4),
    loesung,
    erklaerung: `${germanName(g)}–${germanName(oben)}: ${iv.nummer} Stufen und ${iv.halbtoene} Halbtöne, also eine ${loesung}.${
      hoeren ? ' ' + HOERHILFE[loesung] : ''
    }`.trim(),
    begriff: 'intervall',
  };
}

/** Bekannte Liedanfänge als Hörhilfe */
const HOERHILFE: Record<string, string> = {
  'kleine Sekunde': 'Klingt wie der Anfang von „Für Elise“ (e–dis).',
  'große Sekunde': 'Klingt wie „Alle meine Entchen“ (c–d).',
  'kleine Terz': 'Klingt wie „Kuckuck, Kuckuck“ (g–e, abwärts).',
  'große Terz': 'Klingt wie der Anfang von „When the Saints Go Marching In“.',
  'reine Quarte': 'Klingt wie „Oh Tannenbaum“ oder der Hochzeitsmarsch von Wagner.',
  'übermäßige Quarte': 'Der Tritonus: klingt wie „Maria“ aus der West Side Story.',
  'verminderte Quinte': 'Der Tritonus, gleich groß wie die übermäßige Quarte.',
  'reine Quinte': 'Klingt wie „Morgen kommt der Weihnachtsmann“ (c–c–g–g) oder Star Wars.',
  'kleine Sexte': 'Klingt wie der Sprung e–c am Anfang von „The Entertainer“.',
  'große Sexte': 'Klingt wie „My Bonnie Is over the Ocean“.',
  'kleine Septime': 'Klingt wie „There’s a Place for Us“ aus der West Side Story.',
  'große Septime': 'Fast eine Oktave, sehr scharf; wie „Take on Me“ (Refrain).',
  'reine Oktave': 'Klingt wie „Somewhere over the Rainbow“.',
  'reine Prime': 'Zweimal derselbe Ton.',
};

function dreiklangAufgabe(rng: Rng, stufe: Stufe, hoeren: boolean): Aufgabe {
  const arten: DreiklangArt[] = stufe === 1 ? ['Dur', 'Moll'] : stufe === 2 ? ['Dur', 'Moll', 'vermindert'] : DREIKLANG_ARTEN;
  const art = pick(rng, arten);
  // Ab Stufe 2 auch gebräuchliche alterierte Grundtöne (Fis, Cis, Gis, B, Es, As, Des)
  const alteriert: Pitch[] = [
    { step: 'F', alter: 1, octave: 4 },
    { step: 'C', alter: 1, octave: 4 },
    { step: 'G', alter: 1, octave: 4 },
    { step: 'B', alter: -1, octave: 3 },
    { step: 'E', alter: -1, octave: 4 },
    { step: 'A', alter: -1, octave: 4 },
    { step: 'D', alter: -1, octave: 4 },
  ];
  const grund: Pitch =
    stufe >= 2 && rng() < 0.35 ? pick(rng, alteriert) : { step: pick(rng, STEPS), octave: 4 };
  const toene = dreiklang(grund, art);
  const loesung = hoeren ? art : dreiklangName(grund, art);
  const kandidaten = hoeren
    ? arten
    : [
        ...DREIKLANG_ARTEN.filter((a) => arten.includes(a)).map((a) => dreiklangName(grund, a)),
        dreiklangName(toene[1], art),
        dreiklangName(toene[2], art),
      ];
  const terz = intervall(toene[0], toene[1]);
  const quinte = intervall(toene[0], toene[2]);
  return {
    typ: hoeren ? 'dreiklang-hoeren' : 'dreiklang-lesen',
    frage: hoeren ? 'Welcher Dreiklang klingt?' : 'Wie heißt dieser Dreiklang?',
    noten: hoeren ? undefined : { clef: 'treble', groups: [toene] },
    klang: { art: 'zusammen', toene },
    optionen: hoeren ? arten : optionen(rng, loesung, kandidaten, 4),
    loesung,
    erklaerung: `${toene.map(germanName).join('–')}: ${intervallName(terz)} und ${intervallName(quinte)} über dem Grundton ${germanName(
      grund,
    )}, also ${dreiklangName(grund, art)}.${hoeren ? ' ' + DREIKLANG_HOERHILFE[art] : ''}`,
    begriff: 'dreiklang',
  };
}

const DREIKLANG_HOERHILFE: Record<DreiklangArt, string> = {
  Dur: 'Dur klingt hell und offen.',
  Moll: 'Moll klingt weicher und dunkler.',
  vermindert: 'Vermindert klingt eng und gespannt, als wolle es weiter.',
  übermäßig: 'Übermäßig klingt schwebend und unaufgelöst.',
};

function tonartVorzeichen(rng: Rng, stufe: Stufe): Aufgabe {
  const range = stufe === 1 ? 3 : stufe === 2 ? 5 : 7;
  const fifths = int(rng, -range, range);
  const mode = stufe === 3 && rng() < 0.4 ? 'minor' : 'major';
  const key: KeySignature = { fifths, mode };
  const loesung = germanKeyName(key);
  const kandidaten: string[] = [];
  for (let f = -range; f <= range; f++) kandidaten.push(germanKeyName({ fifths: f, mode }));
  const nahe = kandidaten.filter((k) => Math.abs(kandidaten.indexOf(k) - (fifths + range)) <= 2);
  const n = Math.abs(fifths);
  const art = fifths > 0 ? 'Kreuz' : 'B';
  return {
    typ: 'tonart-vorzeichen',
    frage: `Welche ${mode === 'major' ? 'Dur' : 'Moll'}-Tonart hat diese Vorzeichen?`,
    noten: { clef: 'treble', key, groups: [] },
    optionen: optionen(rng, loesung, nahe.length >= 4 ? nahe : kandidaten, 4),
    loesung,
    erklaerung:
      n === 0
        ? `Keine Vorzeichen: ${loesung}.`
        : `${n} ${n === 1 ? art : art === 'Kreuz' ? 'Kreuze' : 'Bs'}: ${loesung}. ${
            fifths > 0
              ? 'Faustregel: Die Dur-Tonart liegt einen Halbton über dem letzten Kreuz.'
              : 'Faustregel: Das vorletzte B nennt die Dur-Tonart (bei einem B: F-Dur).'
          }${mode === 'minor' ? ' Die Moll-Tonart liegt eine kleine Terz unter der Dur-Tonart mit gleichen Vorzeichen.' : ''}`,
    begriff: 'vorzeichen',
  };
}

function paralleltonart(rng: Rng, stufe: Stufe): Aufgabe {
  const range = stufe === 1 ? 3 : stufe === 2 ? 5 : 7;
  const fifths = int(rng, -range, range);
  const vonDur = rng() < 0.5;
  const von = germanKeyName({ fifths, mode: vonDur ? 'major' : 'minor' });
  const loesung = germanKeyName({ fifths, mode: vonDur ? 'minor' : 'major' });
  const kandidaten = [-1, 1, 2, -3, 3].map((d) => germanKeyName({ fifths: Math.max(-7, Math.min(7, fifths + d)), mode: vonDur ? 'minor' : 'major' }));
  kandidaten.push(germanKeyName({ fifths: Math.max(-7, Math.min(7, fifths - 3)), mode: vonDur ? 'minor' : 'major' }));
  return {
    typ: 'paralleltonart',
    frage: `Welche Tonart ist die Paralleltonart von ${von}?`,
    noten: { clef: 'treble', key: { fifths, mode: 'major' }, groups: [] },
    optionen: optionen(rng, loesung, kandidaten, 4),
    loesung,
    erklaerung: `${von} und ${loesung} haben dieselben Vorzeichen. ${
      vonDur ? 'Die parallele Moll-Tonart liegt eine kleine Terz tiefer.' : 'Die parallele Dur-Tonart liegt eine kleine Terz höher.'
    }`,
    begriff: 'paralleltonart',
  };
}

function melodiediktat(rng: Rng, stufe: Stufe): Aufgabe {
  const laenge = stufe === 1 ? 4 : stufe === 2 ? 5 : 6;
  const maxSprung = stufe === 1 ? 1 : stufe === 2 ? 2 : 4;
  const start = diatonicIndex({ step: 'C', octave: 4 });
  const toene: Pitch[] = [fromDiatonic(start + pick(rng, [0, 2, 4]), 0)];
  while (toene.length < laenge) {
    const letzter = diatonicIndex(toene[toene.length - 1]);
    let schritt = int(rng, -maxSprung, maxSprung);
    if (schritt === 0) schritt = 1;
    const ziel = Math.max(start, Math.min(start + 7, letzter + schritt)); // c′ bis c″
    if (ziel === letzter) continue;
    toene.push(fromDiatonic(ziel, 0));
  }
  return {
    typ: 'melodiediktat',
    frage: `Hör dir die Melodie an (C-Dur, ${laenge} Töne) und spiel sie auf dem Klavier nach. Der erste Ton ist ${germanNameWithOctave(
      toene[0],
    )}.`,
    noten: { clef: 'treble', groups: [[toene[0]]] },
    klang: { art: 'nacheinander', toene },
    optionen: [],
    loesung: toene.map(germanName).join(' '),
    erklaerung: `Die Melodie war: ${toene.map(germanNameWithOctave).join(' – ')}.`,
    begriff: 'melodie',
    diktat: toene,
  };
}

export function erzeugeAufgabe(typ: UebungTyp, stufe: Stufe, rng: Rng = Math.random): Aufgabe {
  switch (typ) {
    case 'noten-lesen':
      return notenLesen(rng, stufe);
    case 'notenwerte':
      return notenwerte(rng, stufe);
    case 'intervall-lesen':
      return intervallAufgabe(rng, stufe, false);
    case 'intervall-hoeren':
      return intervallAufgabe(rng, stufe, true);
    case 'dreiklang-lesen':
      return dreiklangAufgabe(rng, stufe, false);
    case 'dreiklang-hoeren':
      return dreiklangAufgabe(rng, stufe, true);
    case 'tonart-vorzeichen':
      return tonartVorzeichen(rng, stufe);
    case 'paralleltonart':
      return paralleltonart(rng, stufe);
    case 'melodiediktat':
      return melodiediktat(rng, stufe);
    case 'funktion-bestimmen':
      return funktionAufgabe(rng, stufe);
    case 'kadenz-hoeren':
      return kadenzAufgabe(rng, stufe);
    case 'umkehrung-bestimmen':
      return umkehrungAufgabe(rng, stufe);
    case 'satzfehler-finden':
      return satzfehlerAufgabe(rng, stufe);
    case 'konsonanz-bestimmen':
      return konsonanzAufgabe(rng, stufe);
    case 'kp-fehler-finden':
      return kpFehlerAufgabe(rng, stufe);
    case 'motivform-bestimmen':
      return motivformAufgabe(rng, stufe);
    case 'modus-hoeren':
      return modusAufgabe(rng, stufe);
    case 'analyse-markieren':
      return analyseAufgabe(rng, stufe);
    case 'form-bestimmen':
      return formAufgabe(rng, stufe);
    case 'begleitmuster-bestimmen':
      return begleitmusterAufgabe(rng, stufe);
    case 'transponieren':
      return transpositionAufgabe(rng, stufe);
    case 'altschluessel-lesen':
      return altschluesselAufgabe(rng, stufe);
    case 'instrument-hoeren':
      return instrumentHoerenAufgabe(rng, stufe);
    case 'lage-einschaetzen':
      return lageAufgabe(rng, stufe);
    case 'alteriert-bestimmen':
      return alteriertAufgabe(rng, stufe);
    case 'epoche-erkennen':
      return epocheAufgabe(rng, stufe);
    case 'akkordsymbol-lesen':
      return akkordsymbolAufgabe(rng, stufe);
    case 'zwei-fuenf-eins':
      return zweiFuenfEinsAufgabe(rng, stufe);
    case 'optionston-bestimmen':
      return optionstonAufgabe(rng, stufe);
    case 'tritonus-substitution':
      return tritonusAufgabe(rng, stufe);
    case 'pcset-bestimmen':
      return pcsetAufgabe(rng, stufe);
    case 'reihenform-bestimmen':
      return reihenformAufgabe(rng, stufe);
    case 'wellenform-hoeren':
      return wellenformAufgabe(rng, stufe);
    case 'eq-hoeren':
      return eqAufgabe(rng, stufe);
    case 'groove-erkennen':
      return grooveAufgabe(rng, stufe);
    case 'tempo-schaetzen':
      return tempoAufgabe(rng, stufe);
  }
}

/** Vergleicht ein gespieltes Diktat mit der Lösung (Tonhöhe genau, Schreibweise egal) */
export function diktatRichtig(erwartet: Pitch[], gespielt: number[]): boolean[] {
  return erwartet.map((p, i) => gespielt[i] === toMidi(p));
}
