import { describe, expect, it } from 'vitest';
import { pruefeBeat } from '../produktion/beat';
import { pruefeSynth, SYNTH_VORLAGEN } from '../produktion/synthVorlagen';
import { docFromScore } from '../editor/rebar';
import { UEBUNGEN } from '../uebungen/aufgaben';
import { parseNotenbeispiel, parseNotenfolge } from './kompakt';
import { parseLektion } from './lektion';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { MODULE } from './module';
import { grundton, pruefe } from './pruefung';

describe('Lektionen', () => {
  it('gibt es für jedes Modul der Stufe 1 und das Abschlussprojekt', () => {
    for (const m of MODULE.filter((m) => m.stufe === 1)) expect(lektionFuer(m.id), m.id).toBeDefined();
    expect(lektionFuer('s1-abschluss')).toBeDefined();
  });

  it('folgen dem Ablauf Erklären, Hören, Üben, Schreiben, Freie Aufgabe', () => {
    for (const l of LEKTIONEN) {
      const titel = l.schritte.map((s) => s.titel);
      expect(titel[0], l.modul).toBe('Erklären');
      expect(titel, l.modul).toContain('Schreiben');
      expect(titel[titel.length - 1], l.modul).toBe('Freie Aufgabe');
    }
  });

  it('verweisen nur auf vorhandene Übungen und gültige Prüfkriterien', () => {
    const typen = new Set(UEBUNGEN.map((u) => u.typ));
    for (const l of LEKTIONEN)
      for (const s of l.schritte)
        for (const b of s.bausteine) if (b.art === 'uebungen') for (const t of b.typen) expect(typen.has(t), t).toBe(true);
    for (const a of alleAufgaben()) {
      const leer = { title: '', tempo: 90, time: a.takt ?? { beats: 4, beatType: 4 }, key: a.tonart ?? { fifths: 0, mode: 'major' as const }, clef: 'treble' as const, events: [] };
      const ergebnis = a.beat ? pruefeBeat(a.beat.vorgabe, a.pruefung) : a.synth ? pruefeSynth(SYNTH_VORLAGEN[0], a.pruefung) : pruefe(leer, a.pruefung);
      for (const p of ergebnis) expect(p.text, a.id).not.toMatch(/Unbekannt/);
    }
  });

  it('das Beispiel im Abschlussprojekt erfüllt die eigene Prüfung', () => {
    const l = lektionFuer('s1-abschluss')!;
    const beispiel = l.schritte[0].bausteine.find((b) => b.art === 'noten');
    const aufgabe = alleAufgaben().find((a) => a.id.startsWith('s1-abschluss'))!;
    if (beispiel?.art !== 'noten') throw new Error('kein Beispiel');
    const ergebnis = pruefe(docFromScore(beispiel.score), aufgabe.pruefung);
    expect(ergebnis.filter((p) => !p.ok)).toEqual([]);
  });

  it('liest die Kurzform für Noten', () => {
    const ev = parseNotenfolge('C4:4 D4 r:8 E4:2.~ E4');
    expect(ev).toHaveLength(5);
    expect(ev[1].duration).toEqual({ type: 'quarter' });
    expect(ev[2].pitch).toBeUndefined();
    expect(ev[3]).toMatchObject({ tie: true, duration: { type: 'half', dots: 1 } });
    const s = parseNotenbeispiel('takt: 3/4\ntonart: 2\n\nD4:2. | F#4:4 A4 D5');
    expect(s.time.beats).toBe(3);
    expect(s.voices[0].measures).toHaveLength(2);
  });

  it('meldet Fehler mit Ort', () => {
    expect(() => parseLektion('---\nmodul: x\ntitel: y\n---\n## Hören\n```noten\nQ4\n```')).toThrow(/Hören/);
  });
});

describe('Prüfung', () => {
  it('kennt die Grundtöne', () => {
    expect(grundton({ fifths: 0, mode: 'major' })).toEqual({ step: 'C', alter: 0 });
    expect(grundton({ fifths: 3, mode: 'minor' })).toEqual({ step: 'F', alter: 1 });
    expect(grundton({ fifths: -3, mode: 'major' })).toEqual({ step: 'E', alter: -1 });
    expect(grundton({ fifths: -1, mode: 'minor' })).toEqual({ step: 'D', alter: 0 });
  });

  it('erkennt Tonleitern und Dreiklänge', () => {
    const doc = (noten: string, fifths = 0) => ({ title: '', tempo: 90, time: { beats: 4, beatType: 4 }, key: { fifths, mode: 'major' as const }, clef: 'treble' as const, events: parseNotenfolge(noten) });
    expect(pruefe(doc('G4 A4 B4 C5 D5 E5 F#5 G5', 1), ['tonleiter'])[0].ok).toBe(true);
    expect(pruefe(doc('G4 A4 B4 C5 D5 E5 F5 G5', 1), ['tonleiter'])[0].ok).toBe(false);
    expect(pruefe(doc('C4 E4 G4 F4 A4 C5'), ['dreiklaenge 2'])[0].ok).toBe(true);
    expect(pruefe(doc('C4 E4 G4 F4 A4 B4'), ['dreiklaenge 2'])[0].ok).toBe(false);
    expect(pruefe(doc('C4 D4 C5'), ['sprung-max 6'])[0].ok).toBe(false);
    expect(pruefe(doc('C4 F#4'), ['leitereigen'])[0].ok).toBe(false);
  });
});
