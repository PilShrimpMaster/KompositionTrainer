import { describe, expect, it } from 'vitest';
import { instrument, klingend, lagePruefen, notiert, notierteTonart, umfangText } from './instrumente';
import { germanNameWithOctave } from './pitch';
import type { Pitch } from './types';

const p = (step: Pitch['step'], octave: number, alter?: number): Pitch => (alter ? { step, octave, alter } : { step, octave });

describe('Transponierende Instrumente', () => {
  it('notiert das Altsaxophon eine große Sexte höher', () => {
    const alt = instrument('altsax')!;
    expect(notiert(p('C', 4), alt)).toEqual(p('A', 4));
    expect(notiert(p('E', 4, -1), alt)).toEqual(p('C', 5));
    expect(klingend(p('F', 5, 1), alt)).toEqual(p('A', 4));
    expect(notierteTonart({ fifths: 0, mode: 'major' }, alt).fifths).toBe(3);
    expect(notierteTonart({ fifths: -1, mode: 'major' }, alt).fifths).toBe(2);
  });

  it('kennt Klarinette und Trompete in B, Horn in F und Tenorsaxophon', () => {
    expect(notiert(p('B', 3, -1), instrument('klarinette')!)).toEqual(p('C', 4));
    expect(notierteTonart({ fifths: -2, mode: 'major' }, instrument('trompete')!).fifths).toBe(0);
    expect(notiert(p('C', 4), instrument('horn')!)).toEqual(p('G', 4));
    expect(notierteTonart({ fifths: -1, mode: 'major' }, instrument('horn')!).fifths).toBe(0);
    expect(notiert(p('B', 2, -1), instrument('tenorsax')!)).toEqual(p('C', 4));
    expect(notierteTonart({ fifths: 6, mode: 'major' }, instrument('altsax')!).fifths).toBe(-3);
  });

  it('prüft Umfang und Lage', () => {
    const alt = instrument('altsax')!;
    const r = lagePruefen([p('C', 3), p('G', 4), p('A', 4)], alt);
    expect(r.ausserhalb.map(germanNameWithOctave)).toEqual(['c']);
    expect(r.anteilLage).toBeCloseTo(2 / 3);
    expect(umfangText(alt)).toBe('des bis a″');
  });
});
