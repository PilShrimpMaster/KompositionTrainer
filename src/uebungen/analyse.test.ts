import { describe, expect, it } from 'vitest';
import { findeMotive } from '../kontrapunkt/motive';
import { germanName } from '../model/pitch';
import { pruefeSatz } from '../satz/regeln';
import { analyseAufgabe, ANALYSE_FRAGEN, BWV772, MODULATION, taktText } from './analyse';

const frage = (id: string) => ANALYSE_FRAGEN.find((f) => f.id === id)!;
/** Letzter Ton eines Taktes in der obersten Stimme */
const letzter = (id: string, takt: number) => {
  const m = frage(id).score().voices[0].measures[takt].notes;
  return germanName(m[m.length - 1].pitch!);
};

describe('Analyse an Werkausschnitten', () => {
  it('alle Fragen haben gültige Takte', () => {
    for (const f of ANALYSE_FRAGEN) {
      const n = f.score().voices[0].measures.length;
      for (const t of f.takte) expect(t, f.id).toBeLessThan(n);
    }
  });

  it('Halbschlüsse enden auf einem Ton der Dominante', () => {
    expect(letzter('ode-halbschluss', 3)).toBe('E');
    expect(letzter('ode-ganzschluss', 7)).toBe('D');
    expect(letzter('menuett-halbschluss', 7)).toBe('A');
  });

  it('die Menuett-Sequenz wiederholt Takt 5 eine Stufe tiefer', () => {
    const s = frage('menuett-sequenz').score();
    const [a, b] = [4, 5].map((t) => s.voices[0].measures[t].notes.map((n) => germanName(n.pitch!)).join(' '));
    expect(a).toBe('C D C H A');
    expect(b).toBe('H C H A G');
  });

  it('Imitation und Umkehrung bei Bach findet auch die Motivanalyse', () => {
    const imit = findeMotive(BWV772()).filter((x) => x.bezug === 'Imitation').map((x) => x.takt - 1);
    expect(imit).toContain(frage('bach-imitation').takte[0]);
    const um = findeMotive(frage('bach-umkehrung').score()).filter((x) => x.form === 'Umkehrung').map((x) => x.takt - 1);
    expect([...new Set(um)]).toEqual(frage('bach-umkehrung').takte);
  });

  it('der Modulationssatz ist fehlerfrei, fis kommt zuerst im markierten Takt', () => {
    const s = MODULATION();
    expect(pruefeSatz(s, { hinweise: false })).toEqual([]);
    const erst = Math.min(...s.voices.map((v) => v.measures.findIndex((m) => m.notes.some((n) => n.pitch?.step === 'F' && n.pitch.alter === 1))).filter((i) => i >= 0));
    expect([erst]).toEqual(frage('modulation-leitton').takte);
  });

  it('erzeugt Aufgaben auf allen Stufen', () => {
    for (const stufe of [1, 2, 3] as const) {
      const a = analyseAufgabe(Math.random, stufe);
      expect(a.markieren?.length).toBeGreaterThan(0);
      expect(a.loesung).toBe(taktText(a.markieren!));
    }
    expect(taktText([5, 4])).toBe('Takt 5 und 6');
  });
});
