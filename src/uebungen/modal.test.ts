import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { parseNotenfolge } from '../lernpfad/kompakt';
import { pruefe } from '../lernpfad/pruefung';
import { germanName } from '../model/pitch';
import { modusAufgabe, modusLeiter } from './modal';

describe('Modi', () => {
  it('schreibt die Leitern richtig', () => {
    expect(modusLeiter({ step: 'D', octave: 4 }, 'Dorisch').map(germanName).join(' ')).toBe('D E F G A H C D');
    expect(modusLeiter({ step: 'C', octave: 4 }, 'Lydisch').map(germanName).join(' ')).toBe('C D E Fis G A H C');
    expect(modusLeiter({ step: 'G', octave: 4 }, 'Phrygisch').map(germanName).join(' ')).toBe('G As B C D Es F G');
    expect(modusLeiter({ step: 'F', octave: 4 }, 'Mixolydisch').map(germanName).join(' ')).toBe('F G A B C D Es F');
  });

  it('erzeugt Höraufgaben mit passender Lösung', () => {
    for (const stufe of [1, 2, 3] as const)
      for (let i = 0; i < 30; i++) {
        const a = modusAufgabe(Math.random, stufe);
        expect(a.optionen).toContain(a.loesung);
        expect(a.klang?.folge).toHaveLength(9);
      }
  });

  it('prüft Melodien im Modus', () => {
    const doc = { ...emptyDoc(), events: parseNotenfolge('D4:4 F4 C#4 D4 | B4:2 A4 | D4:1') };
    const [modus, farbe, finalis] = pruefe(doc, ['modus dorisch D', 'charakterton dorisch D', 'finalis D']);
    expect(modus.ok).toBe(false);
    expect(modus.hinweis).toContain('Cis');
    expect(farbe.ok).toBe(false);
    expect(finalis.ok).toBe(true);
  });
});
