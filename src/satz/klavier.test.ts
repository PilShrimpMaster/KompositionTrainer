import { describe, expect, it } from 'vitest';
import { kpSatz } from '../kontrapunkt/kurzform';
import { klavierHarmonien, pruefeKlaviersatz } from './klavier';

const regeln = (s: Parameters<typeof pruefeKlaviersatz>[0]) => pruefeKlaviersatz(s).map((b) => b.regel);

describe('Klaviersatz', () => {
  it('erkennt die Harmonien eines Menuetts mit einfachem Bass', () => {
    const s = kpSatz({
      titel: 'Menuett',
      takt: '3/4',
      oben: 'E5:4 D5 C5 | F5:4 E5 D5 | D5:2 B4:4 | C5:2.',
      unten: 'C3:4 E3 G3 | F2:4 A2 C3 | G2:4 B2 D3 | C3:2.',
    });
    expect(klavierHarmonien(s).map((h) => h.kurz)).toEqual(['T', 'S', 'D', 'T']);
  });

  it('liest einen Alberti-Bass als Akkord', () => {
    const s = kpSatz({
      titel: 'Alberti',
      oben: 'E5:2 D5:4 C5 | B4:2 D5:2 | C5:1',
      unten: 'C3:8 G3 E3 G3 C3 G3 E3 G3 | B2:8 G3 D3 G3 G2 G3 F3 G3 | C3:1',
    });
    const h = klavierHarmonien(s).map((x) => x.kurz);
    expect(h).toEqual(['T', 'D₃', 'D⁷', 'T']);
    expect(pruefeKlaviersatz(s, { hinweise: false })).toEqual([]);
  });

  it('teilt den Takt, wenn die Harmonie wechselt', () => {
    const s = kpSatz({ titel: 'x', takt: '3/4', oben: 'C5:2. | A4:2 B4:4 | C5:2.', unten: 'C3:2. | F2:2 G2:4 | C3:2.' });
    expect(klavierHarmonien(s).map((h) => h.kurz)).toEqual(['T', 'S', 'D', 'T']);
  });

  it('meldet Parallelen zwischen Melodie und Bass und einen falschen Schluss', () => {
    const p = kpSatz({ titel: 'x', takt: '3/4', oben: 'G4:2. | A4:2. | G4:2. | C5:2.', unten: 'C3:2. | D3:2. | G2:2. | C3:2.' });
    expect(regeln(p)).toContain('kl-parallelen');
    const s = kpSatz({ titel: 'x', takt: '3/4', oben: 'E5:2. | D5:2.', unten: 'C3:2. | G2:2.' });
    expect(regeln(s)).toContain('kl-schluss');
  });

  it('gibt Hinweise auf fremde Töne und Begleitung über der Melodie', () => {
    const s = kpSatz({ titel: 'x', takt: '3/4', oben: 'F5:2 E5:4 | A5:2 E5:4 | C5:2.', unten: 'C3:4 E3 G3 | C3:4 E3 G3 | C3:2.' });
    const f = pruefeKlaviersatz(s).filter((b) => b.regel === 'kl-fremdton');
    expect(f.map((b) => b.takt)).toEqual([2]);
    const k = kpSatz({ titel: 'x', takt: '3/4', oben: 'C4:2. | C4:2.', unten: 'E4:2. | C3:2.', schluessel: ['treble', 'bass'] });
    expect(regeln(k)).toContain('kl-kreuzung');
  });
});
