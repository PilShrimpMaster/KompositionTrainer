import { measureLength, quarterLength } from '../model/duration';
import { eventId } from '../model/ids';
import { diatonicIndex, germanNameWithOctave } from '../model/pitch';
import type { Pitch, Score } from '../model/types';

/**
 * Motivanalyse: sucht ein Motiv in allen Stimmen, auch verwandelt.
 * Verglichen werden diatonische Schritte (tonal, wie bei Bach) und das Verhältnis der Notenwerte.
 */
export type MotivForm = 'Thema' | 'Umkehrung' | 'Krebs' | 'Krebsumkehrung' | 'Vergrößerung' | 'Verkleinerung';
export type MotivBezug = 'Original' | 'Imitation' | 'Sequenz' | 'Wiederkehr';

export interface MotivTon {
  p: Pitch;
  dauer: number;
  id: string;
  start: number;
  takt: number;
}

export interface Motiv {
  stimme: number;
  toene: MotivTon[];
}

export interface Fund {
  form: MotivForm;
  bezug: MotivBezug;
  stimme: number;
  /** Takt ab 1 */
  takt: number;
  start: number;
  ende: number;
  ids: string[];
  /** Verschiebung gegenüber dem Original in diatonischen Stufen */
  stufen: number;
  text: string;
}

/** Die Töne einer Stimme; übergebundene Noten werden zusammengefasst, Pausen trennen Abschnitte */
export function stimmToene(score: Score, v: number): (MotivTon | null)[] {
  const out: (MotivTon | null)[] = [];
  let zeit = 0;
  let gebunden = false;
  score.voices[v]?.measures.forEach((m, mi) =>
    m.notes.forEach((n, ni) => {
      const l = quarterLength(n.duration);
      const letzte = out[out.length - 1];
      if (!n.pitch) out.push(null);
      else if (gebunden && letzte && diatonicIndex(letzte.p) === diatonicIndex(n.pitch)) letzte.dauer += l;
      else out.push({ p: n.pitch, dauer: l, id: eventId(v, mi, ni), start: zeit, takt: mi });
      gebunden = !!n.tie && !!n.pitch;
      zeit += l;
    }),
  );
  return out;
}

/**
 * Das Motiv, wenn keines angegeben ist: die ersten Töne der zuerst einsetzenden Stimme
 * bis zur ersten Pause oder bis zur Mitte des Taktes, in dem sie beginnt.
 */
export function standardMotiv(score: Score, laenge?: number): Motiv | null {
  const kandidaten = score.voices.map((_, v) => ({ v, t: stimmToene(score, v) }));
  const erste = kandidaten
    .map(({ v, t }) => ({ v, t, i: t.findIndex((x) => x) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.t[a.i]!.start - b.t[b.i]!.start || a.v - b.v)[0];
  if (!erste) return null;
  const takt = measureLength(score.time);
  const beginn = erste.t[erste.i]!.start;
  const grenze = Math.floor(beginn / takt) * takt + takt / 2;
  const toene: MotivTon[] = [];
  for (let i = erste.i; i < erste.t.length; i++) {
    const t = erste.t[i];
    if (!t) break;
    if (laenge ? toene.length >= laenge : toene.length >= 3 && t.start >= grenze - 1e-9) break;
    toene.push(t);
  }
  return toene.length >= 3 ? { stimme: erste.v, toene } : null;
}

const schritte = (ts: { p: Pitch }[]) => ts.slice(1).map((t, i) => diatonicIndex(t.p) - diatonicIndex(ts[i].p));
const gleicheFolge = (a: number[], b: number[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Passt der Rhythmus im Verhältnis f? Der letzte Ton darf beliebig lang sein. */
function rhythmusFaktor(muster: number[], ist: number[]): number | null {
  const f = ist[0] / muster[0];
  for (let i = 0; i < muster.length - 1; i++) if (Math.abs(ist[i] - muster[i] * f) > 1e-6) return null;
  return f;
}

/** Im Krebs sind Anfangs- und Schlusston frei, die Werte dazwischen gleich */
const krebsRhythmus = (muster: number[], ist: number[]) => muster.slice(1, -1).every((d, i) => Math.abs(d - ist[i + 1]) < 1e-6);

const FORM_TEXT: Record<MotivForm, string> = {
  Thema: 'das Motiv',
  Umkehrung: 'die Umkehrung des Motivs (Intervalle gespiegelt)',
  Krebs: 'der Krebs des Motivs (rückwärts)',
  Krebsumkehrung: 'die Krebsumkehrung des Motivs (rückwärts und gespiegelt)',
  Vergrößerung: 'das Motiv in Vergrößerung (doppelte Notenwerte)',
  Verkleinerung: 'das Motiv in Verkleinerung (halbe Notenwerte)',
};

/** Sucht das Motiv in allen Stimmen */
export function findeMotive(score: Score, motiv: Motiv | null = standardMotiv(score)): Fund[] {
  if (!motiv || motiv.toene.length < 3) return [];
  const n = motiv.toene.length;
  const s = schritte(motiv.toene);
  const r = motiv.toene.map((t) => t.dauer);
  const umgekehrt = s.map((x) => -x);
  const krebs = [...s].reverse().map((x) => -x);
  const krebsUm = krebs.map((x) => -x);
  const rKrebs = [...r].reverse();
  const symmetrisch = gleicheFolge(s, krebs);
  const ursprung = diatonicIndex(motiv.toene[0].p);
  const motivEnde = diatonicIndex(motiv.toene[n - 1].p);

  const roh: Omit<Fund, 'bezug' | 'text'>[] = [];
  score.voices.forEach((_, v) => {
    const ts = stimmToene(score, v);
    let belegtBis = -1;
    for (let i = 0; i + n <= ts.length; i++) {
      if (i <= belegtBis) continue;
      const stueck = ts.slice(i, i + n);
      if (stueck.some((t) => !t)) continue;
      const tt = stueck as MotivTon[];
      const st = schritte(tt);
      const dauern = tt.map((t) => t.dauer);
      let form: MotivForm | null = null;
      let bezugTon = diatonicIndex(tt[0].p) - ursprung;
      const f = rhythmusFaktor(r, dauern);
      if (gleicheFolge(st, s) && f) form = f === 1 ? 'Thema' : f === 2 ? 'Vergrößerung' : f === 0.5 ? 'Verkleinerung' : null;
      else if (gleicheFolge(st, umgekehrt) && f === 1) form = 'Umkehrung';
      else if (!symmetrisch && gleicheFolge(st, krebs) && krebsRhythmus(rKrebs, dauern)) {
        form = 'Krebs';
        bezugTon = diatonicIndex(tt[0].p) - motivEnde;
      } else if (gleicheFolge(st, krebsUm) && krebsRhythmus(rKrebs, dauern)) {
        form = 'Krebsumkehrung';
        bezugTon = diatonicIndex(tt[0].p) - motivEnde;
      }
      if (!form) continue;
      const letzter = tt[n - 1];
      roh.push({ form, stimme: v, takt: tt[0].takt + 1, start: tt[0].start, ende: letzter.start + letzter.dauer, ids: tt.map((t) => t.id), stufen: bezugTon });
      belegtBis = i + n - 1;
    }
  });
  roh.sort((a, b) => a.start - b.start || a.stimme - b.stimme);

  const funde: Fund[] = [];
  for (const x of roh) {
    const original = x.stimme === motiv.stimme && x.ids[0] === motiv.toene[0].id;
    // Sequenz: dieselbe Gestalt in derselben Stimme schließt direkt an die vorige an, auf anderer Stufe
    const vorige = [...funde].reverse().find((f) => f.stimme === x.stimme);
    const sequenz = !!vorige && vorige.form === x.form && x.start - vorige.ende > -1e-6 && x.start - vorige.ende <= 0.5 && vorige.stufen !== x.stufen;
    // Imitation: in einer anderen Stimme und später als das Original (gleichzeitig wäre es nur eine Verdopplung)
    const imitation = x.stimme !== motiv.stimme && x.start > motiv.toene[0].start + 1e-6;
    const bezug: MotivBezug = original ? 'Original' : sequenz ? 'Sequenz' : imitation ? 'Imitation' : 'Wiederkehr';
    funde.push({ ...x, bezug, text: beschreibe(x, bezug, score) });
  }
  return funde;
}

const STIMME = ['Oberstimme', 'Unterstimme', '3. Stimme', '4. Stimme'];
const STUFE = ['Prime', 'Sekunde', 'Terz', 'Quarte', 'Quinte', 'Sexte', 'Septime', 'Oktave'];

/** „eine Quinte höher“, „zwei Oktaven tiefer“ */
export function verschiebung(stufen: number): string {
  if (stufen === 0) return 'auf derselben Tonhöhe';
  const a = Math.abs(stufen);
  const richtung = stufen > 0 ? 'höher' : 'tiefer';
  if (a % 7 === 0) return `${a === 7 ? 'eine Oktave' : a === 14 ? 'zwei Oktaven' : `${a / 7} Oktaven`} ${richtung}`;
  const rest = a % 7;
  const oktaven = Math.floor(a / 7);
  return `${oktaven ? `${oktaven === 1 ? 'eine Oktave' : `${oktaven} Oktaven`} und eine ` : 'eine '}${STUFE[rest]} ${richtung}`;
}

function beschreibe(x: Omit<Fund, 'bezug' | 'text'>, bezug: MotivBezug, score: Score): string {
  const wo = STIMME[x.stimme] ?? `${x.stimme + 1}. Stimme`;
  const was = FORM_TEXT[x.form];
  const ab = germanNameWithOctave(firstPitch(score, x.ids[0]));
  if (bezug === 'Original') return `${wo}: ${was[0].toUpperCase()}${was.slice(1)}, ab ${ab}.`;
  const lage = x.form === 'Thema' || x.form === 'Vergrößerung' || x.form === 'Verkleinerung' ? `, ${verschiebung(x.stufen)}` : '';
  if (bezug === 'Sequenz') return `${wo}: Sequenz, ${was} schließt direkt an und steht ${verschiebung(x.stufen)}.`;
  if (bezug === 'Imitation') return `${wo}: Imitation, ${was}${lage} (ab ${ab}).`;
  return `${wo}: ${was[0].toUpperCase()}${was.slice(1)} kehrt wieder${lage} (ab ${ab}).`;
}

function firstPitch(score: Score, id: string): Pitch {
  const [v, m, n] = id.split('-').map(Number);
  return score.voices[v].measures[m].notes[n].pitch!;
}

/** Kurze Zusammenfassung: wie oft welche Form und welcher Bezug vorkommt */
export function motivBilanz(funde: Fund[]) {
  const formen = new Set(funde.map((f) => f.form));
  const bezuege = new Set(funde.map((f) => f.bezug));
  const stimmen = new Set(funde.map((f) => f.stimme));
  return { anzahl: funde.length, formen, bezuege, stimmen };
}
