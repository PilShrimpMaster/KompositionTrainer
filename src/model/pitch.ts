import type { KeySignature, Pitch, Step } from './types';

const STEP_SEMITONES: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI-Nummer: c' (C4) = 60 */
export function toMidi(p: Pitch): number {
  return (p.octave + 1) * 12 + STEP_SEMITONES[p.step] + (p.alter ?? 0);
}

/** Tonname für Tone.js, z. B. „C#4“ oder „Bb3“ */
export function toToneName(p: Pitch): string {
  const alter = p.alter ?? 0;
  const acc = alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  return `${p.step}${acc}${p.octave}`;
}

/** Schlüssel für VexFlow, z. B. „c#/4“ */
export function toVexKey(p: Pitch): string {
  const alter = p.alter ?? 0;
  const acc = alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  return `${p.step.toLowerCase()}${acc}/${p.octave}`;
}

/**
 * Deutscher Tonname ohne Oktave: C, Cis, Ces, D, Dis, Des, E, Eis, Es, …,
 * H (= internationales B), His, B (= Hes/Bb), Heses (= Bbb).
 */
export function germanName(p: Pitch): string {
  const alter = p.alter ?? 0;
  const base = p.step === 'B' ? 'H' : p.step;

  if (alter === 0) return base;
  if (alter > 0) return base + 'is'.repeat(alter);

  // Erniedrigungen
  if (p.step === 'B') return alter === -1 ? 'B' : 'Heses';
  if (p.step === 'E') return 'Es' + 'es'.repeat(-alter - 1);
  if (p.step === 'A') return 'As' + 'es'.repeat(-alter - 1);
  return base + 'es'.repeat(-alter);
}

/**
 * Deutscher Tonname mit Oktavlage nach Helmholtz:
 * Kontra- und Subkontraoktave (C₁, C₂), große Oktave (C), kleine (c),
 * eingestrichene (c′), zweigestrichene (c″) usw.
 */
export function germanNameWithOctave(p: Pitch): string {
  const name = germanName(p);
  if (p.octave >= 3) {
    const lower = name.toLowerCase();
    const strokes = p.octave - 3;
    return lower + (strokes === 0 ? '' : strokes === 1 ? '′' : strokes === 2 ? '″' : '′'.repeat(strokes));
  }
  if (p.octave === 2) return name;
  const sub = ['₁', '₂', '₃'][1 - p.octave] ?? '';
  return name + sub;
}

const MAJOR_KEYS_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Cb', [-6]: 'Gb', [-5]: 'Db', [-4]: 'Ab', [-3]: 'Eb', [-2]: 'Bb', [-1]: 'F',
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
};
const MINOR_KEYS_BY_FIFTHS: Record<number, string> = {
  [-7]: 'Abm', [-6]: 'Ebm', [-5]: 'Bbm', [-4]: 'Fm', [-3]: 'Cm', [-2]: 'Gm', [-1]: 'Dm',
  0: 'Am', 1: 'Em', 2: 'Bm', 3: 'F#m', 4: 'C#m', 5: 'G#m', 6: 'D#m', 7: 'A#m',
};

/** Tonartbezeichnung für VexFlow, z. B. „D“ oder „F#m“ */
export function toVexKeySpec(k: KeySignature): string {
  const table = k.mode === 'minor' ? MINOR_KEYS_BY_FIFTHS : MAJOR_KEYS_BY_FIFTHS;
  const spec = table[k.fifths];
  if (!spec) throw new Error(`Ungültige Anzahl Vorzeichen: ${k.fifths}`);
  return spec;
}

/** Deutsche Tonartbezeichnung, z. B. „D-Dur“, „fis-Moll“, „B-Dur“ */
export function germanKeyName(k: KeySignature): string {
  const spec = toVexKeySpec(k).replace('m', '');
  const step = spec[0] as Step;
  const alter = spec.includes('#') ? 1 : spec.includes('b') ? -1 : 0;
  const name = germanName({ step, alter, octave: 4 });
  return k.mode === 'major' ? `${name}-Dur` : `${name.toLowerCase()}-Moll`;
}
