import { describe, expect, it } from 'vitest';
import { BEISPIELE } from '../data/melodien';
import { kpSatz } from '../kontrapunkt/kurzform';
import { analysiereForm, kadenzAm, menuettTrioFehlt } from './form';
import { pruefeKlaviersatz } from './klavier';
import { HAENSCHEN, melodie, MENUETT, MENUETT_BASS, TRIO, TRIO_BASS } from '../data/formbeispiele';

const beispiel = (id: string) => BEISPIELE.find((b) => b.id === id)!.score;


describe('Formenlehre', () => {
  it('erkennt die Periode in der Ode an die Freude', () => {
    const f = analysiereForm(beispiel('ode-an-die-freude'));
    expect(f.form).toBe('Periode');
    expect(f.kadenzen.map((k) => k.art)).toEqual(['halb', 'ganz']);
    expect(f.glieder.map((g) => g.name[0])).toEqual(['a', 'a', 'a', 'a']);
  });

  it('erkennt den Satz im Menuett von Petzold', () => {
    expect(analysiereForm(beispiel('menuett-g-dur')).form).toBe('Satz');
  });

  it('erkennt die dreiteilige Liedform', () => {
    const a = 'C5:4 D5 E5 C5 | E5:4 F5 G5:2 | G5:8 A5 G5 F5 E5:4 C5 | D5:2 C5:2';
    const b = 'A4:2 B4:2 | C5:4 A4 B4:2 | E5:2 D5:4 C5 | B4:1';
    const s = kpSatz({ titel: 'Lied', oben: `${a} | ${b} | ${a}`, unten: 'r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1' });
    expect(analysiereForm({ ...s, voices: [s.voices[0]] }).form).toBe('Dreiteilige Liedform (A B A)');
    // Hänschen klein: A (8 Takte), B (4 Takte), A′ = zweite Hälfte von A
    const f = analysiereForm(melodie('Hänschen klein', HAENSCHEN));
    expect(f.form).toBe('Dreiteilige Liedform (A B A)');
    expect(f.text[0]).toContain('B (Takt 9–12)');
  });

  it('liest Kadenzen aus den Harmonien eines Klaviersatzes', () => {
    const s = kpSatz({ titel: 'Menuett', takt: '3/4', oben: MENUETT, unten: MENUETT_BASS });
    expect(kadenzAm(s, 8)?.art).toBe('halb');
    expect(kadenzAm(s, 16)?.art).toBe('ganz');
    expect(pruefeKlaviersatz(s, { hinweise: false })).toEqual([]);
  });

  it('erkennt Menuett mit Trio und sagt, was fehlt', () => {
    const ganz = kpSatz({ titel: 'Menuett mit Trio', takt: '3/4', oben: `${MENUETT} | ${TRIO}`, unten: `${MENUETT_BASS} | ${TRIO_BASS}` });
    expect(menuettTrioFehlt(ganz)).toEqual([]);
    const f = analysiereForm(ganz);
    expect(f.form).toBe('Menuett mit Trio');
    expect(kadenzAm(ganz, 32)?.fremd).toBe('F-Dur');
    expect(pruefeKlaviersatz(ganz, { hinweise: false })).toEqual([]);
    const halb = kpSatz({ titel: 'Nur Menuett', takt: '3/4', oben: MENUETT, unten: MENUETT_BASS });
    expect(menuettTrioFehlt(halb)[0]).toContain('16 Takte');
  });
});
