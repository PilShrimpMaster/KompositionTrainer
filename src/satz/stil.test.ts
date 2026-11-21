import { describe, expect, it } from 'vitest';
import { satz } from './kurzform';
import { pruefeSatz } from './regeln';
import { stilmerkmale, stilTendenz } from './stilmerkmale';
import { kpSatz } from '../kontrapunkt/kurzform';
import { pruefeKlaviersatz } from './klavier';

const s = (S: string, A: string, T: string, B: string, tonart = '0') => satz({ titel: 'Test', tonart, stimmen: [S, A, T, B] });
const fehler = (sc: ReturnType<typeof s>) => pruefeSatz(sc).filter((b) => b.art === 'fehler').map((b) => b.regel);
const merkmale = (sc: ReturnType<typeof s>) => stilmerkmale(sc).map((m) => m.id);

// Parallel verschobene Dreiklänge in Grundstellung (Planing)
const planing = s('G4:4 A4 B4 C5', 'E4:4 F4 G4 A4', 'C4:4 D4 E4 F4', 'C3:4 D3 E3 F3');

describe('Stilprofile', () => {
  it('im strengen Satz sind Parallelen Fehler', () => {
    expect(fehler(planing)).toContain('parallelen');
  });

  it('im Impressionismus werden Parallelen zum Stilmittel', () => {
    const b = pruefeSatz({ ...planing, stil: 'impressionismus' });
    expect(b.filter((x) => x.art === 'fehler')).toEqual([]);
    const p = b.find((x) => x.regel === 'parallelen')!;
    expect(p).toMatchObject({ art: 'hinweis', stil: 'impressionismus' });
    expect(p.text).toMatch(/Impressionismus: .*Planing/);
  });

  it('in der Klassik bleiben Parallelen Fehler', () => {
    expect(fehler({ ...planing, stil: 'klassik' })).toContain('parallelen');
  });

  it('ohne Hinweise verschwinden herabgestufte Befunde', () => {
    expect(pruefeSatz({ ...planing, stil: 'moderne' }, { hinweise: false })).toEqual([]);
  });

  it('wirkt auch im Klaviersatz', () => {
    // Schluss auf der Dominante: streng ein Fehler, im Impressionismus offen erlaubt
    const k = kpSatz({ titel: 'K', oben: 'E5:2 D5:2 | B4:1', unten: 'C3:2 G2:2 | G2:1', namen: ['Melodie', 'Begleitung'], schluessel: ['treble', 'bass'] });
    expect(pruefeKlaviersatz(k).some((b) => b.regel === 'kl-schluss' && b.art === 'fehler')).toBe(true);
    expect(pruefeKlaviersatz({ ...k, stil: 'impressionismus' }).some((b) => b.art === 'fehler')).toBe(false);
  });
});

describe('Stilmerkmale', () => {
  it('erkennt Parallelverschiebung und tippt auf Impressionismus', () => {
    const m = stilmerkmale(planing);
    expect(m.map((x) => x.id)).toContain('parallelverschiebung');
    expect(stilTendenz(m)[0].stil).toBe('impressionismus');
  });

  it('erkennt Neapolitaner und verminderten Septakkord', () => {
    // a-Moll: t – sN – D – t, dann (D) zur Subdominante usw.
    const sc = s('C5:4 D5 B4 A4 | A4 G#4 A4:2', 'E4:4 F4 E4 E4 | F4 F4 E4:2', 'A3:4 Bb3 G#3 C4 | D4 B3 C4:2', 'A2:4 D3 E3 A2 | D3 D3 A2:2', '0 moll');
    const ids = merkmale(sc);
    expect(ids).toContain('neapolitaner');
    expect(ids).toContain('verminderter-septakkord');
  });

  it('erkennt Ganzton, Pentatonik und Zwölftonreihe in der Melodie', () => {
    const mel = (t: string) => kpSatz({ titel: 'M', oben: t, unten: 'C3:1 | C3:1 | C3:1', namen: ['Oberstimme', 'Unterstimme'] });
    expect(stilmerkmale(mel('C5:4 D5 E5 F#5 | G#5 A#5 G#5 F#5 | E5:1')).map((m) => m.id)).toContain('ganzton');
    expect(stilmerkmale(mel('C5:4 D5 E5 G5 | A5 G5 E5 D5 | C5:1')).map((m) => m.id)).toContain('pentatonik');
    const reihe = kpSatz({ titel: 'R', oben: 'C5:8 C#5 D5 Eb5 E5 F5 F#5 G5 | Ab5 A5 Bb5 B5 r:2', unten: 'C3:1 | C3:1', namen: ['Oberstimme', 'Unterstimme'] });
    expect(stilmerkmale(reihe).map((m) => m.id)).toContain('zwoelfton');
  });

  it('erkennt Quartenklänge, Cluster und Orgelpunkt', () => {
    const q = s('Bb4:2 C5:2', 'F4:2 E4:2', 'C4:2 D4:2', 'G3:2 C3:2');
    expect(merkmale(q)).toContain('quarten');
    const c = s('F4:1', 'E4:1', 'D4:1', 'C4:1');
    expect(merkmale(c)).toContain('cluster');
    const o = s('E5:2 F5:2 | D5:2 E5:2', 'C5:2 C5:2 | B4:2 C5:2', 'G4:2 A4:2 | G4:2 G4:2', 'C3:1 | C3:1');
    expect(merkmale(o)).toContain('orgelpunkt');
  });

  it('ein schlichter Choral hat keine Stilmerkmale der Romantik oder Moderne', () => {
    const k = s('E5:4 F5 D5 C5', 'G4:4 A4 G4 G4', 'C4:4 C4 B3 E4', 'C3:4 F3 G3 C3');
    expect(merkmale(k)).toEqual([]);
  });
});
