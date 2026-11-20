import { describe, expect, it } from 'vitest';
import { BEISPIELE } from '../data/melodien';
import { kpSatz } from '../kontrapunkt/kurzform';
import { analysiereForm, kadenzAm, menuettTrioFehlt } from './form';
import { pruefeKlaviersatz } from './klavier';

const beispiel = (id: string) => BEISPIELE.find((b) => b.id === id)!.score;

/** Übungssatz: Menuett in C-Dur (16 Takte) und Trio in F-Dur (16 Takte) */
const MENUETT = 'E5:4 C5 G4 | F5:4 D5 B4 | C5:4 E5 G5 | A5:2 F5:4 | G5:4 E5 C5 | F5:4 D5 B4 | E5:4 C5 A4 | G4:2. | G5:4 F5 E5 | F5:4 E5 D5 | E5:4 D5 C5 | D5:2. | E5:4 C5 G4 | F5:4 D5 B4 | B4:4 D5 G5 | C5:2.';
const MENUETT_BASS = 'C3:2. | G2:2. | C3:2. | F2:2. | C3:2. | G2:2. | A2:2. | G2:2. | C3:2. | D3:2. | C3:2. | G2:2. | C3:2. | G2:2. | G2:2. | C3:2.';
const TRIO = 'A4:4 F4 C4 | Bb4:4 G4 E4 | F4:4 A4 C5 | D5:2 Bb4:4 | C5:4 A4 F4 | Bb4:4 G4 E4 | A4:4 F4 D4 | C4:2. | C5:4 Bb4 A4 | Bb4:4 A4 G4 | A4:4 G4 F4 | G4:2. | A4:4 F4 C4 | Bb4:4 G4 E4 | E4:4 G4 C5 | F4:2.';
const TRIO_BASS = 'F3:2. | C3:2. | F3:2. | Bb2:2. | F3:2. | C3:2. | D3:2. | C3:2. | F3:2. | G3:2. | F3:2. | C3:2. | F3:2. | C3:2. | C3:2. | F3:2.';

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
