import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { freiDoc, kpDoc } from '../editor/satzdoc';
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
  'Melodie in D-Dorisch': 'D4:4 E4 F4 A4 | B4:2 A4:4 G4 | F4:4 G4 A4 C5 | B4:2 A4:2 | D5:4 C5 B4 A4 | G4:4 B4 A4 F4 | E4:4 F4 G4 E4 | D4:1',
  // Freier Satz: Oberstimme (samt Vorgabe) || Unterstimme
  'Kanon an der Oktave': 'C4:2 E4:2 | D4:4 C4:4 B3:2 | F4:2 G4:2 | D4:2 B3:2 | C4:1 || r:1 | C3:2 E3:2 | D3:4 C3:4 B2:2 | F3:2 G3:2 | C3:1',
  'Anfang einer Invention':
    'C4:8 E4 D4 F4 E4:4 F4:4 | D4:8 F4 E4 G4 F4:4 E4:4 | E4:8 G4 F4 A4 G4:4 F4:4 | D4:4 B3:4 C4:2 || r:2 C3:8 E3 D3 F3 | F3:8 D3 E3 C3 D3:4 C3:4 | G3:8 E3 F3 D3 E3:4 D3:4 | G3:4 G2:4 C3:2',
  'Antwort und Kontrasubjekt':
    'C5:4 E5:8 D5:8 C5:4 G4:4 | A4:8 B4 C5:4 B4:4 C5:4 | D5:2 B4:4 A4:4 | G4:4 B4:4 A4:4 B4:4 | C5:4 B4:4 C5:2 || r:1 | r:1 | G3:4 B3:8 A3:8 G3:4 D3:4 | E3:8 F#3:8 G3:4 F#3:4 G3:4 | A3:4 G3:4 C3:2',
  'Meine Invention':
    'C4:8 E4 D4 F4 E4:4 F4:4 | D4:8 F4 E4 G4 F4:4 E4:4 | E4:8 G4 F4 A4 G4:4 F4:4 | G4:8 E4 F4 D4 E4:4 F4:4 | A4:8 F4 G4 E4 F4:4 G4:4 | B4:8 G4 A4 F4 G4:4 A4:4 | G4:4 F4:4 E4:4 D4:4 | D4:4 B3:4 C4:2 || r:2 C3:8 E3 D3 F3 | F3:8 D3 E3 C3 D3:4 C3:4 | G3:8 E3 F3 D3 E3:4 D3:4 | C3:8 E3 D3 F3 E3:4 D3:4 | D3:8 F3 E3 G3 F3:4 E3:4 | E3:8 G3 F3 A3 G3:4 F3:4 | C3:4 D3:4 E3:4 F3:4 | G3:4 G2:4 C3:2',
  'Floride Gegenstimme': 'r:2 A4 | F4:4 G4 A4:2 | G4:2 C5~ | C5:4 B4 A4:2 | B4:4 C5 D5:2 | A4:2 B4:4 C5 | A4:2 C5~ | C5:4 B4 D5:2 | A4:2 D5~ | D5:2 C#5 | D5:1',
};

const stufe3 = LEKTIONEN.filter((l) => l.modul.startsWith('s3-'));

describe('Stufe 3: Kontrapunkt', () => {
  it('hat Lektionen für Kirchentonarten und alle fünf Gattungen', () => {
    for (const m of ['s3-kirchentonarten', 's3-gattung1', 's3-gattung2', 's3-gattung3', 's3-gattung4', 's3-gattung5', 's3-imitation', 's3-invention', 's3-fuge', 's3-abschluss', 's3-modal-heute']) expect(lektionFuer(m), m).toBeDefined();
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
      const basis = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' as const }, time: a.takt ?? { beats: 4, beatType: 4 }, clef: a.schluessel ?? ('treble' as const) };
      let doc;
      if (a.kontrapunkt?.gattung === 'frei') {
        const [oben, unten] = LOESUNGEN[a.titel].split('||').map(parseNotenfolge);
        // Die Vorgabe muss der Anfang der Musterlösung sein
        expect(oben.slice(0, a.kontrapunkt.cantus.length)).toEqual(a.kontrapunkt.cantus);
        doc = freiDoc(basis, oben, unten);
      } else {
        const loesung = parseNotenfolge(LOESUNGEN[a.titel]);
        doc = a.kontrapunkt ? kpDoc(basis, a.kontrapunkt.gattung, a.kontrapunkt.cf, a.kontrapunkt.cantus, loesung) : { ...basis, events: loesung };
      }
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
