import { DURATION_TYPES, measureLength, quarterLength } from './duration';
import type { Score } from './types';

export interface ValidationResult {
  score?: Score;
  errors: string[];
}

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Prüft ein beliebiges JSON-Objekt gegen das Notenmodell.
 * Fehlermeldungen sind deutsch und nennen Stimme, Takt und Note,
 * damit man sie beim Bearbeiten des JSON leicht findet.
 */
export function validateScore(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isObj(data)) return { errors: ['Die Datei muss ein JSON-Objekt sein.'] };

  if (data.format !== 'kt-score') errors.push('„format“ muss "kt-score" sein.');
  if (data.version !== 1) errors.push('„version“ muss 1 sein.');
  if (typeof data.title !== 'string') errors.push('„title“ fehlt.');
  if (typeof data.tempo !== 'number' || data.tempo < 20 || data.tempo > 300)
    errors.push('„tempo“ muss eine Zahl zwischen 20 und 300 sein.');

  const time = data.time;
  let barLength = 0;
  if (!isObj(time) || typeof time.beats !== 'number' || ![1, 2, 4, 8, 16].includes(time.beatType as number)) {
    errors.push('„time“ braucht „beats“ (Zahl) und „beatType“ (1, 2, 4, 8 oder 16).');
  } else {
    barLength = measureLength({ beats: time.beats, beatType: time.beatType as number });
  }

  const key = data.key;
  if (
    !isObj(key) ||
    typeof key.fifths !== 'number' ||
    !Number.isInteger(key.fifths) ||
    key.fifths < -7 ||
    key.fifths > 7 ||
    (key.mode !== 'major' && key.mode !== 'minor')
  ) {
    errors.push('„key“ braucht „fifths“ (-7 bis 7) und „mode“ ("major" oder "minor").');
  }

  if (!Array.isArray(data.voices) || data.voices.length === 0) {
    errors.push('„voices“ muss mindestens eine Stimme enthalten.');
  } else {
    data.voices.forEach((voice, vi) => {
      const vName = `Stimme ${vi + 1}`;
      if (!isObj(voice)) return errors.push(`${vName} ist kein Objekt.`);
      if (voice.clef !== 'treble' && voice.clef !== 'bass')
        errors.push(`${vName}: „clef“ muss "treble" oder "bass" sein.`);
      if (voice.staff !== undefined && (!Number.isInteger(voice.staff) || (voice.staff as number) < 0))
        errors.push(`${vName}: „staff“ muss eine Zahl ab 0 sein.`);
      if (voice.stem !== undefined && voice.stem !== 'up' && voice.stem !== 'down')
        errors.push(`${vName}: „stem“ muss "up" oder "down" sein.`);
      if (!Array.isArray(voice.measures) || voice.measures.length === 0)
        return errors.push(`${vName}: „measures“ fehlt oder ist leer.`);
      const voiceMeasures = voice.measures;
      let pickup = false;

      voice.measures.forEach((m, mi) => {
        const where = `${vName}, Takt ${mi + 1}`;
        if (!isObj(m) || !Array.isArray(m.notes)) return errors.push(`${where}: „notes“ fehlt.`);
        let sum = 0;
        m.notes.forEach((n, ni) => {
          const at = `${where}, Note ${ni + 1}`;
          if (!isObj(n) || !isObj(n.duration) || !DURATION_TYPES.includes(n.duration.type as never)) {
            errors.push(`${at}: ungültige Dauer (erlaubt: ${DURATION_TYPES.join(', ')}).`);
            return;
          }
          const dots = n.duration.dots ?? 0;
          if (typeof dots !== 'number' || dots < 0 || dots > 2) {
            errors.push(`${at}: „dots“ muss 0, 1 oder 2 sein.`);
            return;
          }
          sum += quarterLength({ type: n.duration.type as never, dots });
          if (n.lyric !== undefined && typeof n.lyric !== 'string') errors.push(`${at}: „lyric“ muss Text sein.`);
          if (n.velocity !== undefined && (typeof n.velocity !== 'number' || n.velocity < 1 || n.velocity > 127)) {
            errors.push(`${at}: „velocity“ muss zwischen 1 und 127 liegen.`);
          }
          if (n.pitch !== undefined) {
            const p = n.pitch;
            if (
              !isObj(p) ||
              !STEPS.includes(p.step as string) ||
              typeof p.octave !== 'number' ||
              p.octave < 0 ||
              p.octave > 8 ||
              (p.alter !== undefined && (typeof p.alter !== 'number' || Math.abs(p.alter) > 2))
            ) {
              errors.push(`${at}: ungültige Tonhöhe (step C–B, octave 0–8, alter -2 bis 2).`);
            }
          }
        });
        if (barLength && Math.abs(sum - barLength) > 1e-9) {
          const isPickup = mi === 0 && sum < barLength;
          if (isPickup) pickup = true;
          // Bei Auftakt darf der letzte Takt um den Auftakt kürzer sein
          const isEnd = pickup && mi === voiceMeasures.length - 1 && mi > 0 && sum < barLength;
          if (!isPickup && !isEnd) {
            errors.push(
              `${where}: enthält ${formatQuarters(sum)} statt ${formatQuarters(barLength)} Viertel.`,
            );
          }
        }
      });
    });
  }

  return errors.length ? { errors } : { score: data as unknown as Score, errors };
}

function formatQuarters(q: number): string {
  return q.toLocaleString('de-DE', { maximumFractionDigits: 3 });
}
