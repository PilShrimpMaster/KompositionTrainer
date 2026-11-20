import { describe, expect, it } from 'vitest';
import { pruefeKontrapunkt, type Gattung } from './fux';
import { kpSatz } from './kurzform';

/** Fux’ dorischer Cantus firmus (Gradus ad Parnassum) */
const CF = 'D3:1 F3 E3 D3 G3 F3 A3 G3 F3 E3 D3';
const CF_OBEN = 'D4:1 F4 E4 D4 G4 F4 A4 G4 F4 E4 D4';

function pruefe(oben: string, unten: string, gattung: Gattung, cf: 0 | 1 = 1) {
  return pruefeKontrapunkt(kpSatz({ titel: 't', oben, unten }), { gattung, cf });
}
const fehler = (bs: ReturnType<typeof pruefe>) => bs.filter((b) => b.art === 'fehler').map((b) => `T${b.takt} ${b.regel}: ${b.text}`);
const regeln = (bs: ReturnType<typeof pruefe>) => bs.filter((b) => b.art === 'fehler').map((b) => b.regel);

describe('1. Gattung', () => {
  it('Fux’ Musterlösung über dem Cantus firmus ist fehlerfrei', () => {
    expect(fehler(pruefe('A4:1 A4 G4 A4 B4 C5 C5 B4 D5 C#5 D5', CF, 1))).toEqual([]);
  });

  it('eine Gegenstimme unter dem Cantus firmus ist fehlerfrei', () => {
    expect(fehler(pruefe(CF_OBEN, 'D3:1 D3 C3 B2 E3 D3 C3 E3 D3 C#3 D3', 1, 0))).toEqual([]);
  });

  it('findet Quint- und Oktavparallelen', () => {
    expect(regeln(pruefe('A4:1 C5 B4 A4 B4 C5 C5 B4 D5 C#5 D5', CF, 1))).toContain('kp-parallelen');
  });

  it('findet Dissonanzen, falschen Anfang und Schluss', () => {
    const r = regeln(pruefe('F4:1 A4 G4 A4 B4 C5 C5 B4 D5 C#5 E5', CF, 1));
    expect(r).toContain('kp-anfang');
    expect(r).toContain('kp-schluss');
    expect(regeln(pruefe('A4:1 G4 G4 A4 B4 C5 C5 B4 D5 C#5 D5', CF, 1))).toContain('kp-konsonanz'); // G über F = None
  });

  it('verlangt den Leitton vor dem Schluss', () => {
    expect(fehler(pruefe('A4:1 A4 G4 A4 B4 C5 C5 B4 D5 C5 D5', CF, 1)).join()).toMatch(/Leitton/);
  });

  it('Quinte am Anfang unter dem Cantus firmus ist falsch', () => {
    expect(regeln(pruefe(CF_OBEN, 'G2:1 D3 A2 B2 E3 D3 C3 E3 D3 C#3 D3', 1, 0))).toContain('kp-anfang');
  });

  it('meldet verbotene Sprünge', () => {
    expect(fehler(pruefe('A4:1 A4 G4 A4 B4 C5 C5 B4 F4 C#5 D5', CF, 1)).join()).toMatch(/Sprung|vermindert|übermäßig/);
  });
});

describe('2. Gattung', () => {
  const gut = 'r:2 A4 | A4 B4 | C5 G4 | F4 A4 | B4 C5 | D5 A4 | C5 A4 | B4 D5 | A4 B4 | C#5:1 | D5:1';

  it('Durchgänge auf der unbetonten Halben sind erlaubt', () => {
    expect(fehler(pruefe(gut, CF, 2))).toEqual([]);
  });

  it('eine angesprungene Dissonanz ist ein Fehler', () => {
    // G4 über F3 im 2. Takt wird angesprungen (von D5) und verlassen
    expect(regeln(pruefe('r:2 A4 | A4 D5 | C5 G4 | F4 A4 | B4 C5 | D5 A4 | C5 A4 | B4 D5 | A4 G4 | C#5:1 | D5:1', CF, 2))).toContain('kp-durchgang');
  });

  it('Dissonanz auf der Eins ist ein Fehler', () => {
    expect(regeln(pruefe('r:2 A4 | G4 B4 | C5 G4 | F4 A4 | B4 C5 | D5 A4 | C5 A4 | B4 D5 | A4 B4 | C#5:1 | D5:1', CF, 2))).toContain('kp-konsonanz');
  });

  it('prüft den Rhythmus der Gattung', () => {
    expect(regeln(pruefe('A4:1 A4 G4 A4 B4 C5 C5 B4 D5 C#5 D5', CF, 2))).toContain('kp-rhythmus');
  });
});

describe('3. Gattung', () => {
  it('Durchgang, Wechselnote und Cambiata sind erlaubt', () => {
    const kp = 'D4:4 E4 F4 G4 | A4 G4 F4 A4 | G4 F4 E4 C4 | F4 E4 D4 C4 | B3 C4 D4 E4 | F4 G4 A4 F4 | E4 F4 G4 A4 | B4 A4 G4 B4 | A4 G4 F4 D4 | C#4 D4 E4 C#4 | D4:1';
    const r = pruefe(kp, 'D3:1 F3 E3 D3 G3 F3 A3 G3 F3 E3 D3', 3);
    expect(fehler(r)).toEqual([]);
  });
});

describe('4. Gattung', () => {
  it('Vorhalte 7–6 lösen sich abwärts auf', () => {
    const kp = 'r:2 G4~ | G4 F4~ | F4 E4~ | E4 D4~ | D4 C4~ | C4 B3 | C4:1';
    const r = pruefe(kp, 'C4:1 A3 G3 F3 E3 D3 C3', 4);
    expect(fehler(r)).toEqual([]);
  });

  it('ein Vorhalt, der aufwärts geht, ist ein Fehler', () => {
    const kp = 'r:2 G4~ | G4 A4~ | A4 E4~ | E4 D4~ | D4 C4~ | C4 B3 | C4:1';
    expect(regeln(pruefe(kp, 'C4:1 A3 G3 F3 E3 D3 C3', 4))).toContain('kp-vorhalt');
  });
});

describe('Cantus firmus und Übungen', () => {
  it('erzeugt in allen Modi gute Cantus firmi', async () => {
    const { erzeugeCantus, guterCantus, MODI } = await import('./cantus');
    const { diatonicIndex } = await import('../model/pitch');
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const m of MODI)
      for (let i = 0; i < 30; i++) {
        const cf = erzeugeCantus(m.id, rng);
        expect(guterCantus(cf.map((e) => diatonicIndex(e.pitch!))), m.id).toBe(true);
        expect(cf[0].pitch!.step).toBe(m.finalis);
      }
    expect(guterCantus([0, 2, 1, 0, 3, 2, 4, 3, 2, 1, 0])).toBe(true); // Fux’ dorischer Cantus firmus
  });

  it('die Fehler-Vorlagen enthalten genau ihren Fehler', async () => {
    const { KP_VORLAGEN, kpVorlageFehler } = await import('./uebungen');
    for (const v of KP_VORLAGEN) expect(kpVorlageFehler(v), v.kp).toEqual([v.fehler]);
  });

  it('Konsonanzen werden richtig eingeordnet', async () => {
    const { klangart } = await import('./uebungen');
    const p = (s: string) => ({ step: s[0] as 'C', octave: Number(s.slice(-1)), ...(s.includes('#') ? { alter: 1 } : {}) });
    expect(klangart(p('C3'), p('G3'))).toBe('vollkommene Konsonanz');
    expect(klangart(p('C3'), p('E4'))).toBe('unvollkommene Konsonanz');
    expect(klangart(p('C3'), p('F3'))).toBe('Dissonanz');
    expect(klangart(p('F3'), p('B3'))).toBe('Dissonanz');
    expect(klangart(p('C3'), p('F#3'))).toBe('Dissonanz');
  });
});
