import { describe, expect, it } from 'vitest';
import type { EditorDoc } from '../editor/rebar';
import { pruefeSatz } from '../satz/regeln';
import { funktionsfolge } from '../satz/analyse';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { MODULE } from './module';
import { pruefe } from './pruefung';

/** Musterlösungen (Sopran, Alt, Tenor, Bass) zu den Satzaufgaben der Stufe 2 */
const LOESUNGEN: Record<string, [string, string, string, string]> = {
  'Kadenz ergänzen': ['B4:4 C5 A4 B4', 'G4:4 G4 F#4 G4', 'D4:4 E4 D4 D4', 'G3:4 C3 D3 G3'],
  'Oberstimmen zu einem Bass': ['G4:4 A4 G4 G4 | A4 A4 G4 G4', 'E4:4 F4 D4 E4 | E4 F4 D4 E4', 'C4:4 C4 B3 C4 | C4 C4 B3 C4', 'C3:4 F3 G3 C3 | A2 F2 G2 C3'],
  'Bezifferten Bass aussetzen': ['C5:4 C5 C5 B4 | C5:1', 'G4:4 G4 A4 G4 | G4:1', 'E4:4 C4 F4 D4 | E4:1', 'C3:4 E3 F3 G3 | C3:1'],
  'Kadenz mit D⁷ in F-Dur': ['C5:4 D5 C5 C5', 'A4:4 Bb4 Bb4 A4', 'F4:4 F4 E4 F4', 'F3:4 Bb3 C4 F3'],
  'Melodie aussetzen mit Trugschluss': ['G4:4 A4 G4 E4 | F4 D4 C4:2', 'E4:4 F4 D4 C4 | C4 B3 C4:2', 'C4:4 C4 B3 C4 | A3 G3 E3:2', 'C3:4 F3 G3 A3 | F3 G3 C3:2'],
  'Von C-Dur nach G-Dur': ['G4:4 A4 A4 A4 | G4:1', 'E4:4 F4 E4 F#4 | G4:1', 'C4:4 C4 C4 C4 | B3:1', 'C3:4 F3 A3 D3 | G3:1'],
  'Melodie zu einem Text': ['r:2 A4:4 | D5:2 D5:4 | E5:2 F#5:4 | E5:2 D5:4', '', '', ''],
  'Choralzeile ergänzen': ['B4:4 A4 G4 A4 | B4 B4 A4:2', 'G4:4 F#4 G4 F#4 | G4 F#4 F#4:2', 'D4:4 D4 B3 D4 | D4 D4 D4:2', 'G3:4 D3 E3 D3 | G3 B2 D3:2'],
  'Choralsatz zur Melodie in F-Dur': [
    'A4:4 G4 F4 G4 | A4 Bb4 A4:2 | C5:4 D5 C5 Bb4 | A4 G4 F4:2',
    'F4:4 E4 F4 E4 | F4 F4 F4:2 | F4:4 F4 E4 E4 | F4 E4 F4:2',
    'C4:4 C4 A3 C4 | C4 D4 C4:2 | A3:4 Bb3 G3 G3 | A3 C4 A3:2',
    'F3:4 C3 F3 C3 | F3 Bb2 F3:2 | F3:4 Bb2 C3 C3 | F3 C3 F3:2',
  ],
};

describe('Stufe 2', () => {
  it('hat eine Lektion für jedes Modul und das Abschlussprojekt', () => {
    for (const m of MODULE.filter((m) => m.stufe === 2)) expect(lektionFuer(m.id), m.id).toBeDefined();
    expect(lektionFuer('s2-abschluss')).toBeDefined();
  });

  it('alle vierstimmigen Beispiele sind fehlerfrei (außer den Fehlerbeispielen)', () => {
    for (const l of LEKTIONEN)
      for (const s of l.schritte)
        for (const b of s.bausteine) {
          if (b.art !== 'noten' || b.score.voices.length < 4 || b.score.title.startsWith('Mit Fehler')) continue;
          const fehler = pruefeSatz(b.score).filter((x) => x.art === 'fehler');
          expect(fehler.map((f) => f.text), `${l.modul}: ${b.score.title}`).toEqual([]);
        }
  });

  it('die Fehlerbeispiele zeigen ihren Fehler', () => {
    const b = LEKTIONEN.flatMap((l) => l.schritte.flatMap((s) => s.bausteine)).find((b) => b.art === 'noten' && b.score.title.startsWith('Mit Fehler: Quint'));
    if (b?.art !== 'noten') throw new Error('Fehlerbeispiel fehlt');
    expect(pruefeSatz(b.score).filter((x) => x.art === 'fehler').map((x) => x.regel)).toEqual(['parallelen']);
  });

  it('die Analyse der Beispiele stimmt mit dem Text überein', () => {
    const titel = (t: string) => {
      const b = LEKTIONEN.flatMap((l) => l.schritte.flatMap((s) => s.bausteine)).find((b) => b.art === 'noten' && b.score.title === t);
      if (b?.art !== 'noten') throw new Error(t);
      return funktionsfolge(b.score).join(' ');
    };
    expect(titel('Kadenz in C-Dur')).toBe('T S D T');
    expect(titel('Kadenz mit Dominantseptakkord')).toBe('T S D⁷ T');
    expect(titel('T – Sp – D – T')).toBe('T Sp D T');
    expect(titel('Trugschluss und richtiger Schluss')).toBe('T S D Tp S D T');
    expect(titel('Kadenz mit Doppeldominante')).toBe('T DD D T');
    expect(titel('Zeile in a-Moll mit pikardischer Terz')).toBe('t s D T');
  });

  for (const a of alleAufgaben().filter((a) => a.vorgabe)) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar und passt zur Vorgabe`, () => {
      const l = LOESUNGEN[a.titel];
      expect(l, 'Musterlösung fehlt').toBeDefined();
      const stimmen = l.map((s) => (s ? parseNotenfolge(s) : []));
      // Die Vorgaben stecken unverändert in der Lösung (ohne Fermaten verglichen)
      a.vorgabe!.forEach((v, i) => {
        if (v.length) expect(stimmen[i].map((e) => [e.pitch, e.duration]), `Stimme ${i}`).toEqual(v.map((e) => [e.pitch, e.duration]));
      });
      const doc: EditorDoc = {
        title: a.titel,
        tempo: 72,
        time: a.takt ?? { beats: 4, beatType: 4 },
        key: a.tonart ?? { fifths: 0, mode: 'major' },
        clef: 'treble',
        events: stimmen[0],
        satz: { stimmen, aktiv: 0, text: a.liedtext },
      };
      const nichtOk = pruefe(doc, a.pruefung).filter((p) => !p.ok);
      expect(nichtOk).toEqual([]);
    });
  }
});
