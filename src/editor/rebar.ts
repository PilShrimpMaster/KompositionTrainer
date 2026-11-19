import { measureLength, quarterLength } from '../model/duration';
import { eventId } from '../model/ids';
import type { Clef, Duration, KeySignature, NoteEvent, Score, TimeSignature } from '../model/types';

/** Ein einstimmiges Stück, wie der Editor es bearbeitet: eine fortlaufende Folge von Noten. */
export interface EditorDoc {
  title: string;
  tempo: number;
  time: TimeSignature;
  key: KeySignature;
  clef: Clef;
  events: NoteEvent[];
}

export interface RebarResult {
  score: Score;
  /** Anzeige-Kennung → Index der Note in `events` */
  sourceOf: Map<string, number>;
  /** Index der Note → alle Anzeige-Kennungen (eine Note kann über den Taktstrich gebunden sein) */
  partsOf: Map<number, string[]>;
  /** Was im letzten Takt noch fehlt, in Viertelnoten (0 = voll); wird mit Pausen aufgefüllt */
  missing: number;
}

/** Darstellbare Notenwerte von lang nach kurz (mit Punktierungen) */
const CANDIDATES: Duration[] = [
  { type: 'whole', dots: 1 },
  { type: 'whole' },
  { type: 'half', dots: 1 },
  { type: 'half' },
  { type: 'quarter', dots: 1 },
  { type: 'quarter' },
  { type: 'eighth', dots: 1 },
  { type: 'eighth' },
  { type: '16th', dots: 1 },
  { type: '16th' },
];

const EPS = 1e-9;

/** Zerlegt eine Länge (in Vierteln) in darstellbare Notenwerte, längster zuerst. */
export function decompose(q: number): Duration[] {
  const out: Duration[] = [];
  let rest = q;
  while (rest > EPS) {
    const d = CANDIDATES.find((c) => quarterLength(c) <= rest + EPS);
    if (!d) break; // kürzer als eine Sechzehntel: wird verworfen
    out.push(d.dots ? { type: d.type, dots: d.dots } : { type: d.type });
    rest -= quarterLength(d);
  }
  return out;
}

/**
 * Verteilt die Noten auf Takte. Eine Note, die über den Taktstrich reicht,
 * wird geteilt und mit Haltebogen verbunden; eine Pause wird einfach geteilt.
 */
export function rebar(doc: EditorDoc): RebarResult {
  const bar = measureLength(doc.time);
  const measures: { notes: NoteEvent[] }[] = [{ notes: [] }];
  const sourceOf = new Map<string, number>();
  const partsOf = new Map<number, string[]>();
  let pos = 0; // Position im aktuellen Takt

  const place = (ev: NoteEvent, src: number) => {
    let m = measures[measures.length - 1];
    if (pos >= bar - EPS) {
      m = { notes: [] };
      measures.push(m);
      pos = 0;
    }
    const id = eventId(0, measures.length - 1, m.notes.length);
    m.notes.push(ev);
    sourceOf.set(id, src);
    partsOf.set(src, [...(partsOf.get(src) ?? []), id]);
    pos += quarterLength(ev.duration);
  };

  doc.events.forEach((ev, src) => {
    let remaining = quarterLength(ev.duration);
    let first = true;
    while (remaining > EPS) {
      if (pos >= bar - EPS) {
        measures.push({ notes: [] });
        pos = 0;
      }
      const room = bar - pos;
      const chunk = Math.min(remaining, room);
      // Passt die Note unverändert, behält sie ihren Notenwert
      const durations = first && chunk === remaining ? [ev.duration] : decompose(chunk);
      remaining -= chunk;
      durations.forEach((d, i) => {
        const isLastPart = remaining <= EPS && i === durations.length - 1;
        const part: NoteEvent = { duration: d };
        if (ev.pitch) {
          part.pitch = ev.pitch;
          if (ev.velocity) part.velocity = ev.velocity;
          if (!isLastPart || ev.tie) part.tie = true;
        }
        place(part, src);
      });
      first = false;
    }
  });

  const lastLen = measures[measures.length - 1].notes.reduce((s, n) => s + quarterLength(n.duration), 0);
  const missing = doc.events.length === 0 ? 0 : Math.max(0, bar - lastLen);
  // Letzten Takt mit Pausen auffüllen, damit er vollständig angezeigt und gespeichert wird
  if (missing > EPS) {
    for (const d of decompose(missing).reverse()) measures[measures.length - 1].notes.push({ duration: d });
  }

  const score: Score = {
    format: 'kt-score',
    version: 1,
    title: doc.title,
    tempo: doc.tempo,
    time: doc.time,
    key: doc.key,
    voices: [{ id: 'v1', name: 'Melodie', clef: doc.clef, measures }],
  };
  return { score, sourceOf, partsOf, missing };
}

/**
 * Macht aus einer gemessenen Partitur (erste Stimme) wieder eine fortlaufende Folge für den Editor.
 * Übergebundene Teilnoten bleiben getrennte Noten mit Haltebogen.
 */
export function docFromScore(score: Score): EditorDoc {
  const voice = score.voices[0];
  const events = voice ? voice.measures.flatMap((m) => m.notes.map((n) => structuredClone(n))) : [];
  // Pausen am Ende füllt der Editor selbst wieder auf
  while (events.length && !events[events.length - 1].pitch) events.pop();
  return {
    title: score.title,
    tempo: score.tempo,
    time: score.time,
    key: score.key,
    clef: voice?.clef ?? 'treble',
    events,
  };
}
