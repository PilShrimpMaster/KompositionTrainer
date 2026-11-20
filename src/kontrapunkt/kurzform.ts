import { rebar } from '../editor/rebar';
import { parseNotenfolge, parseTakt, parseTonart } from '../lernpfad/kompakt';
import type { Clef, Score, Voice } from '../model/types';
import { toMidi } from '../model/pitch';

export interface KpKurzform {
  titel: string;
  /** Vorzeichen wie bei Sätzen, z. B. „0“ (auch für Kirchentonarten ohne Vorzeichen) */
  tonart?: string;
  takt?: string;
  tempo?: number;
  oben: string;
  unten: string;
  /** Namen der beiden Stimmen, z. B. „Kontrapunkt“ und „Cantus firmus“ */
  namen?: [string, string];
  schluessel?: [Clef, Clef];
}

/** Zweistimmiger Satz auf zwei Systemen aus der Kurzform */
export function kpSatz(k: KpKurzform): Score {
  const key = parseTonart(k.tonart ?? '0');
  const time = parseTakt(k.takt ?? '4/4');
  const namen = k.namen ?? ['Oberstimme', 'Unterstimme'];
  const folgen = [k.oben, k.unten].map(parseNotenfolge);
  // Ohne Angabe: Schlüssel nach der mittleren Tonhöhe der Stimme
  const passend = (evs: ReturnType<typeof parseNotenfolge>): Clef => {
    const t = evs.filter((e) => e.pitch).map((e) => toMidi(e.pitch!));
    return t.length && t.reduce((a, b) => a + b, 0) / t.length < 57 ? 'bass' : 'treble';
  };
  const schluessel = k.schluessel ?? [passend(folgen[0]), passend(folgen[1])];
  const voices: Voice[] = folgen.map((events, i) => {
    const s = rebar({ title: k.titel, tempo: k.tempo ?? 80, time, key, clef: schluessel[i], events }).score;
    return { ...s.voices[0], id: i === 0 ? 'O' : 'U', name: namen[i], clef: schluessel[i], staff: i };
  });
  return { format: 'kt-score', version: 1, title: k.titel, tempo: k.tempo ?? 80, time, key, voices };
}
