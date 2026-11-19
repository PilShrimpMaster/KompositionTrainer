import { describe, expect, it } from 'vitest';
import { UEBUNGEN, erzeugeAufgabe } from '../uebungen/aufgaben';
import { EINTRAEGE, eintrag, normalisiere, sucheEintraege } from './lexikon';
import { parseBeispiel, parseEintrag, parsePitch } from './parse';

describe('Lexikon', () => {
  it('lädt alle Einträge mit eindeutigen Ids', () => {
    expect(EINTRAEGE.length).toBeGreaterThanOrEqual(35);
    expect(new Set(EINTRAEGE.map((e) => e.id)).size).toBe(EINTRAEGE.length);
  });

  it('verweist nur auf vorhandene Einträge', () => {
    for (const e of EINTRAEGE) for (const s of e.siehe) expect(eintrag(s), `${e.id} → ${s}`).toBeDefined();
  });

  it('kennt alle Begriffe, auf die Übungen verweisen', () => {
    for (const u of UEBUNGEN) {
      for (let i = 0; i < 30; i++) {
        const a = erzeugeAufgabe(u.typ, 3);
        if (a.begriff) expect(eintrag(a.begriff), `${u.typ} → ${a.begriff}`).toBeDefined();
      }
    }
  });

  it('liest Töne und Beispiele', () => {
    expect(parsePitch('C4')).toEqual({ step: 'C', octave: 4 });
    expect(parsePitch('F#4')).toEqual({ step: 'F', alter: 1, octave: 4 });
    expect(parsePitch('Bb3')).toEqual({ step: 'B', alter: -1, octave: 3 });
    expect(parseBeispiel('C4 E4 | G4')).toHaveLength(2);
    expect(() => parsePitch('H4')).toThrow();
  });

  it('meldet fehlende Kopfzeilen', () => {
    expect(() => parseEintrag('kein Kopf')).toThrow();
    expect(() => parseEintrag('---\nid: x\n---\n')).toThrow(/titel/);
  });

  it('findet Begriffe fehlertolerant', () => {
    expect(sucheEintraege('neapolitanisch')[0]?.id).toBe('neapolitaner');
    expect(sucheEintraege('Quintenzirkle')[0]?.id).toBe('quintenzirkel');
    expect(sucheEintraege('Tritonus')[0]?.id).toBe('tritonus');
    expect(sucheEintraege('Durtonleiter').map((e) => e.id)).toContain('durtonleiter');
    expect(sucheEintraege('').length).toBe(EINTRAEGE.length);
    expect(normalisiere('Übermäßig')).toBe('ubermassig');
  });
});
