import { describe, expect, it } from 'vitest';
import { anzeigeTransposition, erkenneInstrument, INSTRUMENTE, instrument, klingend, lagePruefen, musicXmlTransposition, notiert, notierteTonart, stimmNamen, transponiereScore, umfangText } from './instrumente';
import { KLANG_SAMPLES } from '../audio/klangSamples';
import { buildSchedule } from '../audio/schedule';
import { germanNameWithOctave } from './pitch';
import type { Pitch } from './types';

const p = (step: Pitch['step'], octave: number, alter?: number): Pitch => (alter ? { step, octave, alter } : { step, octave });

describe('Transponierende Instrumente', () => {
  it('notiert das Altsaxophon eine große Sexte höher', () => {
    const alt = instrument('altsax')!;
    expect(notiert(p('C', 4), alt)).toEqual(p('A', 4));
    expect(notiert(p('E', 4, -1), alt)).toEqual(p('C', 5));
    expect(klingend(p('F', 5, 1), alt)).toEqual(p('A', 4));
    expect(notierteTonart({ fifths: 0, mode: 'major' }, alt).fifths).toBe(3);
    expect(notierteTonart({ fifths: -1, mode: 'major' }, alt).fifths).toBe(2);
  });

  it('kennt Klarinette und Trompete in B, Horn in F und Tenorsaxophon', () => {
    expect(notiert(p('B', 3, -1), instrument('klarinette')!)).toEqual(p('C', 4));
    expect(notierteTonart({ fifths: -2, mode: 'major' }, instrument('trompete')!).fifths).toBe(0);
    expect(notiert(p('C', 4), instrument('horn')!)).toEqual(p('G', 4));
    expect(notierteTonart({ fifths: -1, mode: 'major' }, instrument('horn')!).fifths).toBe(0);
    expect(notiert(p('B', 2, -1), instrument('tenorsax')!)).toEqual(p('C', 4));
    expect(notierteTonart({ fifths: 6, mode: 'major' }, instrument('altsax')!).fifths).toBe(-3);
  });

  it('prüft Umfang und Lage', () => {
    const alt = instrument('altsax')!;
    const r = lagePruefen([p('C', 3), p('G', 4), p('A', 4)], alt);
    expect(r.ausserhalb.map(germanNameWithOctave)).toEqual(['c']);
    expect(r.anteilLage).toBeCloseTo(2 / 3);
    expect(umfangText(alt)).toBe('des bis a″');
  });
});

describe('Partitur mit Instrumenten', () => {
  const score = {
    format: 'kt-score' as const,
    version: 1 as const,
    title: 'T',
    tempo: 80,
    time: { beats: 4, beatType: 4 },
    key: { fifths: 0, mode: 'major' as const },
    voices: [
      { id: 'a', name: 'Altsaxophon', clef: 'treble' as const, instrument: 'altsax', measures: [{ notes: [{ pitch: p('C', 4), duration: { type: 'whole' as const } }] }] },
      { id: 'b', name: 'Kontrabass', clef: 'bass' as const, instrument: 'kontrabass', measures: [{ notes: [{ pitch: p('C', 2), duration: { type: 'whole' as const } }] }] },
    ],
  };

  it('zeigt transponiert mit eigenen Vorzeichen, klingend nur den Kontrabass oktaviert', () => {
    const t = transponiereScore(score);
    expect(t.voices[0].key?.fifths).toBe(3);
    expect(t.voices[0].measures[0].notes[0].pitch).toEqual(p('A', 4));
    expect(t.voices[1].measures[0].notes[0].pitch).toEqual(p('C', 3));
    const k = transponiereScore(score, false);
    expect(k.voices[0]).toBe(score.voices[0]);
    expect(k.voices[1].measures[0].notes[0].pitch).toEqual(p('C', 3));
    expect(anzeigeTransposition('violine', true)).toBeNull();
  });

  it('erkennt Instrumente an Klangkennung und Namen und nummeriert gleiche Stimmen', () => {
    expect(erkenneInstrument('strings.viola', undefined)).toBe('viola');
    expect(erkenneInstrument(undefined, 'Violoncello')).toBe('violoncello');
    expect(erkenneInstrument(undefined, 'Violin II')).toBe('violine');
    expect(erkenneInstrument(undefined, 'Horn in F')).toBe('horn');
    expect(stimmNamen(['violine', 'violine', 'viola']).map((n) => n.name)).toEqual(['Violine 1', 'Violine 2', 'Viola']);
    expect(musicXmlTransposition(instrument('tenorsax')!)).toEqual({ diatonic: -1, chromatic: -2, octave: -1 });
  });

  it('jedes Instrument hat Samples für seinen Klang', () => {
    for (const i of INSTRUMENTE) expect(KLANG_SAMPLES[i.klang], i.id).toBeDefined();
  });
});

describe('Wiedergabe mit Instrumentenklängen', () => {
  it('jede Note bekommt den Klang ihrer Stimme', () => {
    const s = {
      format: 'kt-score' as const, version: 1 as const, title: 'T', tempo: 80, time: { beats: 4, beatType: 4 }, key: { fifths: 0, mode: 'major' as const },
      voices: [
        { id: 'a', name: 'Viola', clef: 'alto' as const, instrument: 'viola', measures: [{ notes: [{ pitch: p('C', 4), duration: { type: 'whole' as const } }] }] },
        { id: 'b', name: 'Klavier', clef: 'bass' as const, measures: [{ notes: [{ pitch: p('C', 3), duration: { type: 'whole' as const } }] }] },
      ],
    };
    expect(buildSchedule(s).events.map((e) => e.klang)).toEqual(['viola', undefined]);
  });
});
