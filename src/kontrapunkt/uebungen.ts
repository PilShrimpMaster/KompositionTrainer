import { fromDiatonic, diatonicIndex, germanNameWithOctave } from '../model/pitch';
import type { Pitch } from '../model/types';
import type { Aufgabe, Stufe } from '../uebungen/aufgaben';
import { intervall, intervallName } from '../uebungen/theorie';
import { konsonant, pruefeKontrapunkt, vollkommen, type Gattung } from './fux';
import { kpSatz } from './kurzform';
import { findeMotive, stimmToene, verschiebung } from './motive';

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

/* ---------- Motivform bestimmen ---------- */

export const MOTIVFORMEN = ['Thema (versetzt)', 'Umkehrung', 'Krebs', 'Vergrößerung'] as const;

const tok = (p: Pitch) => `${p.step}${p.alter === 1 ? '#' : p.alter === -1 ? 'b' : ''}${p.octave}`;
const wert = (q: number) => (q === 0.5 ? '8' : q === 1 ? '4' : q === 2 ? '2' : q === 1.5 ? '4.' : '1');
/** Pausen, die die Zeit q (in Vierteln) füllen */
function pausen(q: number): string[] {
  const out: string[] = [];
  for (const d of [4, 2, 1, 0.5]) while (q >= d - 1e-9) {
    out.push(`r:${wert(d)}`);
    q -= d;
  }
  return out;
}
const folgeText = (ts: { p: Pitch; d: number }[]) => ts.map((t) => `${tok(t.p)}:${wert(t.d)}`);

export function motivformAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const formen = MOTIVFORMEN.slice(0, stufe === 1 ? 2 : stufe === 2 ? 3 : 4);
  for (let versuch = 0; ; versuch++) {
    const n = 4 + Math.floor(rng() * 2);
    const schritte = Array.from({ length: n - 1 }, () => pick(rng, [1, 1, 2, -1, -1, -2, 3, -3, 4] as const));
    const rhythmen = pick(rng, [
      [0.5, 0.5, 0.5, 0.5, 1],
      [1, 0.5, 0.5, 1, 1],
      [0.5, 0.5, 1, 1, 1],
      [1, 1, 0.5, 0.5, 1],
    ]).slice(0, n);
    rhythmen[n - 1] = 1;
    const start = diatonicIndex({ step: pick(rng, ['C', 'D', 'E', 'G'] as const), octave: 4 });
    const toene: number[] = [start];
    schritte.forEach((s) => toene.push(toene[toene.length - 1] + s));
    if (Math.max(...toene) - Math.min(...toene) > 6 || new Set(toene).size < 3) continue;
    const umkehr = schritte.map((s) => -s);
    const krebs = [...schritte].reverse().map((s) => -s);
    const gleich = (a: number[], b: number[]) => a.every((x, i) => x === b[i]);
    if (gleich(krebs, schritte) || gleich(krebs, umkehr) || gleich(umkehr, schritte)) continue;
    const motiv = toene.map((d, i) => ({ p: fromDiatonic(d, 0), d: rhythmen[i] }));
    const form = pick(rng, formen);
    const versatz = pick(rng, [-7, -3, -4, -9, -10]);
    const lage = start + versatz;
    let variante: { p: Pitch; d: number }[];
    if (form === 'Umkehrung') {
      const t = [lage];
      umkehr.forEach((s) => t.push(t[t.length - 1] + s));
      variante = t.map((d, i) => ({ p: fromDiatonic(d, 0), d: rhythmen[i] }));
    } else if (form === 'Krebs') {
      variante = [...motiv].reverse().map((t, i) => ({ p: fromDiatonic(diatonicIndex(t.p) + versatz, 0), d: [...rhythmen].reverse()[i] }));
    } else {
      const f = form === 'Vergrößerung' ? 2 : 1;
      variante = motiv.map((t) => ({ p: fromDiatonic(diatonicIndex(t.p) + versatz, 0), d: t.d * f }));
    }
    const lang = (ts: { d: number }[]) => ts.reduce((s, t) => s + t.d, 0);
    const takte = Math.ceil(lang(variante) / 4);
    const oben = [...folgeText(motiv), ...pausen(4 - lang(motiv)), ...Array(takte).fill('r:1')].join(' ');
    const unten = ['r:1', ...folgeText(variante), ...pausen(takte * 4 - lang(variante))].join(' ');
    const satz = kpSatz({ titel: '', oben, unten, namen: ['Motiv', 'Antwort'], schluessel: ['treble', 'bass'] });
    // Gegenprobe mit der Motivanalyse
    const erkannt = findeMotive(satz, { stimme: 0, toene: stimmToene(satz, 0).filter((t): t is NonNullable<typeof t> => !!t) }).find((x) => x.stimme === 1);
    const soll = form === 'Thema (versetzt)' ? 'Thema' : form;
    if (!erkannt || erkannt.form !== soll) {
      if (versuch > 200) throw new Error('Keine eindeutige Motivaufgabe gefunden');
      continue;
    }
    const folge = [...motiv, ...variante].map((t) => [t.p]);
    const erklaerung: Record<(typeof MOTIVFORMEN)[number], string> = {
      'Thema (versetzt)': `Die Unterstimme bringt das Motiv mit denselben Schritten und demselben Rhythmus, nur ${verschiebung(erkannt.stufen)}. Das ist eine Imitation.`,
      Umkehrung: 'Jeder Schritt geht in die Gegenrichtung: Wo das Motiv steigt, fällt die Antwort, und umgekehrt. Der Rhythmus bleibt gleich.',
      Krebs: 'Die Antwort spielt das Motiv rückwärts: Der letzte Ton kommt zuerst. Auch der Rhythmus ist umgedreht.',
      Vergrößerung: 'Die Schritte sind dieselben, aber alle Notenwerte sind verdoppelt. Das Motiv klingt breiter und gewichtiger.',
    };
    return {
      typ: 'motivform-bestimmen',
      frage: 'Wie antwortet die Unterstimme auf das Motiv der Oberstimme?',
      satz,
      klang: { art: 'nacheinander', toene: folge[0], folge },
      optionen: [...formen],
      loesung: form,
      erklaerung: erklaerung[form],
      begriff: 'spiegelung',
    };
  }
}
