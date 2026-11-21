import { describe, expect, it } from 'vitest';
import { toToneName } from '../model/pitch';
import { akkordBeschreibung, akkordToene, begleitVoicing, parseAkkordsymbol } from './akkordsymbol';

const toene = (s: string) => {
  const a = parseAkkordsymbol(s);
  if (!a) throw new Error(s);
  return akkordToene(a, 4).map(toToneName).join(' ');
};

describe('Akkordsymbole', () => {
  it('liest die üblichen Symbole mit richtiger Schreibweise', () => {
    expect(toene('C')).toBe('C4 E4 G4');
    expect(toene('Cm')).toBe('C4 Eb4 G4');
    expect(toene('C-7')).toBe('C4 Eb4 G4 Bb4');
    expect(toene('Dm7')).toBe('D4 F4 A4 C5');
    expect(toene('G7')).toBe('G4 B4 D5 F5');
    expect(toene('Cmaj7')).toBe('C4 E4 G4 B4');
    expect(toene('CΔ')).toBe('C4 E4 G4 B4');
    expect(toene('F#ø7')).toBe('F#4 A4 C5 E5');
    expect(toene('Bm7b5')).toBe('B4 D5 F5 A5');
    expect(toene('C#dim7')).toBe('C#4 E4 G4 Bb4');
    expect(toene('Bb7#11')).toBe('Bb4 D5 F5 Ab5 E6');
    expect(toene('G7b9')).toBe('G4 B4 D5 F5 Ab5');
    expect(toene('E7#9')).toBe('E4 G#4 B4 D5 G5');
    expect(toene('C13')).toBe('C4 E4 G4 Bb4 D5 A5');
    expect(toene('C6/9')).toBe('C4 E4 G4 A4 D5');
    expect(toene('Csus4')).toBe('C4 F4 G4');
    expect(toene('G7sus4')).toBe('G4 C5 D5 F5');
    expect(toene('C+')).toBe('C4 E4 G#4');
    expect(toene('Cm(maj7)')).toBe('C4 Eb4 G4 B4');
    expect(toene('Ebmaj9')).toBe('Eb4 G4 Bb4 D5 F5');
  });

  it('kennt Slash-Akkorde und lehnt Unsinn ab', () => {
    expect(parseAkkordsymbol('C/E')?.bass).toEqual({ step: 'E', alter: 0 });
    expect(parseAkkordsymbol('C6/9')?.bass).toBeUndefined();
    for (const s of ['', 'H7', 'X', 'C7x', 'C/Q', 'Hallo']) expect(parseAkkordsymbol(s), s).toBeNull();
  });

  it('beschreibt Akkorde auf Deutsch und baut ein Begleit-Voicing', () => {
    expect(akkordBeschreibung(parseAkkordsymbol('Dm7')!)).toBe('Dm7: d-Moll mit kleiner Septime (d f a c)');
    expect(akkordBeschreibung(parseAkkordsymbol('B7')!)).toContain('H-Dur mit kleiner Septime (h dis fis a)');
    expect(akkordBeschreibung(parseAkkordsymbol('Bbmaj7/D')!)).toContain('D im Bass');
    const v = begleitVoicing(parseAkkordsymbol('G7')!).map(toToneName);
    expect(v[0]).toMatch(/^G[23]$/);
    expect(v).toEqual(expect.arrayContaining(['B3', 'F4']));
  });
});
