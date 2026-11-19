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
    return lower + (['', '′', '″', '‴'][strokes] ?? '′'.repeat(strokes));
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

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_ORDER: Step[] = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER: Step[] = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/** Vorzeichen, das die Tonart einem Stammton gibt (z. B. F in D-Dur → +1) */
export function keyAlter(step: Step, fifths: number): number {
  if (fifths > 0) return SHARP_ORDER.slice(0, fifths).includes(step) ? 1 : 0;
  if (fifths < 0) return FLAT_ORDER.slice(0, -fifths).includes(step) ? -1 : 0;
  return 0;
}

/** Fortlaufende Stammtonnummer: C0 = 0, D0 = 1 … c′ (C4) = 28 */
export function diatonicIndex(p: Pick<Pitch, 'step' | 'octave'>): number {
  return p.octave * 7 + STEPS.indexOf(p.step);
}

/** Tonhöhe aus Stammtonnummer, mit dem Vorzeichen der Tonart */
export function fromDiatonic(d: number, fifths: number): Pitch {
  const octave = Math.floor(d / 7);
  const step = STEPS[((d % 7) + 7) % 7];
  const alter = keyAlter(step, fifths);
  return alter ? { step, alter, octave } : { step, octave };
}

/** Stammtonnummer der obersten Notenlinie (Violinschlüssel f″, Bassschlüssel a) */
export function topLineDiatonic(clef: 'treble' | 'bass'): number {
  return clef === 'treble' ? diatonicIndex({ step: 'F', octave: 5 }) : diatonicIndex({ step: 'A', octave: 3 });
}

/** Tonhöhe an einer y-Position im Notensystem (halber Linienabstand = ein Stammton) */
export function pitchAtY(
  y: number,
  staff: { topLineY: number; spacing: number; clef: 'treble' | 'bass' },
  fifths: number,
): Pitch {
  const steps = Math.round((y - staff.topLineY) / (staff.spacing / 2));
  // höchstens 5 Hilfslinien über und unter dem System
  const clamped = Math.max(-12, Math.min(20, steps));
  return fromDiatonic(topLineDiatonic(staff.clef) - clamped, fifths);
}

/** Um `steps` Stammtöne verschieben, Vorzeichen nach Tonart */
export function moveDiatonic(p: Pitch, steps: number, fifths: number): Pitch {
  return fromDiatonic(diatonicIndex(p) + steps, fifths);
}

/**
 * Stammton in der Oktave, die dem Bezugston am nächsten liegt
 * (wie bei der Buchstabeneingabe in Notenprogrammen).
 */
export function nearestOctave(step: Step, alter: number, ref: Pitch | null, fallbackOctave: number): Pitch {
  const make = (octave: number): Pitch => (alter ? { step, alter, octave } : { step, octave });
  if (!ref) return make(fallbackOctave);
  const refMidi = toMidi(ref);
  let best = make(ref.octave);
  for (const o of [ref.octave - 1, ref.octave, ref.octave + 1]) {
    const cand = make(o);
    if (Math.abs(toMidi(cand) - refMidi) < Math.abs(toMidi(best) - refMidi)) best = cand;
  }
  return best;
}

const SHARP_SPELL: [Step, number][] = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];
const FLAT_SPELL: [Step, number][] = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

/**
 * Schreibweise einer MIDI-Taste passend zur Tonart: zuerst die leitereigenen Töne
 * (Fis in D-Dur, B in F-Dur), sonst Kreuze bei Kreuztonarten und Bs bei B-Tonarten.
 */
export function spellMidi(midi: number, fifths: number): Pitch {
  const pc = ((midi % 12) + 12) % 12;
  for (const step of STEPS) {
    const alter = keyAlter(step, fifths);
    const sp = (STEP_SEMITONES[step] + alter + 12) % 12;
    if (sp === pc) {
      // Ces und His liegen in der Nachbaroktave
      const octave = Math.floor(midi / 12) - 1 + (step === 'C' && alter < 0 ? 1 : 0) - (step === 'B' && alter > 0 ? 1 : 0);
      return alter ? { step, alter, octave } : { step, octave };
    }
  }
  const [step, alter] = (fifths < 0 ? FLAT_SPELL : SHARP_SPELL)[pc];
  const octave = Math.floor(midi / 12) - 1;
  return alter ? { step, alter, octave } : { step, octave };
}
