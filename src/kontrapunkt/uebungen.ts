import { fromDiatonic, diatonicIndex, germanNameWithOctave } from '../model/pitch';
import type { Pitch } from '../model/types';
import type { Aufgabe, Stufe } from '../uebungen/aufgaben';
import { intervall, intervallName } from '../uebungen/theorie';
import { konsonant, pruefeKontrapunkt, vollkommen, type Gattung } from './fux';
import { kpSatz } from './kurzform';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

/* ---------- Konsonanz oder Dissonanz ---------- */

export const KLANGARTEN = ['vollkommene Konsonanz', 'unvollkommene Konsonanz', 'Dissonanz'] as const;

export function klangart(a: Pitch, b: Pitch): (typeof KLANGARTEN)[number] {
  if (!konsonant(a, b)) return 'Dissonanz';
  return vollkommen(a, b) ? 'vollkommene Konsonanz' : 'unvollkommene Konsonanz';
}

export function konsonanzAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const unten = fromDiatonic(diatonicIndex({ step: pick(rng, ['C', 'D', 'E', 'F', 'G', 'A'] as const), octave: 3 }), 0);
  const weite = 1 + Math.floor(rng() * (stufe === 1 ? 8 : 12)); // ab Stufe 2 auch über die Oktave
  const oben = fromDiatonic(diatonicIndex(unten) + weite, 0);
  if (stufe === 3 && rng() < 0.3) oben.alter = rng() < 0.5 ? 1 : -1;
  const iv = intervall(unten, oben);
  const loesung = klangart(unten, oben);
  const name = intervallName(iv);
  const ueber = weite >= 7 && iv.nummer !== 8 ? ' (über die Oktave, gilt wie die einfache)' : '';
  const grund: Record<(typeof KLANGARTEN)[number], string> = {
    'vollkommene Konsonanz': 'Einklang, reine Quinte und Oktave verschmelzen fast zu einem Klang. Sie stehen am Anfang und Schluss, dürfen aber nie parallel aufeinander folgen.',
    'unvollkommene Konsonanz': 'Terzen und Sexten klingen voll und weich. Sie sind die wichtigsten Klänge im Kontrapunkt und dürfen auch parallel laufen.',
    Dissonanz: `${iv.nummer === 4 ? 'Die Quarte gilt im zweistimmigen Satz als Dissonanz. ' : ''}Dissonanzen brauchen eine Behandlung: als Durchgang, Wechselnote oder Vorhalt.`,
  };
  return {
    typ: 'konsonanz-bestimmen',
    frage: 'Ist dieser Zusammenklang eine vollkommene Konsonanz, eine unvollkommene Konsonanz oder eine Dissonanz?',
    noten: { clef: diatonicIndex(oben) > diatonicIndex({ step: 'B', octave: 4 }) ? 'treble' : 'bass', groups: [[unten, oben]] },
    klang: { art: 'zusammen', toene: [unten, oben] },
    optionen: [...KLANGARTEN],
    loesung,
    erklaerung: `${germanNameWithOctave(unten)} und ${germanNameWithOctave(oben)} bilden eine ${name}${ueber}. ${grund[loesung]}`,
    begriff: 'konsonanz-dissonanz',
  };
}

/* ---------- Fehler im Kontrapunkt finden ---------- */

export const KP_FEHLER = ['Parallele', 'Dissonanz auf betonter Zeit', 'Dissonanz nicht im Schritt', 'Falscher Schluss', 'Kein Fehler'] as const;
export type KpFehler = (typeof KP_FEHLER)[number];

export const REGEL_ZU_FEHLER: Record<string, KpFehler> = {
  'kp-parallelen': 'Parallele',
  'kp-verdeckt': 'Parallele',
  'kp-konsonanz': 'Dissonanz auf betonter Zeit',
  'kp-durchgang': 'Dissonanz nicht im Schritt',
  'kp-schluss': 'Falscher Schluss',
};

const CF = 'C3:1 E3 D3 F3 E3 D3 C3';

export interface KpVorlage {
  gattung: Gattung;
  kp: string;
  fehler: KpFehler;
  erklaerung: string;
}

export const KP_VORLAGEN: KpVorlage[] = [
  { gattung: 1, kp: 'G3:1 C4 B3 A3 C4 B3 C4', fehler: 'Kein Fehler', erklaerung: 'Nur Konsonanzen, keine Parallelen in Quinten oder Oktaven, und der Schluss h–c über d–c ist eine saubere Clausula.' },
  { gattung: 1, kp: 'G3:1 C4 D4 C4 B3 B3 C4', fehler: 'Parallele', erklaerung: 'Im 4. und 5. Takt stehen zwei Quinten hintereinander (c–f, h–e): eine Quintparallele.' },
  { gattung: 1, kp: 'G3:1 C4 B3 B3 C4 B3 C4', fehler: 'Dissonanz auf betonter Zeit', erklaerung: 'Im 4. Takt bilden h und f einen Tritonus. In der 1. Gattung sind nur Konsonanzen erlaubt.' },
  { gattung: 1, kp: 'G3:1 C4 B3 A3 C4 B3 E4', fehler: 'Falscher Schluss', erklaerung: 'Der Satz endet auf der Terz e über c und springt dorthin. Ein Kontrapunkt schließt in der Oktave oder im Einklang, hier schrittweise h–c.' },
  { gattung: 2, kp: 'r:2 G3 | C4 D4 | B3 A3 | A3 B3 | C4 B3 | B3:1 | C4:1', fehler: 'Dissonanz nicht im Schritt', erklaerung: 'Im 2. Takt ist d über e eine Septime. Sie wird im Schritt erreicht, aber mit einem Sprung zum h verlassen. Ein Durchgang geht schrittweise weiter.' },
  { gattung: 2, kp: 'r:2 G3 | C4 B3 | B3 A3 | A3 B3 | C4 B3 | B3:1 | C4:1', fehler: 'Kein Fehler', erklaerung: 'Auf jeder Eins steht eine Konsonanz. Das h im 4. Takt (über f) ist ein Durchgang zwischen a und c: Schritt hinein, Schritt hinaus in dieselbe Richtung.' },
];

export function kpVorlageSatz(v: KpVorlage) {
  return kpSatz({ titel: '', oben: v.kp, unten: CF, namen: ['Kontrapunkt', 'Cantus firmus'] });
}

/** Fehler, die die Prüfung in einer Vorlage findet (für die Tests) */
export function kpVorlageFehler(v: KpVorlage): KpFehler[] {
  const b = pruefeKontrapunkt(kpVorlageSatz(v), { gattung: v.gattung, cf: 1, hinweise: false });
  const f = [...new Set(b.map((x) => REGEL_ZU_FEHLER[x.regel] ?? x.regel))] as KpFehler[];
  return f.length ? f : ['Kein Fehler'];
}

export function kpFehlerAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const auswahl = KP_VORLAGEN.filter((v) => stufe > 1 || v.gattung === 1);
  const v = pick(rng, auswahl);
  const satz = kpVorlageSatz(v);
  const folge = satz.voices[0].measures.flatMap((m, mi) =>
    m.notes.map((n) => [satz.voices[1].measures[mi].notes[0].pitch!, ...(n.pitch ? [n.pitch] : [])]),
  );
  return {
    typ: 'kp-fehler-finden',
    frage: `${v.gattung}. Gattung über einem Cantus firmus in C: Welcher Fehler steckt in der Oberstimme?`,
    satz,
    klang: { art: 'zusammen', toene: folge[0], folge },
    optionen: [...KP_FEHLER],
    loesung: v.fehler,
    erklaerung: v.erklaerung,
    begriff: v.fehler === 'Parallele' ? 'quintparallele' : v.fehler === 'Falscher Schluss' ? 'clausula' : v.fehler === 'Kein Fehler' ? 'gattungskontrapunkt' : 'durchgang',
  };
}
