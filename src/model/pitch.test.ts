import { describe, expect, it } from 'vitest';
import { germanKeyName, germanName, germanNameWithOctave, toMidi, toToneName, toVexKey } from './pitch';

describe('Tonhöhen', () => {
  it('berechnet MIDI-Nummern (c′ = 60)', () => {
    expect(toMidi({ step: 'C', octave: 4 })).toBe(60);
    expect(toMidi({ step: 'A', octave: 4 })).toBe(69);
    expect(toMidi({ step: 'B', alter: -1, octave: 3 })).toBe(58);
    expect(toMidi({ step: 'B', alter: 1, octave: 3 })).toBe(60); // His = c′
  });

  it('nutzt deutsche Tonnamen mit H und B', () => {
    expect(germanName({ step: 'B', octave: 4 })).toBe('H');
    expect(germanName({ step: 'B', alter: -1, octave: 4 })).toBe('B');
    expect(germanName({ step: 'B', alter: -2, octave: 4 })).toBe('Heses');
    expect(germanName({ step: 'B', alter: 1, octave: 4 })).toBe('His');
    expect(germanName({ step: 'F', alter: 1, octave: 4 })).toBe('Fis');
    expect(germanName({ step: 'C', alter: 2, octave: 4 })).toBe('Cisis');
    expect(germanName({ step: 'E', alter: -1, octave: 4 })).toBe('Es');
    expect(germanName({ step: 'A', alter: -1, octave: 4 })).toBe('As');
    expect(germanName({ step: 'A', alter: -2, octave: 4 })).toBe('Ases');
    expect(germanName({ step: 'D', alter: -1, octave: 4 })).toBe('Des');
  });

  it('schreibt Oktavlagen nach Helmholtz', () => {
    expect(germanNameWithOctave({ step: 'C', octave: 4 })).toBe('c′');
    expect(germanNameWithOctave({ step: 'A', octave: 3 })).toBe('a');
    expect(germanNameWithOctave({ step: 'C', octave: 2 })).toBe('C');
    expect(germanNameWithOctave({ step: 'A', octave: 0 })).toBe('A₂');
    expect(germanNameWithOctave({ step: 'F', alter: 1, octave: 5 })).toBe('fis″');
  });

  it('erzeugt Namen für Tone.js und VexFlow', () => {
    expect(toToneName({ step: 'F', alter: 1, octave: 4 })).toBe('F#4');
    expect(toToneName({ step: 'B', alter: -1, octave: 2 })).toBe('Bb2');
    expect(toVexKey({ step: 'E', alter: -1, octave: 5 })).toBe('eb/5');
  });

  it('benennt Tonarten deutsch', () => {
    expect(germanKeyName({ fifths: 2, mode: 'major' })).toBe('D-Dur');
    expect(germanKeyName({ fifths: -2, mode: 'major' })).toBe('B-Dur');
    expect(germanKeyName({ fifths: 3, mode: 'minor' })).toBe('fis-Moll');
    expect(germanKeyName({ fifths: 5, mode: 'major' })).toBe('H-Dur');
    expect(germanKeyName({ fifths: -3, mode: 'major' })).toBe('Es-Dur');
  });
});
