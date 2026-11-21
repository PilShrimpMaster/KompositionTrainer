import { rebar, type EditorDoc } from '../editor/rebar';
import { parsePitch, leseFelder } from '../lexikon/parse';
import type { Clef, Duration, DurationType, KeySignature, NoteEvent, Score, TimeSignature } from '../model/types';
import { validateScore } from '../model/validate';

const WERTE: Record<string, DurationType> = { '1': 'whole', '2': 'half', '4': 'quarter', '8': 'eighth', '16': '16th' };

/** „4“, „4.“, „2..“ → Notenwert */
export function parseDauer(s: string): Duration {
  const m = /^(1|2|4|8|16)(\.{0,2})$/.exec(s);
  if (!m) throw new Error(`Unbekannter Notenwert „${s}“`);
  const d: Duration = { type: WERTE[m[1]] };
  if (m[2]) d.dots = m[2].length;
  return d;
}

/** „C4:4“, „F#4:8.“, „r:2“ (Pause), „G4:2~“ (Haltebogen), „C4:2^“ (Fermate); ohne Dauer gilt die vorige */
export function parseNotenfolge(text: string): NoteEvent[] {
  let dauer: Duration = { type: 'quarter' };
  return text
    .split(/[\s|]+/)
    .filter(Boolean)
    .map((tok) => {
      let t = tok;
      const fermata = t.endsWith('^');
      if (fermata) t = t.slice(0, -1);
      const tie = t.endsWith('~');
      if (tie) t = t.slice(0, -1);
      const [ton, d] = t.split(':');
      if (d) dauer = parseDauer(d);
      const ev: NoteEvent = { duration: { ...dauer } };
      if (ton !== 'r') ev.pitch = parsePitch(ton);
      if (tie) ev.tie = true;
      if (fermata) ev.fermata = true;
      return ev;
    });
}

export function parseTonart(s: string): KeySignature {
  const [f, mode] = s.trim().split(/\s+/);
  const fifths = Number(f);
  if (!Number.isInteger(fifths) || Math.abs(fifths) > 7) throw new Error(`Tonart „${s}“ ungültig`);
  return { fifths, mode: mode === 'moll' || mode === 'minor' ? 'minor' : 'major' };
}

export function parseTakt(s: string): TimeSignature {
  const m = /^(\d+)\/(\d+)$/.exec(s.trim());
  if (!m) throw new Error(`Taktart „${s}“ ungültig`);
  return { beats: Number(m[1]), beatType: Number(m[2]) };
}

export function parseSchluessel(s: string | undefined): Clef {
  return s === 'bass' || s === 'Bass' ? 'bass' : 'treble';
}

/**
 * Notenbeispiel für Lektionen. Entweder ein vollständiges kt-score-JSON
 * oder die Kurzform: Kopfzeilen (titel, takt, tonart, schluessel, tempo),
 * danach die Noten, z. B. „C4:4 D4 E4 F4 | G4:2 G4“.
 */
export function parseNotenbeispiel(quelle: string): Score {
  const q = quelle.trim();
  if (q.startsWith('{')) {
    const score = JSON.parse(q);
    const r = validateScore(score);
    if (!r.score) throw new Error(r.errors.join('; '));
    return r.score;
  }
  const zeilen = q.split(/\r?\n/);
  const istKopf = (z: string) => /^(titel|takt|tonart|schluessel|tempo|form|stil|merkmale)\s*:/.test(z.trim());
  const kopf = leseFelder(zeilen.filter(istKopf).join('\n'));
  const noten = zeilen.filter((z) => !istKopf(z)).join('\n');
  const doc: EditorDoc = {
    title: kopf.titel ?? '',
    tempo: kopf.tempo ? Number(kopf.tempo) : 90,
    time: kopf.takt ? parseTakt(kopf.takt) : { beats: 4, beatType: 4 },
    key: kopf.tonart ? parseTonart(kopf.tonart) : { fifths: 0, mode: 'major' },
    clef: parseSchluessel(kopf.schluessel),
    events: parseNotenfolge(noten),
  };
  return rebar(doc).score;
}
