import { describe, expect, it } from 'vitest';
import { eintrag } from '../lexikon/lexikon';
import { klaenge } from './klaenge';
import { satz } from './kurzform';
import { pruefeSatz, REGELN } from './regeln';

const s = (S: string, A: string, T: string, B: string, tonart = '0') => satz({ titel: 'Test', tonart, stimmen: [S, A, T, B] });
const regeln = (sc: ReturnType<typeof s>) => pruefeSatz(sc).map((b) => `${b.regel}:${b.art}:${b.takt}`);

describe('Zusammenklänge', () => {
  it('folgt allen Stimmen, auch bei Durchgängen und Haltebögen', () => {
    const k = klaenge(s('C5:2 B4:4 C5', 'G4:4 F4 G4:2', 'E4:1', 'C3:1'));
    expect(k.map((x) => x.zeit)).toEqual([0, 1, 2, 3]);
    expect(k[1].neu).toEqual([false, true, false, false]);
    expect(k[3].toene[2]).toMatchObject({ step: 'E', octave: 4 });
  });
});

describe('Prüf-Engine', () => {
  it('findet in einer sauberen Kadenz nichts', () => {
    const k = s('C5:4 C5 B4 C5', 'G4:4 A4 G4 G4', 'E4:4 F4 D4 E4', 'C3:4 F3 G3 C3');
    expect(pruefeSatz(k)).toEqual([]);
  });

  it('findet Quint- und Oktavparallelen', () => {
    const k = s('E5:4 F5', 'C5:4 D5', 'G4:4 A4', 'C3:4 D3');
    const b = pruefeSatz(k).filter((x) => x.regel === 'parallelen');
    expect(b.some((x) => x.text.startsWith('Oktavparallele zwischen Alt und Bass'))).toBe(true);
    expect(b.some((x) => x.text.startsWith('Quintparallele zwischen Tenor und Bass'))).toBe(true);
    expect(b[0].ids).toHaveLength(4);
    expect(b[0].takt).toBe(1);
  });

  it('erkennt Oktaven in Gegenbewegung und lässt liegende Töne in Ruhe', () => {
    const gegen = s('C5:4 D5', 'G4:4 F4', 'E4:4 B3', 'C4:4 D3');
    expect(pruefeSatz(gegen).some((b) => /Oktavparallele in Gegenbewegung zwischen Sopran und Bass/.test(b.text))).toBe(true);
    const liegend = s('G4:4 G4', 'E4:4 E4', 'C4:4 B3', 'C3:4 G2');
    expect(pruefeSatz(liegend).filter((b) => b.regel === 'parallelen')).toEqual([]);
  });

  it('findet verdeckte Oktaven nur bei springendem Sopran', () => {
    const sprung = s('E5:4 C5', 'G4:4 G4', 'C4:4 E4', 'G3:4 C3');
    // Sopran springt abwärts e″→c″, Bass abwärts g→C: verdeckte Oktave
    expect(regeln(sprung)).toContain('verdeckte-parallelen:fehler:1');
    const schritt = s('D5:4 C5', 'G4:4 G4', 'B3:4 E4', 'G3:4 C3');
    expect(regeln(schritt)).not.toContain('verdeckte-parallelen:fehler:1');
  });

  it('prüft Umfang, Abstand und Kreuzung', () => {
    expect(regeln(s('C6:1', 'G4:1', 'E4:1', 'C3:1'))).toContain('umfang:fehler:1');
    expect(regeln(s('C5:1', 'G4:1', 'E4:1', 'C1:1'))).toContain('umfang:fehler:1');
    expect(regeln(s('G5:1', 'E4:1', 'C4:1', 'C3:1'))).toContain('abstand:fehler:1');
    expect(regeln(s('E4:1', 'G4:1', 'C4:1', 'C3:1'))).toContain('kreuzung:fehler:1');
    expect(regeln(s('E5:4 C5', 'C5:4 F5', 'G4:4 A4', 'C3:4 F3'))).toContain('kreuzung:fehler:1');
    expect(regeln(s('C5:4 A4', 'G4:4 C5', 'E4:4 F4', 'C3:4 F3')).filter((r) => r.startsWith('kreuzung'))).toContain('kreuzung:fehler:1');
  });

  it('kann Stilhinweise ausblenden', () => {
    const k = s('C5:1', 'G4:1', 'E4:1', 'C2:1');
    expect(pruefeSatz(k).some((b) => b.art === 'hinweis')).toBe(true);
    expect(pruefeSatz(k, { hinweise: false }).some((b) => b.art === 'hinweis')).toBe(false);
  });

  it('verweist auf vorhandene Lexikon-Einträge', () => {
    for (const r of REGELN) expect(eintrag(r.begriff), r.id).toBeDefined();
  });
});

describe('Beispielsätze', () => {
  it('der Choralsatz ist fehlerfrei, der Übungssatz nicht', async () => {
    const { CHORALSATZ, FEHLERSATZ } = await import('../data/saetze');
    expect(pruefeSatz(CHORALSATZ)).toEqual([]);
    expect(pruefeSatz(FEHLERSATZ).filter((b) => b.art === 'fehler').length).toBeGreaterThan(3);
  });
});
