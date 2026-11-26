import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { freiDoc, klavierDoc } from '../editor/satzdoc';
import type { EditorDoc } from '../editor/rebar';
import { pruefeKlaviersatz } from '../satz/klavier';
import { pruefeSatz } from '../satz/regeln';
import { stilmerkmale } from '../satz/stilmerkmale';
import { MODULE } from './module';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { pruefe } from './pruefung';

const SONATINE =
  'C5:4 E5:8 C5:8 G4:4 G4:4 | A4:8 B4 C5 D5 E5:2 | F5:4 D5:4 B4:4 G4:4 | C5:4 A4:4 B4:2 | C5:4 E5:8 C5:8 G4:4 G4:4 | A4:8 B4 C5 D5 E5:2 | F5:8 E5 D5 C5 B4:4 D5:4 | C5:1';
const SONATINE_BASS =
  'C3:8 G3 E3 G3 C3 G3 E3 G3 | F2:8 C3 A2 C3 C3 G3 E3 G3 | G2:8 D3 B2 D3 G2 D3 B2 D3 | A2:8 E3 C3 E3 G2 D3 B2 D3 | C3:8 G3 E3 G3 C3 G3 E3 G3 | F2:8 C3 A2 C3 C3 G3 E3 G3 | F2:8 C3 A2 C3 G2 D3 B2 D3 | C3:8 G3 E3 G3 C3:2';

/** Musterlösungen: Melodie; Klaviersatz „Melodie || Begleitung“; vierstimmig „S || A || T || B“ */
const LOESUNGEN: Record<string, string> = {
  'Eine Sarabande begleiten':
    'G4:4 Bb4:4. A4:8 | G4:4 F#4:4. G4:8 | Eb4:4 C4:4. D4:8 | D4:2. | Bb4:4 D5:4. C5:8 | G4:4 Bb4:4. A4:8 | A4:4 F#4:4. A4:8 | G4:2. || G3:2. | D3:2. | C3:2. | D3:2. | G3:2. | Eb3:2. | D3:2. | G2:2.',
  'Eine Kadenz mit Quartsextakkord': 'C5:4 D5 C5 Bb4 | A4:1 || A4:4 Bb4 A4 G4 | F4:1 || F4:4 F4 F4 E4 | F4:1 || F3:4 Bb2 C3 C3 | F3:1',
  'Ein übermäßiger Sextakkord vor der Dominante': 'C5:4 D5 D#5:2 | E5:2 E5:2 || A4:4 A4 A4:2 | G#4:2 A4:2 || E4:4 A3 A3:2 | B3:2 C4:2 || A2:4 F2 F2:2 | E2:2 A2:2',
  'Eine Ganztonmelodie': 'D5:4 E5 F#5 G#5 | A#5:2 G#5:2 | F#5:4 E5 D5 C5 | D5:1',
  'Eine Reihe und ihr Krebs': 'E4:4 F4 C5 B4 | Bb4 Eb5 D4 C#4 | G4 F#4 A4 Ab4 | Ab4 A4 F#4 G4 | C#4 D4 Eb5 Bb4 | B4 C5 F4 E4',
  'Dieselbe Melodie klassisch': 'E5:4 E5 C5 A4 | B4 B4 C5:2 || G4:4 G4 A4 F4 | D4 F4 E4:2 || C4:4 B3 A3 C4 | G3 G3 G3:2 || C3:4 E3 F3 F3 | G2 G2 C3:2',
  'Eine Szene über dem Orgelpunkt': 'C5:2 D5:2 | E5:2 D5:2 | C5:2 B4:2 | C5:1 || A4:2 A4:2 | B4:2 A4:2 | G4:2 G4:2 | A4:1 || E4:2 F4:2 | G4:2 F4:2 | E4:2 D4:2 | E4:1 || A2:2 A2:2 | A2:2 A2:2 | A2:2 A2:2 | A2:1',
  'Eine Fortspinnung':
    'E4:8 G4 C5 G4 B4 D5 G5 D5 | A4:8 C5 F5 C5 D4 F4 B4 F4 | G4:8 B4 E5 B4 C4 E4 A4 E4 | F4:8 A4 D5 A4 D5 B4 G4 B4 | C5:1 || C3:2 G2:2 | F2:2 B2:2 | E2:2 A2:2 | D2:2 G2:2 | C2:1',
  'Ein Sonatinen-Thema begleiten': `${SONATINE} || ${SONATINE_BASS}`,
  'Ein Choral mit Neapolitaner': 'D5:4 Eb5 C#5 D5 | D5 C#5 D5:2 || A4:4 G4 E4 F4 | G4 G4 F4:2 || F4:4 Bb3 A3 A3 | Bb3 Bb3 A3:2 || D3:4 G2 A2 D3 | G2 E3 D3:2',
  'Eine Klangfläche': 'A4:4 B4 D5 B4 | A4:2 G4:2 | E4:1 || F4:4 G4 B4 G4 | F4:2 E4:2 | C4:1 || D4:4 E4 G4 E4 | D4:2 C4:2 | A3:1 || D3:4 E3 G3 E3 | D3:2 C3:2 | A2:1',
  'Eine Zwölftonreihe': 'E4:4 F4 C5 B4 | Bb4 Eb5 D4 C#4 | G4 F#4 A4 Ab4 | E4:1',
  'Eine romantische Harmonisierung': 'E5:4 E5 C5 A4 | B4 B4 C5:2 || G4:4 G#4 A4 F4 | G4 F4 E4:2 || C4:4 B3 C4 D4 | D4 D4 C4:2 || C3:4 E3 A2 D3 | G2 G2 C3:2',
  'Ein Heldenmotiv mit Medianten': 'E5:2 E5:2 | Eb5:2 E5:2 || C5:2 G#4:2 | Ab4:2 G4:2 || C4:2 B3:2 | C4:2 C4:2 || C3:2 E3:2 | Ab2:2 C3:2',
  'Mein Werk, 1. Satz': `${SONATINE} | ${SONATINE} || ${SONATINE_BASS} | ${SONATINE_BASS}`,
  'Mein Werk, 2. Satz': `${SONATINE} || ${SONATINE_BASS}`,
  'Ein Soggetto im Dorischen': 'D4:2 F4:4 E4:4 | G4:2 A4:2 | B4:4 C5:4 A4:4 B4:4 | G4:4 F4:4 E4:2 | D4:1',
  'Ein Imitationspunkt': 'C4:2 E4:2 | G4:2 E4:2 | B4:2 G4:2 | F4:2 D4:2 | C4:1 || r:1 | C3:2 E3:2 | G3:2 E3:2 | D3:2 B2:2 | C3:1',
  'Variationen über einem Lamento-Bass':
    'F4:2 E4:2 | D4:2 C#4:2 | F4:4 A4:4 G4:4 E4:4 | Bb4:4 F4:4 C#5:4 E5:4 | F5:4 D5:4 E5:4 C5:4 | D5:4 F5:4 E5:4 C#5:4 | D5:4 A4:4 E5:4 G5:4 | D5:4 F5:4 E5:4 C#5:4 | D5:1 || D3:2 C3:2 | Bb2:2 A2:2 | D3:2 C3:2 | Bb2:2 A2:2 | D3:2 C3:2 | Bb2:2 A2:2 | D3:2 C3:2 | Bb2:2 A2:2 | D3:1',
  'Ein Ritornell': 'F4:8 A4 C5 A4 G4 Bb4 D5 Bb4 | A4:8 C5 E5 C5 Bb4 D5 F5 D5 | C5:8 Bb4 A4 G4 A4 G4 F4 E4 | F4:8 A4 G4 E4 F4:2',
  'Ein Satz mit Abspaltung': 'F4:4 A4 C5:2 | Bb4:4 G4 E4:2 | G4:4 Bb4 D5:2 | C5:4 A4 F4:2 | F4:8 A4 C5:4 G4:8 Bb4 D5:4 | A4:8 C5 E5:4 Bb4:8 D5 F5:4 | E5:4 C5 A4 G4 | F4:1',
  'Das Kopfmotiv verarbeiten': 'C5:8 D5 E5 C5 D5 E5 F5 D5 | E5:8 F5 G5 E5 C5:2 | C5:4 D5 E5 C5 | B4:4 A4 G4:2 | E5:8 D5 C5 E5 D5 C5 B4 D5 | C5:8 B4 A4 C5 B4:2 | C5:8 D5 E5 C5 B4:4 D5 | C5:1',
  'Modulation mit dem verminderten Septakkord': 'F5:2 F5:2 | E5:2 E5:2 | D5:1 || A4:2 Bb4:2 | G4:2 G4:2 | F4:1 || C4:2 D4:2 | C#4:2 C#4:2 | D4:1 || F3:2 Bb2:2 | Bb2:2 A2:2 | D3:1',
  'Eine Liedbegleitung': 'B4:2. A4:8 G4:8 | G4:2 E4:2 | E4:4 G4:4 C5:4 B4:8 A4:8 | A4:2 F#4:2 | G4:1 || G2:8 D3 B3 D3 G2 D3 B3 D3 | E2:8 B2 G3 B2 E2 B2 G3 B2 | C2:8 G2 E3 G2 C2 G2 E3 G2 | D3:8 A3 C4 A3 D3 A3 F#3 A3 | G2:8 D3 B3 D3 G2:2',
  'Ein Ostinato im 7/8-Takt': 'D4:4 F4:4 A4:4. | D4:4 F4:4 A4:4. | D4:4 F4:4 A4:4. | E4:4 G4:4 Bb4:4. | E4:4 G4:4 Bb4:4. | D4:4 F4:4 D4:4.',
  'Tintinnabuli': 'A4:4 B4:4 C5:4 B4:4 | A4:4 G4:4 A4:2 | C5:4 D5:4 E5:4 D5:4 | C5:4 B4:4 A4:2 || E3:4 A3:4 A3:4 A3:4 | E3:4 E3:4 E3:2 | A3:4 C4:4 C4:4 C4:4 | A3:4 A3:4 E3:2',

};

const stufe6 = LEKTIONEN.filter((l) => l.modul.startsWith('s6-'));
const bausteine = stufe6.flatMap((l) => l.schritte.flatMap((s) => s.bausteine.map((b) => ({ l, b }))));

describe('Stufe 6: Stilepochen', () => {
  it('hat zu jedem Modul eine Lektion und ein Abschlussprojekt', () => {
    for (const m of MODULE.filter((x) => x.stufe === 6)) expect(lektionFuer(m.id), m.id).toBeDefined();
    expect(lektionFuer('s6-abschluss')).toBeDefined();
  });

  it('die Beispiele sind in ihrem Stil ohne Fehler', () => {
    let n = 0;
    for (const { l, b } of bausteine) {
      if (b.art !== 'noten' || b.score.voices.length < 2) continue;
      const fehler = b.harmonien ? pruefeKlaviersatz(b.score, { hinweise: false }) : b.score.voices.length === 4 ? pruefeSatz(b.score).filter((f) => f.art === 'fehler') : [];
      n++;
      expect(fehler.map((f) => `T${f.takt}: ${f.text}`), `${l.modul}: ${b.score.title}`).toEqual([]);
    }
    expect(n).toBeGreaterThanOrEqual(8);
  });

  it('die Beispiele mit Stilmerkmalen zeigen ihr Merkmal', () => {
    const ids = Object.fromEntries(bausteine.flatMap(({ b }) => (b.art === 'noten' && b.merkmale ? [[b.score.title, stilmerkmale(b.score).map((m) => m.id)]] : [])));
    expect(ids['Übungssatz: Fortspinnung mit Quintfallsequenz']).toContain('sequenz');
    expect(ids['Übungssatz: Parallelverschiebung']).toContain('parallelverschiebung');
    expect(ids['Übungssatz: Quartenklänge']).toContain('quarten');
    expect(ids['Übungsreihe: Zwölf Töne']).toContain('zwoelfton');
    expect(ids['Übungssatz: Medianten']).toContain('mediante');
    expect(ids['Übungssatz: Neapolitaner und verminderter Septakkord in a-Moll']).toEqual(expect.arrayContaining(['neapolitaner', 'verminderter-septakkord']));
  });

  const aufgaben = alleAufgaben().filter((a) => stufe6.some((l) => a.id.startsWith(l.modul)));
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(9);
    for (const a of aufgaben) expect(LOESUNGEN[a.titel], a.titel).toBeDefined();
  });

  for (const a of aufgaben) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      const basis: EditorDoc = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' }, time: a.takt ?? { beats: 4, beatType: 4 }, stil: a.stil };
      const teile = LOESUNGEN[a.titel].split('||').map(parseNotenfolge);
      let doc: EditorDoc;
      let nurVorgabe: EditorDoc | undefined;
      if (a.klavier) {
        const [mel, beg] = teile;
        if (a.klavier.melodie.length) expect(mel.map((e) => [e.pitch, e.duration])).toEqual(a.klavier.melodie.map((e) => [e.pitch, e.duration]));
        if (a.klavier.begleitung.length) expect(beg.map((e) => [e.pitch, e.duration])).toEqual(a.klavier.begleitung.map((e) => [e.pitch, e.duration]));
        doc = klavierDoc(basis, mel, beg);
        nurVorgabe = klavierDoc(basis, a.klavier.melodie, a.klavier.begleitung);
      } else if (a.kontrapunkt?.gattung === 'frei') {
        const [oben, unten] = teile;
        expect(oben.slice(0, a.kontrapunkt.cantus.length).map((e) => [e.pitch, e.duration])).toEqual(a.kontrapunkt.cantus.map((e) => [e.pitch, e.duration]));
        doc = freiDoc(basis, oben, unten);
        nurVorgabe = freiDoc(basis, a.kontrapunkt.cantus, []);
      } else if (a.vorgabe) {
        a.vorgabe.forEach((v, i) => {
          if (v.length) expect(teile[i].map((e) => [e.pitch, e.duration]), `Stimme ${i}`).toEqual(v.map((e) => [e.pitch, e.duration]));
        });
        doc = { ...basis, events: teile[0], satz: { stimmen: teile, aktiv: 0 } };
        nurVorgabe = { ...basis, events: a.vorgabe[0], satz: { stimmen: a.vorgabe, aktiv: 0 } };
      } else doc = { ...basis, events: teile[0] };
      const ergebnis = pruefe(doc, a.pruefung);
      expect(ergebnis.filter((p) => !p.ok).map((p) => `${p.text}: ${p.hinweis}`)).toEqual([]);
      if (nurVorgabe) expect(pruefe(nurVorgabe, a.pruefung).every((p) => p.ok)).toBe(false);
    });
  }
});
