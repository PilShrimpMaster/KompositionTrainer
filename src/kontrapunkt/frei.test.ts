import { describe, expect, it } from 'vitest';
import { pruefeFreienSatz } from './frei';
import { kpSatz } from './kurzform';
import { findeMotive, standardMotiv, verschiebung } from './motive';

// Bach, Invention C-Dur BWV 772, Takt 1–2
const BWV772 = kpSatz({
  titel: 'Invention 1',
  oben: 'r:16 C4 D4 E4 F4 D4 E4 C4 G4:8 C5 B4 C5 | D5:16 G4 A4 B4 C5 A4 B4 G4 D5:8 G5 F5 G5',
  unten: 'r:2 r:16 C3 D3 E3 F3 D3 E3 C3 | G3:8 G2 r:4 r:16 G3 A3 B3 C4 A3 B3 G3',
});

describe('Motivanalyse', () => {
  it('nimmt die ersten Töne bis zur Taktmitte als Motiv', () => {
    const m = standardMotiv(BWV772)!;
    expect(m.stimme).toBe(0);
    expect(m.toene).toHaveLength(7);
  });

  it('findet Original, Imitation und Wiederkehr in Bachs Invention', () => {
    const f = findeMotive(BWV772);
    expect(f.map((x) => [x.stimme, x.takt, x.form, x.bezug])).toEqual([
      [0, 1, 'Thema', 'Original'],
      [1, 1, 'Thema', 'Imitation'],
      [0, 2, 'Thema', 'Wiederkehr'],
      [1, 2, 'Thema', 'Imitation'],
    ]);
    expect(f[1].stufen).toBe(-7);
    expect(f[1].text).toContain('eine Oktave tiefer');
    expect(f[2].text).toContain('eine Quinte höher');
  });

  it('erkennt Umkehrung, Krebs, Vergrößerung und Sequenz', () => {
    const s = kpSatz({
      titel: 'Test',
      // Motiv c d e g | Sequenz d e f a | Umkehrung | Krebs
      oben: 'C5:8 D5 E5 G5:4 D5:8 E5 F5 A5:4 | C5:8 B4 A4 F4:4 G5:8 E5 D5 C5:4',
      // Vergrößerung: doppelte Werte
      unten: 'r:1 | C3:4 D3 E3 G3:2',
    });
    const f = findeMotive(s);
    const kurz = f.map((x) => `${x.stimme}:${x.form}:${x.bezug}`);
    expect(kurz).toContain('0:Thema:Original');
    expect(kurz).toContain('0:Thema:Sequenz');
    expect(kurz).toContain('0:Umkehrung:Wiederkehr');
    expect(kurz).toContain('0:Krebs:Wiederkehr');
    expect(kurz).toContain('1:Vergrößerung:Imitation');
  });

  it('beschreibt Verschiebungen', () => {
    expect(verschiebung(4)).toBe('eine Quinte höher');
    expect(verschiebung(-3)).toBe('eine Quarte tiefer');
    expect(verschiebung(-14)).toBe('zwei Oktaven tiefer');
    expect(verschiebung(9)).toBe('eine Oktave und eine Terz höher');
  });
});

describe('Freier zweistimmiger Satz', () => {
  it('findet bei Bach keine Fehler', () => {
    expect(pruefeFreienSatz(BWV772, { hinweise: false })).toEqual([]);
  });

  it('meldet eine angesprungene Dissonanz auf der Zählzeit', () => {
    const s = kpSatz({ titel: 'x', oben: 'E4:4 B4 C5 E5 | C5:1', unten: 'C3:4 C3 A3 A3 | C3:1' });
    const b = pruefeFreienSatz(s, { hinweise: false });
    expect(b.map((x) => x.regel)).toContain('fr-dissonanz');
  });

  it('erlaubt Durchgang und Vorhalt', () => {
    // Durchgang d zwischen c und e über c; Vorhalt c über d (Sekunde→ h über d? hier: Septime c über d löst nach h)
    const s = kpSatz({ titel: 'x', oben: 'C5:4 D5 E5 C5~ | C5:4 B4 C5:2', unten: 'C3:2 A3:2 | D3:2 C3:2' });
    expect(pruefeFreienSatz(s, { hinweise: false })).toEqual([]);
  });

  it('meldet einen Vorhalt ohne Auflösung und Quintparallelen', () => {
    const v = kpSatz({ titel: 'x', oben: 'C5:2 C5:2~ | C5:2 D5:2 | C5:1', unten: 'E3:2 A3:2 | D3:2 B2:2 | C3:1' });
    expect(pruefeFreienSatz(v, { hinweise: false }).map((x) => x.regel)).toContain('fr-vorhalt');
    const p = kpSatz({ titel: 'x', oben: 'G4:2 A4:2 | C5:1', unten: 'C3:2 D3:2 | C3:1' });
    expect(pruefeFreienSatz(p, { hinweise: false }).map((x) => x.regel)).toContain('fr-parallelen');
  });
});

describe('Übung Motivform', () => {
  it('erzeugt eindeutige Aufgaben auf allen Stufen', async () => {
    const { motivformAufgabe } = await import('./uebungen');
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const gesehen = new Set<string>();
    for (const stufe of [1, 2, 3] as const) {
      for (let i = 0; i < 60; i++) {
        const a = motivformAufgabe(rng, stufe);
        expect(a.optionen).toContain(a.loesung);
        gesehen.add(a.loesung);
      }
    }
    expect(gesehen.size).toBe(4);
  });
});
