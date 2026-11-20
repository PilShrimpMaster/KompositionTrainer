import { measureLength, quarterLength } from '../model/duration';
import { toToneName } from '../model/pitch';
import type { Score } from '../model/types';
import { eventId } from '../model/ids';
import { instrument } from '../model/instrumente';

export interface ScheduledEvent {
  /** Kennung der Note im Notenbild (für die Markierung) */
  id: string;
  /** Beginn in Viertelnoten ab Stückanfang */
  start: number;
  /** Klingende Dauer in Viertelnoten (Haltebögen zusammengefasst); 0 = nur markieren */
  length: number;
  /** Tonname für Tone.js; fehlt bei Pausen */
  note?: string;
  /** Lautstärke 0–1 */
  velocity?: number;
  /** Instrumentenklang; fehlt er, klingt das Klavier */
  klang?: string;
}

/**
 * Wandelt das Notenmodell in eine zeitliche Abfolge von Ereignissen um.
 * Ein Auftakt (erster Takt kürzer als die Taktart) beginnt sofort.
 */
export function buildSchedule(score: Score): { events: ScheduledEvent[]; total: number } {
  const events: ScheduledEvent[] = [];
  const bar = measureLength(score.time);
  let total = 0;

  score.voices.forEach((voice, vi) => {
    const klang = instrument(voice.instrument)?.klang;
    let t = 0;
    let tieFrom: ScheduledEvent | null = null;

    voice.measures.forEach((m, mi) => {
      m.notes.forEach((ev, ni) => {
        const len = quarterLength(ev.duration);
        const id = eventId(vi, mi, ni);
        if (ev.pitch) {
          const note = toToneName(ev.pitch);
          if (tieFrom && tieFrom.note === note) {
            tieFrom.length += len;
            events.push({ id, start: t, length: 0 });
          } else {
            const e: ScheduledEvent = { id, start: t, length: len, note };
            if (ev.velocity) e.velocity = ev.velocity / 127;
            if (klang) e.klang = klang;
            events.push(e);
            tieFrom = e;
          }
          if (!ev.tie) tieFrom = null;
        } else {
          events.push({ id, start: t, length: len });
          tieFrom = null;
        }
        t += len;
      });
      // Unvollständige Takte (außer Auftakt) auffüllen, damit Stimmen synchron bleiben
      if (mi > 0) {
        const filled = m.notes.reduce((s, n) => s + quarterLength(n.duration), 0);
        if (filled < bar) t += bar - filled;
      }
    });
    total = Math.max(total, t);
  });

  events.sort((a, b) => a.start - b.start);
  return { events, total };
}
