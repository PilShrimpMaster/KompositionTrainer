import { describe, expect, it } from 'vitest';
import { rebar } from '../editor/rebar';
import { emptyDoc } from '../editor/state';
import { parseNotenfolge } from '../lernpfad/kompakt';
import { toToneName } from '../model/pitch';
import type { KeySignature } from '../model/types';
import { parseAkkordsymbol } from './akkordsymbol';
import { jazzAnalyse, leadsheet, optionston, pruefeLeadsheet, stufe, voicings } from './analyse';

const C: KeySignature = { fifths: 0, mode: 'major' };
const ls = (noten: string, key = C) => rebar({ ...emptyDoc(), key, events: parseNotenfolge(noten) }).score;
const sym = (s: string) => parseAkkordsymbol(s)!;

describe('Jazzharmonik', () => {
  it('benennt Stufen in Dur und Moll', () => {
    expect(['Dm7', 'G7', 'Cmaj7', 'Am7', 'Bm7b5', 'Fmaj7', 'Ab7', 'Bb7', 'Fm6', 'Db7'].map((s) => stufe(sym(s), C))).toEqual(['IIm7', 'V7', 'Imaj7', 'VIm7', 'VIIø7', 'IVmaj7', 'bVI7', 'bVII7', 'IVm6', 'bII7']);
    expect(['Bm7b5', 'E7', 'Am6'].map((s) => stufe(sym(s), { fifths: 0, mode: 'minor' }))).toEqual(['IIø7', 'V7', 'Im6']);
  });

  it('findet II–V–I, Zwischendominanten, Tritonus-Substitution und modale Mischung', () => {
    const s = ls('E5:2[Cmaj7] E5:2[A7] | F5:2[Dm7] F5:2[G7] | E5:1[Cmaj7] | F5:2[Em7] F5:2[A7] | F5:2[Dm7] F5:2[Db7] | E5:1[Cmaj7] | C5:1[Abmaj7] | C5:1[Cmaj7]');
    const { muster, deutungen } = jazzAnalyse(leadsheet(s).akkorde, C);
    const arten = muster.map((m) => m.art);
    expect(arten.filter((a) => a === 'ii-v-i')).toHaveLength(2);
    expect(arten).toContain('zwischendominante');
    expect(arten).toContain('tritonus-substitution');
    expect(arten).toContain('modale-mischung');
    expect(deutungen.find((d) => d.akkord.text === 'Db7')?.rolle).toBe('Tritonus-Substitution (SubV7 von C)');
    expect(deutungen.find((d) => d.akkord.text === 'A7')?.rolle).toBe('Zwischendominante (V7 von D)');
    expect(deutungen[0].rolle).toBe('Tonika');
  });

  it('ordnet Melodietöne als Akkordton, Tension oder Avoid Note ein', () => {
    const p = (s: string) => ({ step: s[0] as 'C', alter: s.includes('#') ? 1 : s.includes('b', 1) ? -1 : 0 });
    expect(optionston(p('E'), sym('Cmaj7')).art).toBe('akkordton');
    expect(optionston(p('D'), sym('Cmaj7'))).toEqual({ art: 'tension', name: '9' });
    expect(optionston(p('F'), sym('Cmaj7')).art).toBe('avoid');
    expect(optionston(p('F#'), sym('Cmaj7'))).toEqual({ art: 'tension', name: '#11' });
    expect(optionston(p('Ab'), sym('G7')).art).toBe('tension');
    expect(optionston(p('G'), sym('Dm7')).art).toBe('tension');
    expect(optionston(p('Bb'), sym('Dm7')).art).toBe('avoid');
    expect(optionston(p('A'), sym('C13')).art).toBe('tension');
  });

  it('meldet lange Avoid Notes und fehlende Symbole', () => {
    const gut = pruefeLeadsheet(ls('E5:2[Cmaj7] D5:2 | F5:2[Dm7] B4:2[G7] | C5:1[Cmaj7]'));
    expect(gut).toEqual([]);
    const events = parseNotenfolge('C5:4 E5:4 F5:2[Cmaj7] | G5:1');
    events[3].akkord = 'Xyz';
    const schlecht = pruefeLeadsheet(rebar({ ...emptyDoc(), events }).score);
    expect(schlecht.map((b) => b.regel).sort()).toEqual(['ls-anfang', 'ls-avoid', 'ls-symbol']);
  });

  it('baut Shell- und Drop-2-Voicings', () => {
    const v = voicings(sym('Dm7'));
    expect(v.shell.map(toToneName)).toEqual(['D3', 'F3', 'C4']);
    expect(v.drop2.map(toToneName)).toEqual(['A3', 'D4', 'F4', 'C5']);
    expect(voicings(sym('G7')).shell.map(toToneName)).toEqual(['G2', 'B3', 'F4']);
  });
});
