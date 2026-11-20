import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { klavierDoc } from '../editor/satzdoc';
import { pruefeKlaviersatz } from '../satz/klavier';
import { analysiereForm } from '../satz/form';
import { MODULE } from './module';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { pruefe } from './pruefung';

/** Musterlösungen: Melodie, oder im Klaviersatz „Melodie || Begleitung“ */
const LOESUNGEN: Record<string, string> = {
  'Ein Thema mit Alberti-Bass':
    'E5:2 G5:4 E5:4 | D5:4. E5:16 F5:16 E5:2 | A5:4 G5 F5 D5 | C5:1 || C3:8 G3 E3 G3 C3 G3 E3 G3 | B2:8 G3 D3 G3 C3 G3 E3 G3 | F2:8 C3 A2 C3 G2 D3 B2 D3 | C3:8 G3 E3 G3 C3:2',
  'Melodie mit Bogen':
    'C4:4 E4 D4 F4 | E4:2 G4:2 | A4:4 G4 F4 A4 | G4:1 | A4:4 C5 B4 D5 | E5:2 D5:4 C5 | B4:4 A4 G4 B4 | C5:1',
  'Eine Periode':
    'B4:4 G4 A4 | B4:4 C5 D5 | E5:4 D5 C5 | A4:2. | B4:4 G4 A4 | B4:4 C5 D5 | C5:4 B4 A4 | G4:2.',
  'Ein Satz':
    'C4:4 E4 G4:2 | F4:4 D4 B3:2 | D4:4 F4 A4:2 | G4:4 E4 C4:2 | E4:8 F4 G4 E4 F4 G4 A4 F4 | G4:8 A4 B4 G4 A4 B4 C5 A4 | F4:4 D4 B3 D4 | C4:1',
  'Begleitung zu einer Melodie':
    'E5:4 C5 G4 | F5:4 D5 B4 | C5:4 E5 G5 | A5:2 F5:4 | G5:4 E5 C5 | F5:4 D5 B4 | B4:4 D5 G5 | C5:2. || C3:4 E3 G3 | G2:4 D3 F3 | C3:4 G3 E3 | F2:4 A2 C3 | C3:4 E3 G3 | G2:4 D3 F3 | G2:4 D3 F3 | C3:2.',
  'Dreiteilige Liedform':
    'F4:4 A4 C5 A4 | Bb4:4 G4 E4 C4 | F4:4 A4 G4 E4 | F4:1 | C5:8 D5 C5 Bb4 A4:2 | Bb4:8 C5 Bb4 A4 G4:2 | A4:8 Bb4 A4 G4 F4:4 E4:4 | G4:1 | F4:4 A4 C5 A4 | Bb4:4 G4 E4 C4 | F4:4 A4 G4 E4 | F4:1',
  'Menuett mit zwei Teilen':
    'B4:4 G4 D4 | C5:4 A4 F#4 | G4:4 B4 D5 | E5:2 C5:4 | D5:4 B4 G4 | C5:4 A4 F#4 | B4:4 G4 E4 | D4:2. | D5:4 C5 B4 | C5:4 B4 A4 | B4:4 A4 G4 | A4:2. | B4:4 G4 D4 | C5:4 A4 F#4 | F#4:4 A4 D5 | G4:2. || G3:2. | D3:2. | G3:2. | C3:2. | G3:2. | D3:2. | E3:2. | D3:2. | G3:2. | A3:2. | G3:2. | D3:2. | G3:2. | D3:2. | D3:2. | G3:2.',
  'Eine Variation':
    'C4:8 E4 G4 E4 G4 B4 G4 F4 | A4 C5 A4 F4 G4:2 | F4:8 A4 F4 D4 E4 G4 E4 C4 | D4 F4 D4 B3 C4:2',
  'Boogie-Bass zum Blues':
    'G4:8 Bb4 C5 Eb5 C5:4 Bb4:4 | G4:2 r:2 | G4:8 Bb4 C5 Eb5 C5:4 Bb4:4 | C5:2 r:2 | C5:8 Eb5 F5 Eb5 C5:4 A4:4 | A4:2 r:2 | G4:8 Bb4 C5 Eb5 C5:4 Bb4:4 | C5:2 r:2 | D5:8 F5 D5 B4 G4:2 | F5:8 Eb5 C5 A4 C5:2 | G4:8 Bb4 C5 Eb5 C5:4 G4:4 | C5:2 r:2 || C3:8 E3 G3 A3 Bb3 A3 G3 E3 | C3:8 E3 G3 A3 Bb3 A3 G3 E3 | C3:8 E3 G3 A3 Bb3 A3 G3 E3 | C3:8 E3 G3 A3 Bb3 A3 G3 E3 | F2:8 A2 C3 D3 Eb3 D3 C3 A2 | F2:8 A2 C3 D3 Eb3 D3 C3 A2 | C3:8 E3 G3 A3 Bb3 A3 G3 E3 | C3:8 E3 G3 A3 Bb3 A3 G3 E3 | G2:8 B2 D3 E3 F3 E3 D3 B2 | F2:8 A2 C3 D3 Eb3 D3 C3 A2 | C3:8 E3 G3 A3 Bb3 A3 G3 E3 | C3:8 E3 G3 A3 Bb3 A3 G3 E3',
  'Eine Stimme für Altsaxophon': 'A4:4 B4 C#5 D5 | E5:2 C#5:2 | D5:4 B4 G#4 B4 | A4:1',
  'Eine Melodie für Klarinette': 'G4:4 E4 C4 E4 | G4:2 C5:2 | B4:4 A4 G4 F4 | E4:2 D4:2 | E4:4 G4 C5 E5 | D5:2 B4:2 | C5:4 A4 F4 D4 | C4:1',
  'Mein Menuett mit Trio':
    'E5:4 C5 G4 | F5:4 D5 B4 | C5:4 E5 G5 | A5:2 F5:4 | G5:4 E5 C5 | F5:4 D5 B4 | E5:4 C5 A4 | G4:2. | G5:4 F5 E5 | F5:4 E5 D5 | E5:4 D5 C5 | D5:2. | E5:4 C5 G4 | F5:4 D5 B4 | B4:4 D5 G5 | C5:2. | A4:4 F4 C4 | Bb4:4 G4 E4 | F4:4 A4 C5 | D5:2 Bb4:4 | C5:4 A4 F4 | Bb4:4 G4 E4 | A4:4 F4 D4 | C4:2. | C5:4 Bb4 A4 | Bb4:4 A4 G4 | A4:4 G4 F4 | G4:2. | A4:4 F4 C4 | Bb4:4 G4 E4 | E4:4 G4 C5 | F4:2. || C3:2. | G2:2. | C3:2. | F2:2. | C3:2. | G2:2. | A2:2. | G2:2. | C3:2. | D3:2. | C3:2. | G2:2. | C3:2. | G2:2. | G2:2. | C3:2. | F3:2. | C3:2. | F3:2. | Bb2:2. | F3:2. | C3:2. | D3:2. | C3:2. | F3:2. | G3:2. | F3:2. | C3:2. | F3:2. | C3:2. | C3:2. | F3:2.',
};

const stufe4 = LEKTIONEN.filter((l) => l.modul.startsWith('s4-'));

describe('Stufe 4: Melodik und Formenlehre', () => {
  it('hat zu jedem Modul eine Lektion und ein Abschlussprojekt', () => {
    for (const m of MODULE.filter((x) => x.stufe === 4)) expect(lektionFuer(m.id), m.id).toBeDefined();
    expect(lektionFuer('s4-abschluss')).toBeDefined();
  });

  it('alle Klavierbeispiele sind ohne Fehler im Klaviersatz', () => {
    let n = 0;
    for (const l of stufe4)
      for (const s of l.schritte)
        for (const b of s.bausteine) {
          if (b.art !== 'noten' || !b.harmonien) continue;
          n++;
          expect(pruefeKlaviersatz(b.score, { hinweise: false }).map((f) => `T${f.takt}: ${f.text}`), `${l.modul}: ${b.score.title}`).toEqual([]);
        }
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it('die Formbeispiele zeigen die Form, die der Text verspricht', () => {
    const formen = stufe4.flatMap((l) => l.schritte.flatMap((s) => s.bausteine)).flatMap((b) => (b.art === 'noten' && b.form ? [[b.score.title, analysiereForm(b.score).form]] : []));
    expect(Object.fromEntries(formen)).toMatchObject({
      'Beethoven, Ode an die Freude': 'Periode',
      'Petzold, Menuett G-Dur, Takt 1–8': 'Satz',
      'Volkslied: Hänschen klein': 'Dreiteilige Liedform (A B A)',
      'Übungssatz: Menuett mit Trio': 'Menuett mit Trio',
    });
  });

  const aufgaben = alleAufgaben().filter((a) => stufe4.some((l) => a.id.startsWith(l.modul)));
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(8);
    for (const a of aufgaben) expect(LOESUNGEN[a.titel], a.titel).toBeDefined();
  });

  for (const a of aufgaben) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      const basis = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' as const }, time: a.takt ?? { beats: 4, beatType: 4 } };
      let doc;
      if (a.klavier) {
        const [mel, beg] = LOESUNGEN[a.titel].split('||').map(parseNotenfolge);
        if (a.klavier.melodie.length) expect(mel).toEqual(a.klavier.melodie);
        doc = klavierDoc(basis, mel, beg);
        // Ohne Begleitung besteht die Aufgabe nicht
        expect(pruefe(klavierDoc(basis, mel, []), a.pruefung).every((p) => p.ok)).toBe(false);
      } else doc = { ...basis, events: parseNotenfolge(LOESUNGEN[a.titel]) };
      const ergebnis = pruefe(doc, a.pruefung);
      expect(ergebnis.filter((p) => !p.ok).map((p) => `${p.text}: ${p.hinweis}`)).toEqual([]);
    });
  }
});
