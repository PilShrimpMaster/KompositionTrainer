import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { kpDoc } from '../editor/satzdoc';
import { pruefeKontrapunkt } from '../kontrapunkt/fux';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { pruefe } from './pruefung';

/** Musterlösungen zu den Schreibaufgaben der Stufe 3: Gegenstimme (bzw. Melodie) in Kurzform */
const LOESUNGEN: Record<string, string> = {
  'Eigener Cantus firmus': 'C4:1 D4 F4 E4 G4 F4 E4 D4 C4',
  'Gegenstimme über dem Cantus firmus': 'C4:1 B3 A3 C4 D4 B3 C4 E4 C4 B3 C4',
  'Gegenstimme unter dem Cantus firmus': 'C3:1 B2 D3 C3 D3 C3 F3 E3 C3 B2 C3',
  'Zwei gegen eine': 'r:2 G3 | B3 C4 | D4 C4 | G3 C4 | A3 D4 | B3 D4 | C4 E4 | B3 D4 | C4 G3 | B3:1 | C4:1',
  'Vier gegen eine': 'D4:4 E4 F4 G4 | A4 G4 F4 A4 | G4 F4 E4 C4 | F4 E4 D4 C4 | B3 C4 D4 E4 | F4 G4 A4 F4 | E4 F4 G4 A4 | B4 A4 G4 B4 | A4 G4 F4 D4 | C#4 D4 E4 C#4 | D4:1',
  'Synkopen über dem Cantus firmus': 'r:2 G3~ | G3 F3~ | F3 C4~ | C4 E4~ | E4 D4~ | D4 E4~ | E4 C4~ | C4 B3~ | B3 C4~ | C4 B3 | C4:1',
  'Floride Gegenstimme': 'r:2 A4 | F4:4 G4 A4:2 | G4:2 C5~ | C5:4 B4 A4:2 | B4:4 C5 D5:2 | A4:2 B4:4 C5 | A4:2 C5~ | C5:4 B4 D5:2 | A4:2 D5~ | D5:2 C#5 | D5:1',
};

const stufe3 = LEKTIONEN.filter((l) => l.modul.startsWith('s3-'));

describe('Stufe 3: Kontrapunkt', () => {
  it('hat Lektionen für Kirchentonarten und alle fünf Gattungen', () => {
    for (const m of ['s3-kirchentonarten', 's3-gattung1', 's3-gattung2', 's3-gattung3', 's3-gattung4', 's3-gattung5']) expect(lektionFuer(m), m).toBeDefined();
  });

  it('alle zweistimmigen Beispiele sind in ihrer Gattung fehlerfrei', () => {
    let n = 0;
    for (const l of stufe3)
      for (const s of l.schritte)
        for (const b of s.bausteine) {
          if (b.art !== 'noten' || !b.kontrapunkt) continue;
          n++;
          const fehler = pruefeKontrapunkt(b.score, { ...b.kontrapunkt, hinweise: false });
          expect(fehler.map((f) => `T${f.takt}: ${f.text}`), `${l.modul}: ${b.score.title}`).toEqual([]);
        }
    expect(n).toBeGreaterThanOrEqual(5);
  });

  it('das Fehlerbeispiel zeigt Quintparallelen', () => {
    const b = stufe3.flatMap((l) => l.schritte.flatMap((s) => s.bausteine)).find((b) => b.art === 'noten' && b.score.title.startsWith('Mit Fehler'));
    if (b?.art !== 'noten') throw new Error('Fehlerbeispiel fehlt');
    expect(pruefeKontrapunkt(b.score, { gattung: 1, cf: 1, hinweise: false }).map((x) => x.regel)).toContain('kp-parallelen');
  });

  const aufgaben = alleAufgaben().filter((a) => stufe3.some((l) => a.id.startsWith(l.modul)));
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(7);
    for (const a of aufgaben) expect(LOESUNGEN[a.titel], a.titel).toBeDefined();
  });

  for (const a of aufgaben) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      const loesung = parseNotenfolge(LOESUNGEN[a.titel]);
      const basis = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' as const }, time: a.takt ?? { beats: 4, beatType: 4 }, clef: a.schluessel ?? ('treble' as const) };
      const doc = a.kontrapunkt ? kpDoc(basis, a.kontrapunkt.gattung, a.kontrapunkt.cf, a.kontrapunkt.cantus, loesung) : { ...basis, events: loesung };
      const ergebnis = pruefe(doc, a.pruefung);
      expect(ergebnis.filter((p) => !p.ok).map((p) => `${p.text}: ${p.hinweis}`)).toEqual([]);
    });
  }

  it('eine leere Gegenstimme besteht nicht', () => {
    const a = aufgaben.find((x) => x.kontrapunkt)!;
    const doc = kpDoc({ ...emptyDoc() }, a.kontrapunkt!.gattung, a.kontrapunkt!.cf, a.kontrapunkt!.cantus);
    expect(pruefe(doc, a.pruefung).every((p) => p.ok)).toBe(false);
  });
});
