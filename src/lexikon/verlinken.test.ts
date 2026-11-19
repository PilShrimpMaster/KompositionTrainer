import { describe, expect, it } from 'vitest';
import { verlinkeText } from './verlinken';

const ids = (segs: ReturnType<typeof verlinkeText>) => segs.filter((s) => typeof s !== 'string').map((s) => (s as { id: string }).id);

describe('Fachbegriffe verlinken', () => {
  it('findet Begriffe mit Endungen und nur einmal', () => {
    const s = verlinkeText('Zwei Intervalle bilden einen Dreiklang. Noch ein Intervall.');
    expect(ids(s)).toEqual(['intervall', 'dreiklang']);
    expect(s.map((x) => (typeof x === 'string' ? x : x.text)).join('')).toBe('Zwei Intervalle bilden einen Dreiklang. Noch ein Intervall.');
  });
  it('trifft keine Wortteile und lässt den eigenen Eintrag aus', () => {
    expect(ids(verlinkeText('Tempomat'))).toEqual([]);
    expect(ids(verlinkeText('Der Quintenzirkel', new Set(), 'quintenzirkel'))).toEqual([]);
    expect(ids(verlinkeText('Der Quintenzirkel'))).toEqual(['quintenzirkel']);
  });
});
