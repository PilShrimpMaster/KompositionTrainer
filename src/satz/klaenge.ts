import { quarterLength } from '../model/duration';
import { eventId } from '../model/ids';
import type { Pitch, Score } from '../model/types';

/** Ein Zusammenklang: was in jeder Stimme zu einem Zeitpunkt klingt */
export interface Klang {
  /** Zeit in Viertelnoten ab Beginn */
  zeit: number;
  /** Takt (ab 0) */
  takt: number;
  /** Klingender Ton je Stimme, null = Pause */
  toene: (Pitch | null)[];
  /** Kennung der Note je Stimme (bei übergebundenen Noten die erste) */
  ids: (string | null)[];
  /** Setzt die Stimme hier neu ein? */
  neu: boolean[];
}

interface Abschnitt {
  start: number;
  ende: number;
  pitch: Pitch | null;
  id: string;
  takt: number;
}

/** Zerlegt einen mehrstimmigen Satz in seine Zusammenklänge (an jedem Notenbeginn einer Stimme) */
export function klaenge(score: Score): Klang[] {
  const taktAnzahl = Math.max(...score.voices.map((v) => v.measures.length));
  // Taktanfänge aus der längsten Stimme je Takt, damit Auftakte stimmen
  const taktStart: number[] = [];
  let t = 0;
  for (let mi = 0; mi < taktAnzahl; mi++) {
    taktStart.push(t);
    t += Math.max(0, ...score.voices.map((v) => (v.measures[mi]?.notes ?? []).reduce((s, n) => s + quarterLength(n.duration), 0)));
  }

  const stimmen: Abschnitt[][] = score.voices.map((v, vi) => {
    const out: Abschnitt[] = [];
    let gebunden = false;
    v.measures.forEach((m, mi) => {
      let pos = taktStart[mi];
      m.notes.forEach((n, ni) => {
        const len = quarterLength(n.duration);
        const letzte = out[out.length - 1];
        if (gebunden && n.pitch && letzte?.pitch) letzte.ende = pos + len;
        else out.push({ start: pos, ende: pos + len, pitch: n.pitch ?? null, id: eventId(vi, mi, ni), takt: mi });
        gebunden = !!n.tie && !!n.pitch;
        pos += len;
      });
    });
    return out;
  });

  const zeiten = [...new Set(stimmen.flatMap((s) => s.map((a) => a.start)))].sort((a, b) => a - b);
  return zeiten.map((zeit) => {
    const toene: (Pitch | null)[] = [];
    const ids: (string | null)[] = [];
    const neu: boolean[] = [];
    let takt = 0;
    stimmen.forEach((s) => {
      const a = s.find((x) => x.start <= zeit + 1e-9 && x.ende > zeit + 1e-9);
      toene.push(a?.pitch ?? null);
      ids.push(a?.id ?? null);
      neu.push(!!a && Math.abs(a.start - zeit) < 1e-9);
      if (a && Math.abs(a.start - zeit) < 1e-9) takt = a.takt;
    });
    return { zeit, takt, toene, ids, neu };
  });
}
