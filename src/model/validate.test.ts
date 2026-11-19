import { describe, expect, it } from 'vitest';
import { BEISPIELE } from '../data/melodien';
import { buildSchedule } from '../audio/schedule';
import { quarterLength } from './duration';
import { validateScore } from './validate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const minimal = (): any => ({
  format: 'kt-score',
  version: 1,
  title: 'Test',
  tempo: 100,
  time: { beats: 4, beatType: 4 },
  key: { fifths: 0, mode: 'major' },
  voices: [
    {
      id: 'v1',
      name: 'Melodie',
      clef: 'treble',
      measures: [
        { notes: [{ pitch: { step: 'C', octave: 4 }, duration: { type: 'whole' } }] },
        {
          notes: [
            { pitch: { step: 'D', octave: 4 }, duration: { type: 'half', dots: 1 } },
            { duration: { type: 'quarter' } },
          ],
        },
      ],
    },
  ],
});

describe('Notenmodell', () => {
  it('rechnet Punktierungen richtig', () => {
    expect(quarterLength({ type: 'half', dots: 1 })).toBe(3);
    expect(quarterLength({ type: 'quarter', dots: 2 })).toBe(1.75);
    expect(quarterLength({ type: '16th' })).toBe(0.25);
  });

  it('akzeptiert alle mitgelieferten Beispiele', () => {
    for (const b of BEISPIELE) expect(validateScore(b.score).errors, b.id).toEqual([]);
  });

  it('akzeptiert ein gültiges Minimalbeispiel', () => {
    expect(validateScore(minimal()).errors).toEqual([]);
  });

  it('meldet überfüllte Takte auf Deutsch', () => {
    const s = minimal();
    s.voices[0].measures[1].notes.push({ duration: { type: 'quarter' } });
    expect(validateScore(s).errors).toEqual(['Stimme 1, Takt 2: enthält 5 statt 4 Viertel.']);
  });

  it('erlaubt einen Auftakt im ersten Takt', () => {
    const s = minimal();
    s.voices[0].measures[0].notes = [{ pitch: { step: 'G', octave: 3 }, duration: { type: 'quarter' } }];
    expect(validateScore(s).errors).toEqual([]);
  });

  it('meldet ungültige Tonhöhen', () => {
    const s = minimal();
    (s.voices[0].measures[0].notes[0].pitch as { step: string }).step = 'H';
    expect(validateScore(s).errors[0]).toContain('ungültige Tonhöhe');
  });
});

describe('Wiedergabeplan', () => {
  it('ordnet Noten und Pausen zeitlich an', () => {
    const { score } = validateScore(minimal());
    const { events, total } = buildSchedule(score!);
    expect(events.map((e) => [e.id, e.start, e.length, e.note])).toEqual([
      ['0-0-0', 0, 4, 'C4'],
      ['0-1-0', 4, 3, 'D4'],
      ['0-1-1', 7, 1, undefined],
    ]);
    expect(total).toBe(8);
  });

  it('fasst Haltebögen zu einem Ton zusammen', () => {
    const s = minimal();
    s.voices[0].measures[0].notes = [
      { pitch: { step: 'E', octave: 4 }, duration: { type: 'half' } },
      { pitch: { step: 'G', octave: 4 }, duration: { type: 'half' }, tie: true } as never,
    ];
    s.voices[0].measures[1].notes[0] = { pitch: { step: 'G', octave: 4 }, duration: { type: 'half', dots: 1 } };
    const { events } = buildSchedule(validateScore(s).score!);
    expect(events[1]).toMatchObject({ note: 'G4', start: 2, length: 5 });
    expect(events[2]).toMatchObject({ start: 4, length: 0 });
  });
});
