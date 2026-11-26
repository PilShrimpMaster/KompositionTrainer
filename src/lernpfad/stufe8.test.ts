import { describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { klavierDoc } from '../editor/satzdoc';
import type { EditorDoc } from '../editor/rebar';
import { pruefeLeadsheet } from '../jazz/analyse';
import { beatAusKurzform, beatZuMidi, parseSteps, pruefeBeat, stepsText, VORLAGEN, vorlage } from '../produktion/beat';
import { pruefeSynth, synthAusKurzform, SYNTH_VORLAGEN } from '../produktion/synthVorlagen';
import { pruefeKlaviersatz } from '../satz/klavier';
import { erzeugeAufgabe } from '../uebungen/aufgaben';
import { MODULE } from './module';
import { parseNotenfolge } from './kompakt';
import { alleAufgaben, LEKTIONEN, lektionFuer } from './lektionen';
import { pruefe } from './pruefung';

/**
 * Musterlösungen: Beat-Aufgaben in Kurzform („bpm 90; kick: x... …“), Synth-Aufgaben als
 * Parameterliste („welle sine; cutoff 400 …“), sonst Leadsheet/Melodie oder Klaviersatz „Melodie || Begleitung“.
 */
const LOESUNGEN: Record<string, string> = {
  'Dein erstes Pattern': 'bpm 124; kick: x... x... x... x...; clap: .... x... .... x...; hihat: ..x. ..x. ..x. ..x.',
  'Eine Akkordfolge für die Piano Roll': 'E5:2[C] G5:2 | D5:2[G] B4:2 | C5:2[Am] E5:2 | C5:2[F] A4:2',
  'Ein Boom-Bap-Beat mit Swing': 'bpm 90; swing 30; kick: x... ...x ..x. ....; snare: .... x... ..-. x...; hihat: x.o. x.o. x.o. x.o.',
  'Ein Dembow-Groove': 'bpm 95; kick: x... x... x... x...; snare: ...x ..x. ...x ..x.; hihat: x.x. x.x. x.x. x.x.',
  'Eine Bassline unter dem Loop':
    'E5:2 G5:2 | C5:2 E5:2 | F5:2 A5:2 | D5:2 B4:2 | C5:1 || C3:8 C3 C2 C3 C3 C3 C2 C3 | A2:8 A2 A1 A2 A2 A2 A1 A2 | F2:8 F2 F1 F2 F2 F2 F1 F2 | G2:8 G2 G1 G2 G2 G2 G1 G2 | C2:1',
  'Eine Hook über vier Akkorde': 'A4:4[Am] C5 E5 C5 | F5:2[F] E5:4 C5 | G5:4[C] E5 C5:2 | B4:2[G] D5:2 | A4:4[Am] C5 E5 C5 | F5:2[F] A5:4 F5 | D5:2[G] B4:2 | A4:1[Am]',
  'Ein Sub-Bass': 'welle sine; filter lowpass; cutoff 400; attack 0.005; sustain 0.9; release 0.15',
  'Ein Pad': 'welle sawtooth; detune 18; cutoff 1200; attack 1.2; release 2.5; hall 0.6',
  'Ein Pluck': 'welle square; resonanz 4; attack 0.002; decay 0.25; sustain 0',
  'Ein Fill für den Übergang': 'bpm 124; kick: x... x... x... ....; clap: .... x... .... x...; snare: .... .... .... -oxx',
  'Ein Pre-Chorus, der zum Refrain drängt': 'E4:2 G4:2 | A4:2 C5:2 | D5:4 E5 F5 E5 | D5:8 E5 D5 C5 B4:2',
  'Ein Beat im Stereobild': 'bpm 124; kick: x... x... x... x...; clap: .... x... .... x...; hihat: o.o. o.o. o.o. o.o.; openhat: ..x. ..x. ..x. ..x.; pan: hihat -0.3, openhat 0.4; hall: clap 0.25',
  'Ein fertiger Loop zum Exportieren': 'bpm 122; kick: x... x... x... x...; clap: .... x... .... x...; hihat: x.o- x.o- x.o- x.o-; openhat: ..x. ..x. ..x. ..x.; perc: .o.o .o.o .o.o .o.o; pan: hihat -0.3, perc 0.4; hall: clap 0.2',
  'Der Beat für deinen Track': 'bpm 104; kick: x... ..x. x... x...; snare: .... x... .... x...; clap: .... x... .... x...; hihat: x-o- x-o- x-o- x-o-; perc: ..o. ..o. ..o. ..o.; pan: perc 0.5',
  'Harmonie und Hook': 'D5:4[Dm] F5 A5 F5 | Bb5:2[Bb] A5:4 F5 | C5:4[F] F5 A5:2 | G5:2[C] E5:2 | D5:4[Dm] F5 A5 F5 | Bb5:2[Bb] D5:2 | C5:2[C] E5:2 | D5:1[Dm]',
  'Ein Lead-Sound für die Hook': 'welle sawtooth; detune 12; cutoff 3500; attack 0.01; sustain 0.8',
};

const stufe8 = LEKTIONEN.filter((l) => l.modul.startsWith('s8-'));
const bausteine = stufe8.flatMap((l) => l.schritte.flatMap((s) => s.bausteine.map((b) => ({ l, b }))));

describe('Stufe 8: Musikproduktion', () => {
  it('hat zu jedem Modul eine Lektion mit Quiz und ein Abschlussprojekt', () => {
    for (const m of MODULE.filter((x) => x.stufe === 8)) {
      expect(lektionFuer(m.id), m.id).toBeDefined();
      expect(lektionFuer(m.id)!.quiz.length, m.id).toBeGreaterThanOrEqual(8);
    }
    expect(lektionFuer('s8-abschluss')).toBeDefined();
  });

  it('die Lektionen enthalten Beats, Synth-Klänge und klingende Beispiele', () => {
    expect(bausteine.filter(({ b }) => b.art === 'beat').length).toBeGreaterThanOrEqual(8);
    expect(bausteine.filter(({ b }) => b.art === 'synth').length).toBeGreaterThanOrEqual(5);
    for (const { l, b } of bausteine) {
      if (b.art !== 'noten') continue;
      if (b.harmonien) expect(pruefeKlaviersatz(b.score, { hinweise: false }).map((f) => `T${f.takt}: ${f.text}`), `${l.modul}: ${b.score.title}`).toEqual([]);
      if (b.score.voices.length === 1 && b.score.voices[0].measures.some((m) => m.notes.some((x) => x.akkord)))
        expect(pruefeLeadsheet(b.score).filter((f) => f.art === 'fehler').map((f) => `T${f.takt}: ${f.text}`), `${l.modul}: ${b.score.title}`).toEqual([]);
    }
  });

  const aufgaben = alleAufgaben().filter((a) => stufe8.some((l) => a.id.startsWith(l.modul)));
  it('jede Aufgabe hat eine Musterlösung', () => {
    expect(aufgaben.length).toBeGreaterThanOrEqual(14);
    for (const a of aufgaben) expect(LOESUNGEN[a.titel], a.titel).toBeDefined();
  });

  for (const a of aufgaben) {
    it(`Aufgabe „${a.titel}“ ist mit der Musterlösung lösbar`, () => {
      const offen = (ps: { ok: boolean; text: string; hinweis?: string }[]) => ps.filter((p) => !p.ok).map((p) => `${p.text}: ${p.hinweis}`);
      if (a.beat) {
        expect(offen(pruefeBeat(beatAusKurzform(LOESUNGEN[a.titel]), a.pruefung))).toEqual([]);
        expect(pruefeBeat(a.beat.vorgabe, a.pruefung).every((p) => p.ok)).toBe(false);
        return;
      }
      if (a.synth) {
        expect(offen(pruefeSynth(synthAusKurzform(LOESUNGEN[a.titel]), a.pruefung))).toEqual([]);
        expect(pruefeSynth(SYNTH_VORLAGEN[0], a.pruefung).every((p) => p.ok)).toBe(false);
        return;
      }
      const basis: EditorDoc = { ...emptyDoc(), title: a.titel, key: a.tonart ?? { fifths: 0, mode: 'major' }, time: a.takt ?? { beats: 4, beatType: 4 }, stil: a.stil };
      const teile = LOESUNGEN[a.titel].split('||').map(parseNotenfolge);
      const melodie = (evs: (typeof teile)[0]) => evs.map((e) => [e.pitch, e.duration]);
      let doc: EditorDoc;
      let nurVorgabe: EditorDoc;
      if (a.klavier) {
        const [mel, beg] = teile;
        expect(melodie(mel)).toEqual(melodie(a.klavier.melodie));
        doc = klavierDoc(basis, mel, beg);
        nurVorgabe = klavierDoc(basis, a.klavier.melodie, a.klavier.begleitung);
      } else {
        doc = { ...basis, events: teile[0] };
        if (a.leadsheet) expect(melodie(teile[0])).toEqual(melodie(a.leadsheet));
        nurVorgabe = { ...basis, events: a.leadsheet ?? [] };
      }
      const kontext = { leadsheet: a.leadsheet };
      expect(offen(pruefe(doc, a.pruefung, kontext))).toEqual([]);
      expect(pruefe(nurVorgabe, a.pruefung, kontext).every((p) => p.ok)).toBe(false);
    });
  }
});

describe('Beat-Baukasten', () => {
  it('liest und schreibt die Pattern-Kurzschrift', () => {
    const steps = parseSteps('x.o- ..x. x... ....');
    expect(steps.slice(0, 4)).toEqual([1, 0, 0.65, 0.35]);
    expect(stepsText(steps)).toBe('x.o- ..x. x... ....');
    expect(() => parseSteps('x...')).toThrow(/16/);
  });

  it('alle Genre-Vorlagen lassen sich laden und haben Kick und Hi-Hat oder Snare', () => {
    for (const v of VORLAGEN) {
      const b = vorlage(v.id);
      expect(b.kanaele.kick.steps.some((x) => x > 0), v.id).toBe(true);
    }
  });

  it('prüft Kriterien mit Hinweisen', () => {
    const house = vorlage('house');
    const r = pruefeBeat(house, ['spur kick 1 5 9 13', 'genau clap 5 13', 'leer kick 3', 'bpm 120 128', 'swing 10', 'dynamik hihat', 'spuren 4']);
    expect(r.map((p) => p.ok)).toEqual([true, true, true, true, false, false, true]);
    expect(pruefeBeat(house, ['spur snare 5'])[0].hinweis).toMatch(/Schritt 5/);
    expect(pruefeBeat(house, ['quatsch'])[0].text).toMatch(/Unbekannt/);
  });

  it('exportiert Beats als Schlagzeugspur auf Kanal 10 mit Swing', () => {
    const b = { ...beatAusKurzform('bpm 100; swing 60; hihat: xxxx .... .... ....'), name: 'Test' };
    const spur = beatZuMidi(b, 1);
    expect(spur.kanal).toBe(9);
    expect(spur.noten.map((n) => n.note)).toEqual([42, 42, 42, 42]);
    expect(spur.noten[1].start).toBeCloseTo(0.25 + 0.6 / 12);
    expect(spur.noten[2].start).toBeCloseTo(0.5);
  });
});

describe('Höraufgaben zur Produktion', () => {
  it('erzeugen Klänge und gültige Antworten auf allen Stufen', () => {
    for (const typ of ['wellenform-hoeren', 'eq-hoeren', 'groove-erkennen', 'tempo-schaetzen'] as const)
      for (const stufe of [1, 2, 3] as const)
        for (let i = 0; i < 20; i++) {
          const a = erzeugeAufgabe(typ, stufe);
          expect(a.produktion, typ).toBeDefined();
          expect(a.optionen, typ).toContain(a.loesung);
          expect(new Set(a.optionen).size, typ).toBe(a.optionen.length);
          if (a.produktion?.art === 'beat' && typ === 'tempo-schaetzen') {
            const bpm = a.produktion.beat.bpm;
            expect(a.erklaerung).toContain(`${bpm} BPM`);
          }
        }
  });
});
