import { describe, expect, it } from 'vitest';
import { germanName } from '../model/pitch';
import type { Pitch } from '../model/types';
import { diktatRichtig, erzeugeAufgabe, stufeFuer, UEBUNGEN, type Stufe } from './aufgaben';
import { berechneFortschritt } from './fortschritt';
import { dreiklang, dreiklangArt, dreiklangName, intervall, intervallName } from './theorie';

const p = (step: Pitch['step'], octave: number, alter?: number): Pitch => (alter ? { step, alter, octave } : { step, octave });

function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('Intervalle', () => {
  it('benennt Intervalle deutsch', () => {
    expect(intervallName(intervall(p('C', 4), p('E', 4)))).toBe('große Terz');
    expect(intervallName(intervall(p('E', 4), p('C', 5)))).toBe('kleine Sexte');
    expect(intervallName(intervall(p('F', 4), p('B', 4)))).toBe('übermäßige Quarte');
    expect(intervallName(intervall(p('B', 3), p('F', 4)))).toBe('verminderte Quinte');
    expect(intervallName(intervall(p('C', 4), p('C', 5)))).toBe('reine Oktave');
    expect(intervallName(intervall(p('D', 4), p('C', 5)))).toBe('kleine Septime');
    expect(intervallName(intervall(p('C', 4, 1), p('E', 4, -1)))).toBe('verminderte Terz');
    expect(intervallName(intervall(p('C', 4), p('E', 5)))).toBe('große Terz'); // Dezime → Terz
  });
});

describe('Dreiklänge', () => {
  it('baut und erkennt Dreiklänge richtig geschrieben', () => {
    expect(dreiklang(p('D', 4), 'Dur').map(germanName)).toEqual(['D', 'Fis', 'A']);
    expect(dreiklang(p('B', 3, -1), 'Dur').map(germanName)).toEqual(['B', 'D', 'F']);
    expect(dreiklang(p('B', 3), 'vermindert').map(germanName)).toEqual(['H', 'D', 'F']);
    expect(dreiklang(p('C', 4), 'übermäßig').map(germanName)).toEqual(['C', 'E', 'Gis']);
    expect(dreiklang(p('F', 4, 1), 'Moll').map(germanName)).toEqual(['Fis', 'A', 'Cis']);
    expect(dreiklangArt(dreiklang(p('E', 4, -1), 'Moll'))).toBe('Moll');
    expect(dreiklangName(p('F', 4, 1), 'Moll')).toBe('fis-Moll');
  });
});

describe('Aufgaben-Generatoren', () => {
  const rng = seeded(42);
  for (const u of UEBUNGEN) {
    for (const stufe of [1, 2, 3] as Stufe[]) {
      it(`${u.titel}, Stufe ${stufe}: gültige Aufgaben`, () => {
        for (let i = 0; i < 60; i++) {
          const a = erzeugeAufgabe(u.typ, stufe, rng);
          expect(a.frage.length).toBeGreaterThan(5);
          expect(a.erklaerung.length).toBeGreaterThan(5);
          if (a.diktat) {
            expect(a.diktat.length).toBeGreaterThanOrEqual(4);
            continue;
          }
          expect(a.optionen).toContain(a.loesung);
          expect(new Set(a.optionen).size).toBe(a.optionen.length);
          expect(a.optionen.length).toBeGreaterThanOrEqual(2);
          if (u.hoeren) expect(a.klang).toBeDefined();
        }
      });
    }
  }

  it('prüft Intervalle in der Aufgabe gegen die Theorie', () => {
    for (let i = 0; i < 100; i++) {
      const a = erzeugeAufgabe('intervall-lesen', 3, rng);
      const [[u], [o]] = a.noten!.groups;
      expect(intervallName(intervall(u, o))).toBe(a.loesung);
    }
  });

  it('prüft Diktate nach Tonhöhe', () => {
    expect(diktatRichtig([p('C', 4), p('D', 4), p('E', 4)], [60, 62, 63])).toEqual([true, true, false]);
  });
});

describe('Fortschritt', () => {
  it('wird sicher ab 15 Aufgaben mit 85 %', () => {
    const e = (richtig: boolean, zeit: number) => ({ richtig, zeit });
    const zehn = Array.from({ length: 10 }, (_, i) => e(true, i));
    expect(berechneFortschritt('m', zehn).status).toBe('begonnen');
    const zwanzig = [...zehn, ...Array.from({ length: 10 }, (_, i) => e(i !== 0, 10 + i))];
    const f = berechneFortschritt('m', zwanzig);
    expect(f.status).toBe('sicher');
    expect(f.sicherheit).toBeCloseTo(0.95);
    expect(berechneFortschritt('m', []).status).toBe('offen');
  });

  it('steigert die Schwierigkeit mit der Sicherheit', () => {
    expect(stufeFuer(0.2)).toBe(1);
    expect(stufeFuer(0.6)).toBe(2);
    expect(stufeFuer(0.9)).toBe(3);
  });
});
