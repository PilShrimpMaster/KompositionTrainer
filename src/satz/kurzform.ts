import { rebar } from '../editor/rebar';
import { parseNotenfolge, parseTakt, parseTonart } from '../lernpfad/kompakt';
import type { Clef, Score, Voice } from '../model/types';

export const SATB = [
  { id: 'S', name: 'Sopran', clef: 'treble' as Clef, staff: 0, stem: 'up' as const },
  { id: 'A', name: 'Alt', clef: 'treble' as Clef, staff: 0, stem: 'down' as const },
  { id: 'T', name: 'Tenor', clef: 'bass' as Clef, staff: 1, stem: 'up' as const },
  { id: 'B', name: 'Bass', clef: 'bass' as Clef, staff: 1, stem: 'down' as const },
];

export interface SatzKurzform {
  titel: string;
  komponist?: string;
  /** z. B. „1“ (G-Dur) oder „-2 moll“ (g-Moll) */
  tonart: string;
  takt?: string;
  tempo?: number;
  /** Sopran, Alt, Tenor, Bass in Kurzform, z. B. „G4:4 A4 B4 C5“ */
  stimmen: [string, string, string, string];
  /** Liedtext unter dem Sopran, Silben durch Leerzeichen getrennt („Lo- be den“) */
  text?: string;
}

/** Baut einen vierstimmigen Satz auf zwei Systemen aus der Kurzform */
export function satz(k: SatzKurzform): Score {
  const key = parseTonart(k.tonart);
  const time = parseTakt(k.takt ?? '4/4');
  const silben = k.text ? k.text.split(/\s+/).filter(Boolean) : [];
  const voices: Voice[] = SATB.map((info, i) => {
    const events = parseNotenfolge(k.stimmen[i]);
    if (i === 0 && silben.length) {
      let s = 0;
      let gebunden = false;
      for (const ev of events) {
        if (ev.pitch && !gebunden && s < silben.length) ev.lyric = silben[s++];
        gebunden = !!ev.tie;
      }
    }
    const score = rebar({ title: k.titel, tempo: k.tempo ?? 72, time, key, clef: info.clef, events }).score;
    return { ...score.voices[0], id: info.id, name: info.name, clef: info.clef, staff: info.staff, stem: info.stem };
  });
  return {
    format: 'kt-score',
    version: 1,
    title: k.titel,
    ...(k.komponist ? { composer: k.komponist } : {}),
    tempo: k.tempo ?? 72,
    time,
    key,
    voices,
  };
}
