import { describe, expect, it } from 'vitest';
import { intervallvektor, mengeText, normalform, primform, reihenform } from './pcset';

describe('Pitch-Class-Sets', () => {
  it('bestimmt Normalform und Primform', () => {
    expect(normalform([7, 0, 4])).toEqual([0, 4, 7]);
    expect(normalform([11, 0, 1])).toEqual([11, 0, 1]);
    expect(mengeText(primform([0, 4, 7]))).toBe('(037)');
    expect(mengeText(primform([0, 3, 7]))).toBe('(037)');
    expect(mengeText(primform([7, 11, 2, 5]))).toBe('(0258)');
    expect(mengeText(primform([0, 1, 6]))).toBe('(016)');
    expect(mengeText(primform([0, 2, 4, 6, 8, 10]))).toBe('(02468T)');
    expect(mengeText(primform([0, 2, 4, 7, 9]))).toBe('(02479)');
    expect(mengeText(primform([4, 5, 8]))).toBe('(014)');
  });

  it('berechnet Intervallvektor und Reihenformen', () => {
    expect(intervallvektor([0, 4, 7])).toEqual([0, 0, 1, 1, 1, 0]);
    const reihe = [4, 5, 0, 11, 10, 3, 2, 1, 7, 6, 9, 8];
    expect(reihenform(reihe, 'I')).toEqual([4, 3, 8, 9, 10, 5, 6, 7, 1, 2, 11, 0]);
    expect(reihenform(reihe, 'R')).toEqual([...reihe].reverse());
    expect(reihenform(reihe, 'P', 0)[0]).toBe(0);
  });
});
