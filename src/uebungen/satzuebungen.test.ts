import { describe, expect, it } from 'vitest';
import { parsePitch } from '../lexikon/parse';
import { analysiere, funktionsfolge } from '../satz/analyse';
import { pruefeSatz } from '../satz/regeln';
import { erzeugeAufgabe } from './aufgaben';
import { akkordSatz, FEHLER_VORLAGEN, inTonart, SATZ_TONARTEN, SCHLUESSE, transponiere } from './satzuebungen';


describe('Satzübungen', () => {
  it('transponiert mit Vorzeichen', () => {
    expect(transponiere(parsePitch('F#4'), -3, 1)).toEqual({ step: 'C', alter: 1, octave: 4 });
    expect(transponiere(parsePitch('B3'), 3, -1)).toEqual({ step: 'E', octave: 4 });
    expect(transponiere(parsePitch('E4'), 3, -1)).toEqual({ step: 'A', octave: 4 });
  });

  for (const v of FEHLER_VORLAGEN) {
    it(`Vorlage ${v.akkorde.join(' → ')} hat genau: ${v.fehler}`, () => {
      const moeglich = SATZ_TONARTEN.filter((t) => inTonart(v.akkorde, t));
      expect(moeglich.length).toBeGreaterThanOrEqual(3);
      for (const t of moeglich) {
        const score = akkordSatz(inTonart(v.akkorde, t)!, { fifths: t.fifths, mode: 'major' });
        const fehler = pruefeSatz(score).filter((b) => b.art === 'fehler');
        const art = fehler.map((b) => (b.regel === 'parallelen' ? (b.text.includes('Quint') ? 'Quintparallele' : 'Oktavparallele') : b.regel === 'leitton' ? 'Leitton nicht aufgelöst' : b.regel));
        expect([...new Set(art)], `in Tonart ${t.fifths}: ${fehler.map((b) => b.text).join(' | ')}`).toEqual(v.fehler === 'Kein Fehler' ? [] : [v.fehler]);
      }
    });
  }

  it('die Hörbeispiele für Schlüsse sind fehlerfrei und haben die erwarteten Funktionen', () => {
    const erwartet = { Ganzschluss: 'T S D T', Halbschluss: 'T Tp S D', Trugschluss: 'T S D Tp', Plagalschluss: 'T D T S T' };
    for (const [name, s] of Object.entries(SCHLUESSE)) {
      for (const t of SATZ_TONARTEN) {
        const folge = inTonart(s.akkorde, t);
        if (!folge) continue;
        const score = akkordSatz(folge, { fifths: t.fifths, mode: 'major' });
        expect(pruefeSatz(score).filter((b) => b.art === 'fehler'), name).toEqual([]);
        expect(funktionsfolge(score).join(' '), name).toBe(erwartet[name as keyof typeof erwartet]);
      }
    }
  });

  it('erzeugt lösbare Aufgaben', () => {
    for (const typ of ['funktion-bestimmen', 'kadenz-hoeren', 'umkehrung-bestimmen', 'satzfehler-finden'] as const) {
      for (const stufe of [1, 2, 3] as const) {
        for (let i = 0; i < 40; i++) {
          const a = erzeugeAufgabe(typ, stufe);
          expect(a.optionen).toContain(a.loesung);
        }
      }
    }
  });

  it('Funktions- und Umkehrungsaufgaben passen zur Akkorderkennung', () => {
    for (let i = 0; i < 60; i++) {
      const a = erzeugeAufgabe('funktion-bestimmen', 3);
      const toene = a.noten!.groups[0];
      const score = akkordSatz([[...toene].reverse().concat(toene.length === 3 ? [toene[0]] : []).slice(0, 4)], a.noten!.key!);
      // höchster Ton zuerst; bei Dreiklängen wird der Grundton verdoppelt
      const f = analysiere({ ...score })[0]?.akkord.funktion;
      expect(f, a.erklaerung).toBe(a.loesung);
    }
  });
});
