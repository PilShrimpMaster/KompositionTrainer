import { describe, expect, it } from 'vitest';
import type { EditorDoc } from '../editor/rebar';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben } from './lektionen';
import { pruefe } from './pruefung';

/** Musterlösungen zu den einstimmigen Schreibaufgaben der Stufe 1 */
const LOESUNGEN: Record<string, string> = {
  'Stammtöne von c′ bis c″': 'C4:2 D4 E4 F4 G4 A4 B4 C5',
  'Stammtöne im Bassschlüssel': 'C3:2 D3 E3 F3 G3 A3 B3 C4',
  'Vier Takte im Dreivierteltakt': 'C5:4 D5 E5 | G5:2. | F5:4. E5:8 D5:4 | C5:2.',
  'Vier Takte im Sechsachteltakt': 'C5:4. E5:4 D5:8 | C5:8 D5 E5 G5:4. | F5:4 E5:8 D5:4. | C5:2.',
  'Melodie mit Synkope': 'C5:4 D5:8 E5:4 D5:8 C5:4 | G4:8 A4:4 B4:8~ B4:4 C5 | E5:8 D5:4 C5:8~ C5:4 A4 | B4:2 C5:2',
  'Melodie in Schritten und Terzen': 'C4 D4 E4 C4 | D4 E4 F4 D4 | E4 G4 F4 D4 | C4:1',
  'Terzenkette': 'C4 E4 G4 E4 C4 A3 C4 E4',
  'G-Dur-Tonleiter': 'G4 A4 B4 C5 D5 E5 F#5 G5',
  'D-Dur-Tonleiter': 'D4 E4 F#4 G4 A4 B4 C#5 D5',
  'Melodie in e-Moll mit Leitton': 'E4 F#4 G4 A4 | B4:2 G4 | A4:4 F#4 G4 F#4 | D#4:2 E4:2',
  'Melodie in a-Moll': 'A4 B4 C5 D5 | E5:2 C5 | D5:4 B4 C5 B4 | G#4:2 A4:2',
  'Es-Dur-Tonleiter': 'Eb4 F4 G4 Ab4 Bb4 C5 D5 Eb5',
  'Melodie in h-Moll': 'B4 C#5 D5 E5 | F#5:2 D5 | E5:4 C#5 D5 C#5 | A#4:2 B4:2',
  'Gebrochene Dreiklänge': 'C4 E4 G4 F4 A4 C5 G4 B4 D5 C4 E4 G4',
  'Dreiklänge in a-Moll': 'A4 C5 E5 D4 F4 A4 E4 G#4 B4 A4 C5 E5',
  'Achttaktige Melodie in Dur': 'E4:4 F4 G4 E4 | D4:4 E4 F4:2 | E4:4 G4 C5 B4 | A4:4 F4 D4:2 | E4:4 F4 G4 E4 | D4:4 E4 F4:2 | A4:4 G4 F4 D4 | C4:1',
  'Achttaktige Melodie im Dreivierteltakt': 'G4 A4 B4 | C5:2 B4:4 | A4 B4 C5 | D5:2. | G4:4 A4 B4 | C5:2 E5:4 | D5 C5 A4 | G4:2.',
};

const STUFE1 = alleAufgaben().filter((a) => a.id.startsWith('s1-'));

describe('Stufe 1', () => {
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(STUFE1.map((a) => a.titel).filter((t) => !LOESUNGEN[t])).toEqual([]);
  });

  for (const a of STUFE1)
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      const doc: EditorDoc = { title: '', tempo: 90, time: a.takt ?? { beats: 4, beatType: 4 }, key: a.tonart ?? { fifths: 0, mode: 'major' }, clef: a.schluessel ?? 'treble', events: parseNotenfolge(LOESUNGEN[a.titel] ?? '') };
      expect(pruefe(doc, a.pruefung).filter((p) => !p.ok)).toEqual([]);
    });
});
