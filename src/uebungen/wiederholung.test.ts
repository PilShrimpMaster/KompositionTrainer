import { describe, expect, it } from 'vitest';
import { faellige, note, planFuer, tagesrunde, tagVon, type Plan } from './wiederholung';

const TAG = 24 * 60 * 60 * 1000;
const start = new Date(2026, 10, 2, 18, 0).getTime();
const sitzung = (tag: number, richtig: number, gesamt = 10) =>
  Array.from({ length: gesamt }, (_, i) => ({ richtig: i < richtig, zeit: start + tag * TAG + i * 1000 }));

describe('Wiederholungsplaner', () => {
  it('benotet Sitzungen nach Trefferquote', () => {
    expect(note(1)).toBe(5);
    expect(note(0.8)).toBe(4);
    expect(note(0.3)).toBe(1);
  });

  it('verlängert die Abstände bei guten Sitzungen', () => {
    const p1 = planFuer('noten-lesen', sitzung(0, 10))!;
    expect(p1.intervall).toBe(1);
    const p2 = planFuer('noten-lesen', [...sitzung(0, 10), ...sitzung(1, 10)])!;
    expect(p2.intervall).toBe(3);
    const p3 = planFuer('noten-lesen', [...sitzung(0, 10), ...sitzung(1, 10), ...sitzung(4, 10)])!;
    expect(p3.intervall).toBeGreaterThanOrEqual(7);
    expect(tagVon(p3.faellig)).toBe(tagVon(start) + 4 + p3.intervall);
  });

  it('holt schwache Themen schon am nächsten Tag zurück und senkt die Leichtigkeit', () => {
    const p = planFuer('intervall-hoeren', [...sitzung(0, 10), ...sitzung(1, 10), ...sitzung(4, 3)])!;
    expect(p.intervall).toBe(1);
    expect(p.leichtigkeit).toBeLessThan(2.5);
  });

  it('fasst mehrere Runden an einem Tag zu einer Sitzung zusammen', () => {
    const p = planFuer('noten-lesen', [...sitzung(0, 10), ...sitzung(0, 10)])!;
    expect(p.sitzungen).toBe(1);
  });

  it('listet fällige Themen, schwache zuerst', () => {
    const gut = planFuer('noten-lesen', sitzung(0, 10))!;
    const schwach = planFuer('intervall-hoeren', sitzung(0, 4))!;
    const spaeter = planFuer('notenwerte', [...sitzung(0, 10), ...sitzung(1, 10), ...sitzung(4, 10)])!;
    const f = faellige([gut, schwach, spaeter], start + 5 * TAG);
    expect(f.map((p) => p.typ)).toEqual(['intervall-hoeren', 'noten-lesen']);
  });

  it('stellt eine Tagesrunde mit mehr Aufgaben für schwache Themen zusammen', () => {
    const plaene: Plan[] = [
      { typ: 'noten-lesen', faellig: 0, intervall: 1, leichtigkeit: 2.6, quote: 1, sitzungen: 3 },
      { typ: 'intervall-hoeren', faellig: 0, intervall: 1, leichtigkeit: 1.5, quote: 0.4, sitzungen: 3 },
      { typ: 'notenwerte', faellig: 0, intervall: 1, leichtigkeit: 2.5, quote: 0.9, sitzungen: 3 },
    ];
    const r = tagesrunde(plaene, 15, () => 0.3);
    expect(r).toHaveLength(15);
    const zaehle = (t: string) => r.filter((x) => x === t).length;
    expect(zaehle('intervall-hoeren')).toBeGreaterThan(zaehle('noten-lesen'));
    expect(zaehle('noten-lesen')).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < r.length; i++) if (r[i] === r[i - 1]) expect(r.slice(i).every((t) => t === r[i])).toBe(true);
  });
});
