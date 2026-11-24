import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { klavierDoc } from '../editor/satzdoc';
import type { EditorDoc } from '../editor/rebar';
import { jazzAnalyse, leadsheet, pruefeLeadsheet } from '../jazz/analyse';
import { pruefeSatz } from '../satz/regeln';
import { stilmerkmale } from '../satz/stilmerkmale';
import { MODULE } from './module';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { pruefe } from './pruefung';

const OSTINATO = Array(8).fill('D3:8 A3 D4 A3 D3 A3 D4 A3');
const BLUES =
  'A4:4[F7] C5 Eb5 C5 | D5:4[Bb7] F5 Ab5:2 | A4:4[F7] C5 F5:2 | Eb5:2[Cm7] Eb5:2[F7] | D5:4[Bb7] F5 Ab5 F5 | D5:2[Bdim7] F5:2 | C5:1[F7] | C5:2[D7] F#5:2 | Bb4:2[Gm7] D5:2 | E5:2[C7] G5:2 | F5:2[F7] F#5:2[D7] | F5:2[Gm7] E5:2[C7]';

/** Musterlösungen: Leadsheet oder Melodie; Klaviersatz „Melodie || Begleitung“; vierstimmig „S || A || T || B“ */
const LOESUNGEN: Record<string, string> = {
  'Septakkorde in a-Moll': 'E5:2[Am7] C5:2 | F5:2[Dm7] A5:2 | D5:2[Bm7b5] G#4:2[E7] | A4:1[Am6]',
  'Eine II–V–I in d-Moll': 'G4:2[Em7b5] Bb4:2 | A4:2[A7] C#5:2 | D5:1[Dm6] | F5:1',
  'Drop-2-Voicings in Bb-Dur': 'Bb4:1 | A4:1 | A4:1 || Eb4:1 | Eb4:1 | D4:1 || C4:1 | C4:1 | Bb3:1 || G3:1 | F3:1 | F3:1',
  'Zwei Akkorde einschieben': 'E5:2[Cmaj7] G5:2[A7] | F5:2[Dm7] D5:2 | B4:2[G7] D5:2[Db7] | C5:1[Cmaj7]',
  'Ein Turnaround in F-Dur': 'A4:2[Fmaj7] F#4:2[D7] | Bb4:2[Gm7] E4:2[C7] | A4:2[Fmaj7] C5:2[D7] | Bb4:2[Gm7] G4:2[C7] | F4:1[Fmaj7]',
  'Eine Rock-Strophe mit bVII': 'E5:2[C] G5:2 | D5:2[Bb] F5:2 | C5:2[F] A4:2 | C5:1[C]',
  'Ein Cue über einem Orgelpunkt': 'D5:4 F5 A5 F5 | D5:4 G5 Bb5 G5 | C#5:4 E5 A5 E5 | D5:1 || D3:1 | D3:1 | D3:1 | D3:1',
  'Ein Pattern über wechselndem Bass': 'E5:8 A4 C5 A4 E5 A4 C5 A4 | E5:8 A4 C5 A4 E5 A4 C5 A4 | E5:8 A4 C5 A4 E5 A4 C5 A4 | E5:8 A4 C5 A4 E5 A4 C5 A4 || C3:1 | C3:1 | F2:1 | F2:1',
  'Akkorde über eine Melodie': 'C5:2[Cmaj7] E5:2 | D5:2[Dm7] F5:2 | B4:2[G7] D5:2 | C5:1[Cmaj7]',
  'Zwei II–V–I hintereinander': 'F5:2[Dm7] A5:2 | G5:2[G7] F5:2 | E5:1[Cmaj7] | D5:2[Cmaj7] E5:2 | Bb4:2[Gm7] D5:2 | C5:2[C7] E5:2 | A4:2[Fmaj7] C5:2 | C5:1[Cmaj7]',
  'Drop-2-Voicings zu einer II–V–I': 'C5:1 | B4:1 | B4:1 || F4:1 | F4:1 | E4:1 || D4:1 | D4:1 | C4:1 || A3:1 | G3:1 | G3:1',
  'Ein Leadsheet reharmonisieren': 'E5:2[Cmaj7] D5:4 C5:4 | G4:1[A7] | A4:2[Dm7] C5:2 | F5:1[Db7] | E5:2[Cmaj7] C5:2 | D5:2[G7] B4:2 | C5:1[C6] | C5:1',
  'Akkorde für einen Jazz-Blues': BLUES,
  'Ein Refrain mit Loop und modaler Mischung': 'E5:4[C] E5 D5 C5 | D5:2[G] B4:2 | C5:4[Am] C5 B4 A4 | A4:1[F] | E5:4[C] E5 D5 C5 | D5:2[G] G5:2 | Ab4:2[Fm] C5:2 | C5:1[C]',
  'Ein Ostinato unter einem Leitmotiv': `D5:4. E5:8 F5:4 A5:4 | A5:2 G5:2 | E5:4. F5:8 G5:4 Bb5:4 | A5:1 || ${OSTINATO.slice(0, 4).join(' | ')}`,
  'Eine Reihe und ihre Umkehrung': 'E4:4 F4 C5 B4 | Bb4 Eb5 D4 C#4 | G4 F#4 A4 Ab4 | E4 Eb4 Ab4 A4 | Bb4 F4 F#4 G4 | C#5 D5 B4 C5',
  'Mein reharmonisiertes Leadsheet':
    'E5:2[Cmaj7] G5:2 | A5:2[A7] G5:2 | F5:2[Dm7] A5:2 | G5:1[G7] | F5:2[Dm7] D5:2[G7] | E5:2[Cmaj7] C5:2 | D5:2[Dm7] B4:2[G7] | C5:1[Cmaj7] | E5:2[Cmaj7] G5:2 | A5:2[A7] G5:2 | F5:2[Dm7] A5:2 | G5:1[Abmaj7] | F5:2[Dm7] D5:2[Db7] | E5:2[Cmaj7] C5:2 | D5:2[Dm7] B4:2[G7] | C5:1[C6]',
  'Mein Film-Cue mit Leitmotiv': `D5:4. E5:8 F5:4 A5:4 | A5:2 G5:2 | E5:4. F5:8 G5:4 Bb5:4 | A5:1 | F5:4. G5:8 A5:4 C6:4 | C6:2 Bb5:2 | A5:4 G5 F5 E5 | D5:1 || ${OSTINATO.join(' | ')}`,
};

const stufe7 = LEKTIONEN.filter((l) => l.modul.startsWith('s7-'));
const bausteine = stufe7.flatMap((l) => l.schritte.flatMap((s) => s.bausteine.map((b) => ({ l, b }))));

describe('Stufe 7: Jenseits der Klassik', () => {
  it('hat zu jedem Modul eine Lektion und ein Abschlussprojekt', () => {
    for (const m of MODULE.filter((x) => x.stufe === 7)) expect(lektionFuer(m.id), m.id).toBeDefined();
    expect(lektionFuer('s7-abschluss')).toBeDefined();
  });

  it('die Leadsheets der Lektionen haben keine Avoid Notes, die Sätze keine Fehler im Stil', () => {
    let n = 0;
    for (const { l, b } of bausteine) {
      if (b.art !== 'noten') continue;
      if (b.score.voices.length === 1 && b.score.voices[0].measures.some((m) => m.notes.some((x) => x.akkord))) {
        n++;
        expect(pruefeLeadsheet(b.score).filter((f) => f.art === 'fehler').map((f) => `T${f.takt}: ${f.text}`), `${l.modul}: ${b.score.title}`).toEqual([]);
      }
      if (b.score.voices.length === 4) expect(pruefeSatz(b.score).filter((f) => f.art === 'fehler').map((f) => f.text), b.score.title).toEqual([]);
    }
    expect(n).toBeGreaterThanOrEqual(8);
  });

  it('die Beispiele zeigen, was der Text verspricht', () => {
    const score = (titel: string) => {
      const b = bausteine.find(({ b }) => b.art === 'noten' && b.score.title === titel)?.b;
      if (b?.art !== 'noten') throw new Error(titel);
      return b.score;
    };
    const muster = (titel: string) => jazzAnalyse(leadsheet(score(titel)).akkorde, score(titel).key).muster.map((m) => m.art);
    expect(muster('II–V–I in C-Dur')).toContain('ii-v-i');
    expect(muster('II–V–I in a-Moll')).toContain('ii-v-i');
    expect(muster('Dieselbe Melodie reharmonisiert')).toEqual(expect.arrayContaining(['zwischendominante', 'tritonus-substitution']));
    expect(muster('Jazz-Blues in F').filter((m) => m === 'ii-v-i')).toHaveLength(2);
    expect(muster('Übungsrefrain mit Loop und Fm')).toContain('modale-mischung');
    const merkmale = (titel: string) => stilmerkmale(score(titel)).map((m) => m.id);
    expect(merkmale('Übungscue: Leitmotiv über Ostinato')).toContain('ostinato');
    expect(merkmale('Übungspattern: Minimal Music')).toContain('ostinato');
    expect(merkmale('Reihe und Umkehrung')).toContain('zwoelfton');
  });

  const aufgaben = alleAufgaben().filter((a) => stufe7.some((l) => a.id.startsWith(l.modul)));
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(10);
    for (const a of aufgaben) expect(LOESUNGEN[a.titel], a.titel).toBeDefined();
  });

  for (const a of aufgaben) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      const basis: EditorDoc = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' }, time: a.takt ?? { beats: 4, beatType: 4 }, stil: a.stil };
      const teile = LOESUNGEN[a.titel].split('||').map(parseNotenfolge);
      const melodie = (evs: typeof teile[0]) => evs.map((e) => [e.pitch, e.duration]);
      let doc: EditorDoc;
      let nurVorgabe: EditorDoc | undefined;
      if (a.klavier) {
        const [mel, beg] = teile;
        if (a.klavier.melodie.length) expect(melodie(mel)).toEqual(melodie(a.klavier.melodie));
        doc = klavierDoc(basis, mel, beg);
        nurVorgabe = klavierDoc(basis, a.klavier.melodie, a.klavier.begleitung);
      } else if (a.vorgabe) {
        a.vorgabe.forEach((v, i) => {
          if (v.length) expect(melodie(teile[i]), `Stimme ${i}`).toEqual(melodie(v));
        });
        doc = { ...basis, events: teile[0], satz: { stimmen: teile, aktiv: 0 } };
        nurVorgabe = { ...basis, events: a.vorgabe[0], satz: { stimmen: a.vorgabe, aktiv: 0 } };
      } else {
        doc = { ...basis, events: teile[0] };
        if (a.leadsheet) {
          expect(melodie(teile[0])).toEqual(melodie(a.leadsheet));
          nurVorgabe = { ...basis, events: a.leadsheet };
        } else nurVorgabe = { ...basis, events: [] };
      }
      const kontext = { leadsheet: a.leadsheet };
      expect(pruefe(doc, a.pruefung, kontext).filter((p) => !p.ok).map((p) => `${p.text}: ${p.hinweis}`)).toEqual([]);
      expect(pruefe(nurVorgabe, a.pruefung, kontext).every((p) => p.ok)).toBe(false);
    });
  }
});
