import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { ensembleDoc } from '../editor/satzdoc';
import { pruefeSatz } from '../satz/regeln';
import { MODULE } from './module';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { pruefe } from './pruefung';

const QUARTETT = ['F#5:2 E5:2 | D5:2 G5:2 | F#5:2 E5:2 | D5:1', 'D5:2 C#5:2 | B4:2 B4:2 | D5:2 A4:2 | F#4:1', 'A4:2 A4:2 | F#4:2 E4:2 | D4:2 C#4:2 | D4:1', 'D3:2 A2:2 | B2:2 E2:2 | A2:2 A2:2 | D2:1'];

/** Musterlösungen: Stimmen von oben nach unten, getrennt durch „||“ */
const LOESUNGEN: Record<string, string> = {
  'Eine Melodie für Viola': 'C4:4 E4 G4 E4 | F4:4 A4 G4:2 | E4:4 G4 C5 B4 | A4:2 G4:2 | F4:4 A4 G4 E4 | D4:4 F4 E4 C4 | D4:4 G3 B3 D4 | C4:1',
  'Ein Choral für Holzbläsertrio': 'E5:2 F5:2 | G5:2 E5:2 | F5:2 D5:2 | C5:1 || G4:2 A4:2 | C5:2 C5:2 | A4:2 B4:2 | E4:1 || C3:2 F3:2 | E3:2 C3:2 | F3:2 G3:2 | C3:1',
  'Eine Fanfare in D-Dur':
    'A4:4. A4:8 D5:4 F#5:4 | G5:2 E5:2 | F#5:1 || F#4:4. F#4:8 A4:4 D5:4 | D5:2 C#5:2 | D5:1 || D4:4. D4:8 F#4:4 A4:4 | B4:2 A4:2 | A4:1 || D3:4. D3:8 D3:4 D3:4 | G3:2 A3:2 | D3:1',
  'Ein Choral für Streichquartett': QUARTETT.join(' || '),
  'Ein Satz für Streichorchester': [...QUARTETT, 'D2:2 A1:2 | B1:2 E1:2 | A1:2 A1:2 | D2:1'].join(' || '),
  'Ein Saxophonsatz in Drop-2': 'E5:2 F5:2 | D5:2 E5:2 || A4:2 C5:2 | G4:2 B4:2 || G4:2 A4:2 | F4:2 G4:2 || C4:2 D4:2 | B3:2 C4:2',
  'Mein Streichquartett': QUARTETT.map((s) => `${s} | ${s}`).join(' || '),
};

const stufe5 = LEKTIONEN.filter((l) => l.modul.startsWith('s5-'));

describe('Stufe 5: Instrumentation', () => {
  it('hat zu jedem Modul eine Lektion und ein Abschlussprojekt', () => {
    for (const m of MODULE.filter((x) => x.stufe === 5)) expect(lektionFuer(m.id), m.id).toBeDefined();
    expect(lektionFuer('s5-abschluss')).toBeDefined();
  });

  it('die Ensemble-Beispiele sind ohne Satzfehler (außer dem Saxophonsatz in Drop-2)', () => {
    let n = 0;
    for (const l of stufe5)
      for (const s of l.schritte)
        for (const b of s.bausteine) {
          if (b.art !== 'noten' || !b.score.voices.some((v) => v.instrument)) continue;
          if (b.score.voices.some((v) => v.instrument?.endsWith('sax'))) continue;
          n++;
          expect(pruefeSatz(b.score).filter((f) => f.art === 'fehler').map((f) => f.text), `${l.modul}: ${b.score.title}`).toEqual([]);
        }
    expect(n).toBeGreaterThanOrEqual(5);
  });

  const aufgaben = alleAufgaben().filter((a) => stufe5.some((l) => a.id.startsWith(l.modul)));
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(7);
    for (const a of aufgaben) expect(LOESUNGEN[a.titel], a.titel).toBeDefined();
  });

  for (const a of aufgaben) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      expect(a.ensemble).toBeDefined();
      const { instrumente, vorgabe } = a.ensemble!;
      const stimmen = LOESUNGEN[a.titel].split('||').map(parseNotenfolge);
      expect(stimmen.length).toBe(instrumente.length);
      vorgabe.forEach((v, k) => {
        if (v.length) expect(stimmen[k].map((e) => [e.pitch, e.duration]), `Stimme ${k + 1}`).toEqual(v.map((e) => [e.pitch, e.duration]));
      });
      const basis = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' as const }, time: a.takt ?? { beats: 4, beatType: 4 } };
      const doc = ensembleDoc(basis, instrumente, stimmen);
      const ergebnis = pruefe(doc, a.pruefung);
      expect(ergebnis.filter((p) => !p.ok).map((p) => `${p.text}: ${p.hinweis}`)).toEqual([]);
      // Nur die Vorgabe reicht nicht
      if (vorgabe.some((v) => v.length)) expect(pruefe(ensembleDoc(basis, instrumente, vorgabe), a.pruefung).every((p) => p.ok)).toBe(false);
    });
  }
});
