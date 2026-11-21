import { measureLength } from '../model/duration';
import type { NoteEvent, Pitch, Score } from '../model/types';
import { SATB } from '../satz/kurzform';
import type { Gattung } from '../kontrapunkt/fux';
import type { Clef } from '../model/types';
import { decompose, rebar, type EditorDoc } from './rebar';
import { ENSEMBLES, instrument, stimmNamen } from '../model/instrumente';

/** Zusatzdaten eines vierstimmigen Satzes im Editor */
export interface Satzdaten {
  /** Noten je Stimme: Sopran, Alt, Tenor, Bass */
  stimmen: NoteEvent[][];
  /** Stimme, die gerade bearbeitet wird; ihre Noten stehen auch in doc.events */
  aktiv: number;
  /** Liedtext unter dem Sopran, Silben durch Leerzeichen getrennt */
  text?: string;
  /** Andere Besetzung als SATB, z. B. zwei Stimmen im Kontrapunkt */
  besetzung?: StimmInfo[];
  /** Kontrapunkt-Aufgabe: Gattung und Stimme des Cantus firmus (0 = oben, 1 = unten) */
  kontrapunkt?: { gattung: Gattung; cf: 0 | 1 };
  /** Vorgegebene Stimmen, die nicht bearbeitet werden (z. B. der Cantus firmus) */
  gesperrt?: number[];
  /** Klaviersatz: Melodie (oben) mit Begleitung (unten) */
  klavier?: true;
  /** Ensemble: Instrument je Stimme (von oben nach unten) */
  ensemble?: string[];
  /** Partitur transponiert anzeigen (sonst klingend); gespeichert wird immer klingend */
  transponiert?: boolean;
}

export interface StimmInfo {
  id: string;
  name: string;
  clef: Clef;
  staff: number;
  stem?: 'up' | 'down';
  instrument?: string;
  kurz?: string;
}

export const STIMMEN: StimmInfo[] = SATB;

/** Die Stimmen eines Satzes (SATB, wenn nichts anderes festgelegt ist) */
export function stimmenVon(satz: Satzdaten | undefined): StimmInfo[] {
  return satz?.besetzung ?? STIMMEN;
}

/** Ein Kontrapunkt-Dokument: Cantus firmus vorgegeben und gesperrt, die Gegenstimme ist aktiv */
export function kpDoc(basis: EditorDoc, gattung: Gattung, cf: 0 | 1, cantus: NoteEvent[], kontrapunkt: NoteEvent[] = []): EditorDoc {
  const kp = (1 - cf) as 0 | 1;
  const stimmen = cf === 0 ? [structuredClone(cantus), kontrapunkt] : [kontrapunkt, structuredClone(cantus)];
  const besetzung = kpBesetzung(cf);
  return { ...basis, clef: besetzung[kp].clef, events: stimmen[kp], satz: { stimmen, aktiv: kp, besetzung, kontrapunkt: { gattung, cf }, gesperrt: [cf] } };
}

/** Freier zweistimmiger Satz (Invention): beide Stimmen offen, optional mit vorgegebenem Beginn */
export function freiDoc(basis: EditorDoc, oben: NoteEvent[] = [], unten: NoteEvent[] = []): EditorDoc {
  const besetzung: StimmInfo[] = [
    { id: 'O', name: 'Oberstimme', clef: 'treble', staff: 0 },
    { id: 'U', name: 'Unterstimme', clef: 'bass', staff: 1 },
  ];
  const stimmen = [structuredClone(oben), structuredClone(unten)];
  const aktiv = oben.length && !unten.length ? 1 : 0;
  return { ...basis, clef: besetzung[aktiv].clef, events: stimmen[aktiv], satz: { stimmen, aktiv, besetzung, kontrapunkt: { gattung: 'frei', cf: 1 }, gesperrt: [] } };
}

export const KLAVIER_BESETZUNG: StimmInfo[] = [
  { id: 'M', name: 'Melodie', clef: 'treble', staff: 0 },
  { id: 'B', name: 'Begleitung', clef: 'bass', staff: 1 },
];

/** Klaviersatz: Melodie im oberen, Begleitung im unteren System; Vorgaben sind gesperrt, wenn die andere Stimme offen ist */
export function klavierDoc(basis: EditorDoc, melodie: NoteEvent[] = [], begleitung: NoteEvent[] = [], sperren = false): EditorDoc {
  const stimmen = [structuredClone(melodie), structuredClone(begleitung)];
  const aktiv = melodie.length && !begleitung.length ? 1 : 0;
  const gesperrt = sperren && stimmen[1 - aktiv].length ? [1 - aktiv] : [];
  return { ...basis, clef: KLAVIER_BESETZUNG[aktiv].clef, events: stimmen[aktiv], satz: { stimmen, aktiv, besetzung: KLAVIER_BESETZUNG, klavier: true, gesperrt } };
}

/** Besetzung eines Ensembles: jedes Instrument auf eigenem System */
export function ensembleBesetzung(ids: string[]): StimmInfo[] {
  const namen = stimmNamen(ids);
  return ids.map((id, k) => ({ id: `I${k}`, name: namen[k].name, kurz: namen[k].kurz, clef: instrument(id)!.schluessel, staff: k, instrument: id }));
}

/** Ensemble-Dokument: alle Stimmen offen; gesperrt sind Stimmen mit Vorgabe, wenn andere noch leer sind */
export function ensembleDoc(basis: EditorDoc, ids: string[], vorgabe: NoteEvent[][] = [], sperren = false): EditorDoc {
  const stimmen = ids.map((_, k) => structuredClone(vorgabe[k] ?? []));
  const besetzung = ensembleBesetzung(ids);
  const leer = stimmen.findIndex((st) => st.length === 0);
  const aktiv = Math.max(0, leer);
  const gesperrt = sperren && leer >= 0 ? stimmen.flatMap((st, k) => (st.length ? [k] : [])) : [];
  return { ...basis, clef: besetzung[aktiv].clef, events: stimmen[aktiv], satz: { stimmen, aktiv, besetzung, ensemble: ids, gesperrt } };
}

/** Zwei Stimmen auf zwei Systemen: Cantus firmus oben (cf = 0) oder unten (cf = 1) */
export function kpBesetzung(cf: 0 | 1): StimmInfo[] {
  return [
    { id: 'O', name: cf === 0 ? 'Cantus firmus' : 'Kontrapunkt', clef: 'treble', staff: 0 },
    { id: 'U', name: cf === 1 ? 'Cantus firmus' : 'Kontrapunkt', clef: 'bass', staff: 1 },
  ];
}

/** Schreibt die Noten der aktiven Stimme (doc.events) zurück in die Satzdaten */
export function synchron(doc: EditorDoc): EditorDoc {
  const s = doc.satz;
  if (!s || s.stimmen[s.aktiv] === doc.events) return doc;
  const stimmen = s.stimmen.slice();
  stimmen[s.aktiv] = doc.events;
  return { ...doc, satz: { ...s, stimmen } };
}

/** Wechselt die bearbeitete Stimme */
export function aktiviere(doc: EditorDoc, aktiv: number): EditorDoc {
  const d = synchron(doc);
  if (!d.satz || aktiv < 0 || aktiv >= d.satz.stimmen.length || d.satz.gesperrt?.includes(aktiv)) return d;
  return { ...d, satz: { ...d.satz, aktiv }, events: d.satz.stimmen[aktiv], clef: stimmenVon(d.satz)[aktiv].clef };
}

/** Macht aus einer Melodie einen vierstimmigen Satz (die Melodie wird Sopran) oder umgekehrt */
export function alsSatz(doc: EditorDoc, an: boolean): EditorDoc {
  if (an && !doc.satz) {
    const sopran = doc.clef === 'treble' ? doc.events : [];
    const stimmen = [sopran, [], [], []];
    const title = doc.title === 'Meine Melodie' ? 'Mein Chorsatz' : doc.title;
    return { ...doc, title, clef: 'treble', events: sopran, satz: { stimmen, aktiv: 0 } };
  }
  if (!an && doc.satz) {
    const d = synchron(doc);
    const { satz, ...rest } = d;
    return { ...rest, clef: 'treble', events: satz!.stimmen[0] };
  }
  return doc;
}

/** Fügt einen Akkord (höchster Ton zuerst) am Ende der Stimmen an: Sopran, Alt, Tenor, Bass */
export function akkordAnfuegen(doc: EditorDoc, toene: Pitch[], dauer: NoteEvent['duration']): EditorDoc {
  const d = synchron(doc);
  if (!d.satz) return d;
  const sortiert = [...toene].sort((a, b) => toMidiLocal(b) - toMidiLocal(a)).slice(0, 4);
  const stimmen = d.satz.stimmen.map((st, i) => (sortiert[i] ? [...st, { pitch: sortiert[i], duration: { ...dauer } }] : st));
  return { ...d, satz: { ...d.satz, stimmen }, events: stimmen[d.satz.aktiv] };
}

const SEMI: Record<Pitch['step'], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const toMidiLocal = (p: Pitch) => (p.octave + 1) * 12 + SEMI[p.step] + (p.alter ?? 0);

export interface SatzRebar {
  score: Score;
  /** Kennung → Index in der aktiven Stimme */
  sourceOf: Map<string, number>;
  partsOf: Map<number, string[]>;
  /** Kennung → [Stimme, Index] für alle Stimmen */
  stimmeVon: Map<string, [number, number]>;
  missing: number;
}

/** Wie rebar(), aber für alle vier Stimmen; kürzere Stimmen werden mit Pausen aufgefüllt */
export function rebarSatz(doc: EditorDoc, stumm: boolean[] = []): SatzRebar {
  const d = synchron(doc);
  const satz = d.satz!;
  const besetzung = stimmenVon(satz);
  const teile = satz.stimmen.map((events, i) => rebar({ ...d, clef: besetzung[i].clef, events: mitText(events, i === 0 ? satz.text : undefined) }));
  const takte = Math.max(1, ...teile.map((t, i) => (satz.stimmen[i].length ? t.score.voices[0].measures.length : 0)));
  const voll = measureLength(d.time);
  const stimmeVon = new Map<string, [number, number]>();
  const sourceOf = new Map<string, number>();
  const partsOf = new Map<number, string[]>();

  const voices = teile.map((t, i) => {
    const measures = t.score.voices[0].measures.map((m) => ({ notes: stumm[i] ? m.notes.map((n) => ({ duration: n.duration })) : m.notes }));
    if (satz.stimmen[i].length === 0) measures.length = 0;
    while (measures.length < takte) measures.push({ notes: decompose(voll).map((dd) => ({ duration: dd })) });
    t.sourceOf.forEach((idx, id) => {
      const neu = `${i}${id.slice(id.indexOf('-'))}`;
      stimmeVon.set(neu, [i, idx]);
      if (i === satz.aktiv) sourceOf.set(neu, idx);
    });
    if (i === satz.aktiv) t.partsOf.forEach((ids, idx) => partsOf.set(idx, ids.map((id) => `${i}${id.slice(id.indexOf('-'))}`)));
    const info = besetzung[i];
    return {
      id: info.id,
      name: info.name,
      clef: info.clef,
      staff: info.staff,
      ...(info.stem ? { stem: info.stem } : {}),
      ...(info.instrument ? { instrument: info.instrument, kurz: info.kurz } : {}),
      measures,
    };
  });

  return {
    score: { format: 'kt-score', version: 1, title: d.title, tempo: d.tempo, time: d.time, key: d.key, voices, ...(d.stil ? { stil: d.stil } : {}) },
    sourceOf,
    partsOf,
    stimmeVon,
    missing: teile[satz.aktiv].missing,
  };
}

/** Verteilt den Liedtext auf die Noten des Soprans (übergebundene Noten bekommen keine neue Silbe) */
function mitText(events: NoteEvent[], text: string | undefined): NoteEvent[] {
  if (!text?.trim()) return events;
  const silben = text.split(/\s+/).filter(Boolean);
  let s = 0;
  let gebunden = false;
  return events.map((ev) => {
    const neu = { ...ev };
    delete neu.lyric;
    if (ev.pitch && !gebunden && s < silben.length) neu.lyric = silben[s++];
    gebunden = !!ev.tie;
    return neu;
  });
}

/** Liest einen vierstimmigen Satz aus einer Partitur (sonst null) */
export function satzAusScore(score: Score): Satzdaten | null {
  const ensemble = score.voices.length >= 2 && score.voices.length <= 8 && score.voices.every((v) => instrument(v.instrument)) ? score.voices.map((v) => v.instrument!) : null;
  if (score.voices.length !== 4 && !ensemble) return null;
  const stimmen = score.voices.map((v) => {
    const events = v.measures.flatMap((m) => m.notes.map((n) => structuredClone(n)));
    while (events.length && !events[events.length - 1].pitch) events.pop();
    events.forEach((e) => delete e.lyric);
    return events;
  });
  const silben = score.voices[0].measures.flatMap((m) => m.notes.map((n) => n.lyric).filter(Boolean));
  if (ensemble) return { stimmen, aktiv: 0, besetzung: ensembleBesetzung(ensemble), ensemble, gesperrt: [] };
  return { stimmen, aktiv: 0, ...(silben.length ? { text: silben.join(' ') } : {}) };
}

/** Die Partitur eines Editor-Dokuments, mit allen Stimmen */
export function scoreAusDoc(doc: EditorDoc): Score {
  return doc.satz ? rebarSatz(doc).score : rebar(doc).score;
}

/** Kurzbeschreibung der Besetzung, z. B. „Klaviersatz“ */
export function besetzungsName(doc: EditorDoc): string {
  const s = doc.satz;
  if (!s) return 'Melodie';
  if (s.klavier) return 'Klaviersatz';
  if (s.ensemble) return ensembleName(s.ensemble);
  if (s.kontrapunkt?.gattung === 'frei') return 'Zweistimmig';
  if (s.kontrapunkt) return 'Kontrapunkt';
  return 'Chorsatz';
}

/** Name einer Besetzung: „Streichquartett“ oder die Instrumente aufgezählt */
export function ensembleName(ids: string[]): string {
  const e = ENSEMBLES.find((x) => x.instrumente.join() === ids.join());
  return e ? e.name : ids.map((id) => instrument(id)?.name ?? id).join(', ');
}
