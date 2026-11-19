import { describe, expect, it } from 'vitest';
import type { NoteEvent } from '../model/types';
import { validateScore } from '../model/validate';
import { pruefeSatz } from '../satz/regeln';
import { docFromScore } from './rebar';
import { rebarSatz } from './satzdoc';
import { editorReducer, emptyDoc, initialState } from './state';

const n = (step: NoteEvent['pitch'] extends infer P ? (P extends { step: infer S } ? S : never) : never, octave: number): NoteEvent => ({
  pitch: { step, octave },
  duration: { type: 'quarter' },
});

describe('Chorsatz im Editor', () => {
  it('wechselt Stimmen und schreibt in die aktive Stimme', () => {
    let s = initialState(emptyDoc());
    s = editorReducer(s, { type: 'setSatz', an: true });
    s = editorReducer(s, { type: 'insert', event: n('C', 5) });
    s = editorReducer(s, { type: 'setAktiv', stimme: 3 });
    expect(s.doc.clef).toBe('bass');
    s = editorReducer(s, { type: 'insert', event: n('C', 3) });
    s = editorReducer(s, { type: 'setAktiv', stimme: 0 });
    expect(s.doc.events).toHaveLength(1);
    expect(s.doc.satz!.stimmen.map((x) => x.length)).toEqual([1, 0, 0, 1]);
    // Rückgängig nimmt die letzte Note zurück, auch wenn inzwischen die Stimme gewechselt wurde
    s = editorReducer(s, { type: 'undo' });
    expect(s.doc.satz!.stimmen.map((x) => x.length)).toEqual([1, 0, 0, 0]);
  });

  it('verteilt Akkorde von oben nach unten', () => {
    let s = initialState(emptyDoc());
    s = editorReducer(s, { type: 'setSatz', an: true });
    s = editorReducer(s, { type: 'insertChord', pitches: [{ step: 'C', octave: 3 }, { step: 'G', octave: 4 }, { step: 'E', octave: 4 }, { step: 'C', octave: 5 }] });
    const top = s.doc.satz!.stimmen.map((x) => x[0].pitch);
    expect(top).toEqual([
      { step: 'C', octave: 5 },
      { step: 'G', octave: 4 },
      { step: 'E', octave: 4 },
      { step: 'C', octave: 3 },
    ]);
    expect(s.doc.events).toHaveLength(1);
  });

  it('baut einen gültigen Satz mit Text, gleicher Länge und Stimmenkennungen', () => {
    let s = initialState(emptyDoc());
    s = editorReducer(s, { type: 'setSatz', an: true });
    for (const p of ['C5', 'D5', 'E5', 'F5', 'G5']) s = editorReducer(s, { type: 'insert', event: n(p[0] as 'C', Number(p[1])) });
    s = editorReducer(s, { type: 'setText', text: 'Lo- be den Her- ren' });
    s = editorReducer(s, { type: 'setAktiv', stimme: 3 });
    s = editorReducer(s, { type: 'insert', event: n('C', 3) });
    const r = rebarSatz(s.doc);
    expect(validateScore(r.score).errors).toEqual([]);
    expect(r.score.voices.map((v) => v.measures.length)).toEqual([2, 2, 2, 2]);
    expect(r.score.voices[0].measures[0].notes[0].lyric).toBe('Lo-');
    expect([...r.sourceOf.keys()]).toEqual(['3-0-0']);
    expect(r.stimmeVon.get('0-1-0')).toEqual([0, 4]);
    expect(pruefeSatz(r.score).length).toBeGreaterThanOrEqual(0);
  });

  it('stumme Stimmen werden zu Pausen, Kennungen bleiben', () => {
    let s = initialState(emptyDoc());
    s = editorReducer(s, { type: 'setSatz', an: true });
    s = editorReducer(s, { type: 'insert', event: n('C', 5) });
    const r = rebarSatz(s.doc, [true, false, false, false]);
    expect(r.score.voices[0].measures[0].notes.every((x) => !x.pitch)).toBe(true);
  });

  it('öffnet einen vierstimmigen Satz aus JSON wieder als Chorsatz', async () => {
    const { CHORALSATZ } = await import('../data/saetze');
    const doc = docFromScore(CHORALSATZ);
    expect(doc.satz?.stimmen).toHaveLength(4);
    expect(doc.satz?.text?.startsWith('Hell')).toBe(true);
    expect(pruefeSatz(rebarSatz(doc).score)).toEqual([]);
  });

  it('schaltet zurück auf Melodie mit dem Sopran', () => {
    let s = initialState(emptyDoc());
    s = editorReducer(s, { type: 'setSatz', an: true });
    s = editorReducer(s, { type: 'insert', event: n('E', 5) });
    s = editorReducer(s, { type: 'setAktiv', stimme: 2 });
    s = editorReducer(s, { type: 'setSatz', an: false });
    expect(s.doc.satz).toBeUndefined();
    expect(s.doc.events[0].pitch).toEqual({ step: 'E', octave: 5 });
  });
});
