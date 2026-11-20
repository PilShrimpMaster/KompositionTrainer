import { describe, expect, it } from 'vitest';
import { instrument, INSTRUMENTE } from '../model/instrumente';
import { germanName, germanNameWithOctave, toMidi } from '../model/pitch';
import { altschluesselAufgabe, instrumentHoerenAufgabe, LAGE_ANTWORTEN, lageAufgabe } from './orchester';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe('Orchester-Übungen', () => {
  it('Altschlüssel: die Lösung ist der Name der gezeigten Note', () => {
    const rng = seeded(1);
    for (const stufe of [1, 2, 3] as const)
      for (let k = 0; k < 40; k++) {
        const a = altschluesselAufgabe(rng, stufe);
        const ton = a.noten!.groups[0][0];
        expect(a.loesung).toBe(stufe === 3 ? germanNameWithOctave(ton) : germanName(ton));
        expect(a.optionen).toContain(a.loesung);
        expect(new Set(a.optionen).size).toBe(a.optionen!.length);
      }
  });

  it('Instrument erkennen: der Klang liegt in der guten Lage, die Lösung steht in den Optionen', () => {
    const rng = seeded(2);
    for (const stufe of [1, 2, 3] as const)
      for (let k = 0; k < 40; k++) {
        const a = instrumentHoerenAufgabe(rng, stufe);
        const i = INSTRUMENTE.find((x) => x.name === a.loesung)!;
        expect(a.klang?.instrument).toBe(i.id);
        for (const t of a.klang!.toene) expect(toMidi(t)).toBeLessThanOrEqual(i.lage[1]);
        expect(a.optionen).toHaveLength(4);
        expect(a.optionen).toContain(a.loesung);
      }
  });

  it('Lage einschätzen: die Antwort passt zu Umfang und guter Lage', () => {
    const rng = seeded(3);
    const gesehen = new Set<string>();
    for (const stufe of [1, 2, 3] as const)
      for (let k = 0; k < 80; k++) {
        const a = lageAufgabe(rng, stufe);
        gesehen.add(a.loesung);
        const id = a.klang?.instrument;
        if (id) {
          const i = instrument(id)!;
          const m = toMidi(a.noten!.groups[0][0]);
          expect(m >= i.umfang[0] && m <= i.umfang[1]).toBe(true);
          expect(a.loesung === LAGE_ANTWORTEN[0]).toBe(m >= i.lage[0] && m <= i.lage[1]);
        } else expect(a.loesung).toBe(LAGE_ANTWORTEN[2]);
      }
    expect(gesehen.size).toBe(3);
  });
});
