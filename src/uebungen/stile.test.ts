import { describe, expect, it } from 'vitest';
import { analysiere } from '../satz/analyse';
import { pruefeSatz } from '../satz/regeln';
import { pruefeKlaviersatz } from '../satz/klavier';
import { stilmerkmale } from '../satz/stilmerkmale';
import { ALTERIERTE, alteriertAufgabe, epocheAufgabe, STIL_AUSSCHNITTE } from './stile';

function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const ERWARTET: Record<string, (a: ReturnType<typeof analysiere>[number]['akkord']) => boolean> = {
  Neapolitaner: (a) => a.alteriert === 'neapolitaner',
  'Verminderter Septakkord': (a) => a.sept === 'verminderter Septakkord',
  'Übermäßiger Sextakkord': (a) => a.alteriert === 'uebermaessig',
  Zwischendominante: (a) => a.alteriert === 'zwischendominante',
  Dominantnonakkord: (a) => !!a.none,
  Mediante: (a) => a.alteriert === 'mediante',
};

describe('Alterierte Akkorde bestimmen', () => {
  it('die Akkorderkennung bestätigt jede Lösung, auch transponiert', () => {
    const rng = seeded(7);
    const gesehen = new Set<string>();
    for (const stufe of [1, 2, 3] as const)
      for (let i = 0; i < 60; i++) {
        const a = alteriertAufgabe(rng, stufe);
        gesehen.add(a.loesung);
        const [erster, zweiter] = analysiere(a.satz!);
        expect(ERWARTET[a.loesung](erster.akkord), `${a.loesung} in ${a.frage}: ${erster.akkord.name}`).toBe(true);
        expect(zweiter, a.frage).toBeDefined();
        expect(a.optionen).toContain(a.loesung);
        expect(new Set(a.optionen).size).toBe(a.optionen.length);
      }
    expect(gesehen.size).toBe(ALTERIERTE.length);
  });
});

describe('Epoche erkennen', () => {
  it('jeder Ausschnitt ist in seinem Stil fehlerfrei', () => {
    for (const a of STIL_AUSSCHNITTE) {
      const s = a.score();
      const fehler = s.voices.length === 2 && s.voices[1].name === 'Begleitung' ? pruefeKlaviersatz(s) : s.voices.length === 4 ? pruefeSatz(s) : [];
      expect(fehler.filter((b) => b.art === 'fehler').map((b) => b.text), a.id).toEqual([]);
    }
  });

  it('die Stilmerkmale passen zur Epoche der Übungssätze', () => {
    const merkmal: Record<string, string> = { fortspinnung: 'sequenz', neapolitaner: 'neapolitaner', uebermaessig: 'uebermaessig', medianten: 'mediante', planing: 'parallelverschiebung', ganzton: 'ganzton', pentatonik: 'pentatonik', quarten: 'quarten', zwoelfton: 'zwoelfton' };
    for (const [id, m] of Object.entries(merkmal)) {
      const a = STIL_AUSSCHNITTE.find((x) => x.id === id)!;
      expect(stilmerkmale(a.score()).map((x) => x.id), id).toContain(m);
    }
  });

  it('erzeugt Aufgaben mit allen Epochen als Antwort', () => {
    const rng = seeded(3);
    const loesungen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const a = epocheAufgabe(rng, 2);
      expect(a.optionen).toContain(a.loesung);
      expect(a.satz?.title).toBe('');
      loesungen.add(a.loesung);
    }
    expect(loesungen.size).toBe(5);
  });
});
