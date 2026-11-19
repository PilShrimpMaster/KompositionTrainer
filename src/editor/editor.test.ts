import { describe, expect, it } from 'vitest';
import { germanName, pitchAtY, spellMidi, nearestOctave } from '../model/pitch';
import type { NoteEvent } from '../model/types';
import { validateScore } from '../model/validate';
import { decompose, rebar } from './rebar';
import { shortcutFor } from './shortcuts';
import { editorReducer, emptyDoc, initialState } from './state';

const q = (step: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B', octave = 4, type: NoteEvent['duration']['type'] = 'quarter'): NoteEvent => ({
  pitch: { step, octave },
  duration: { type },
});

describe('Taktaufteilung', () => {
  it('verteilt Noten auf Takte', () => {
    const doc = { ...emptyDoc(), events: [q('C'), q('D'), q('E'), q('F'), q('G', 4, 'half')] };
    const { score, missing } = rebar(doc);
    expect(score.voices[0].measures.map((m) => m.notes.length)).toEqual([4, 2]);
    expect(score.voices[0].measures[1].notes[1]).toEqual({ duration: { type: "half" } });
    expect(missing).toBe(2);
    expect(validateScore(score).errors).toEqual([]);
  });

  it('bindet Noten über den Taktstrich', () => {
    const doc = { ...emptyDoc(), events: [q('C', 4, 'half'), q('D', 4, 'quarter'), q('E', 4, 'half')] };
    const { score, partsOf } = rebar(doc);
    const [m1, m2] = score.voices[0].measures;
    expect(m1.notes[2]).toMatchObject({ pitch: { step: 'E' }, duration: { type: 'quarter' }, tie: true });
    expect(m2.notes[0]).toMatchObject({ pitch: { step: 'E' }, duration: { type: 'quarter' } });
    expect(m2.notes[0].tie).toBeUndefined();
    expect(partsOf.get(2)).toEqual(['0-0-2', '0-1-0']);
  });

  it('zerlegt Längen in darstellbare Notenwerte', () => {
    expect(decompose(2.5)).toEqual([{ type: 'half' }, { type: 'eighth' }]);
    expect(decompose(3)).toEqual([{ type: 'half', dots: 1 }]);
  });

  it('teilt Pausen ohne Haltebogen', () => {
    const doc = { ...emptyDoc(), time: { beats: 3, beatType: 4 }, events: [q('C', 4, 'half'), { duration: { type: 'half' as const } }] };
    const { score } = rebar(doc);
    expect(score.voices[0].measures[1].notes[0]).toEqual({ duration: { type: 'quarter' } });
  });
});

describe('Editor-Zustand', () => {
  it('fügt hinter der Auswahl ein und kann rückgängig machen', () => {
    let s = initialState();
    s = editorReducer(s, { type: 'insert', event: q('C') });
    s = editorReducer(s, { type: 'insert', event: q('E') });
    s = editorReducer(s, { type: 'select', index: 0 });
    s = editorReducer(s, { type: 'insert', event: q('D') });
    expect(s.doc.events.map((e) => e.pitch?.step)).toEqual(['C', 'D', 'E']);
    expect(s.selected).toBe(1);
    s = editorReducer(s, { type: 'undo' });
    expect(s.doc.events.map((e) => e.pitch?.step)).toEqual(['C', 'E']);
    s = editorReducer(s, { type: 'redo' });
    expect(s.doc.events).toHaveLength(3);
  });

  it('ändert Notenwert, Vorzeichen und Tonhöhe der ausgewählten Note', () => {
    let s = initialState({ ...emptyDoc(), key: { fifths: 2, mode: 'major' }, events: [q('E')] });
    s = editorReducer(s, { type: 'select', index: 0 });
    s = editorReducer(s, { type: 'setDuration', duration: 'half' });
    s = editorReducer(s, { type: 'toggleDot' });
    s = editorReducer(s, { type: 'transpose', steps: 1 });
    expect(s.doc.events[0]).toEqual({ pitch: { step: 'F', alter: 1, octave: 4 }, duration: { type: 'half', dots: 1 } });
    s = editorReducer(s, { type: 'natural' });
    expect(germanName(s.doc.events[0].pitch!)).toBe('F');
    s = editorReducer(s, { type: 'alter', delta: -1 });
    expect(germanName(s.doc.events[0].pitch!)).toBe('Fes');
  });

  it('löscht die ausgewählte oder letzte Note', () => {
    let s = initialState({ ...emptyDoc(), events: [q('C'), q('D'), q('E')] });
    s = editorReducer(s, { type: 'delete' });
    expect(s.doc.events).toHaveLength(2);
    s = editorReducer(s, { type: 'select', index: 0 });
    s = editorReducer(s, { type: 'delete' });
    expect(s.doc.events.map((e) => e.pitch?.step)).toEqual(['D']);
  });
});

describe('Eingabe', () => {
  const staff = { topLineY: 100, spacing: 10, clef: 'treble' as const };
  it('liest die Tonhöhe aus der Position im Notensystem', () => {
    expect(pitchAtY(100, staff, 0)).toEqual({ step: 'F', octave: 5 });
    expect(pitchAtY(140, staff, 0)).toEqual({ step: 'E', octave: 4 });
    expect(pitchAtY(150, staff, 0)).toEqual({ step: 'C', octave: 4 });
    expect(pitchAtY(100, staff, 1)).toEqual({ step: 'F', alter: 1, octave: 5 });
    expect(pitchAtY(140, { ...staff, clef: 'bass' }, 0)).toEqual({ step: 'G', octave: 2 });
  });

  it('schreibt Klaviertasten passend zur Tonart', () => {
    expect(germanName(spellMidi(66, 2))).toBe('Fis');
    expect(germanName(spellMidi(70, -1))).toBe('B');
    expect(germanName(spellMidi(61, 0))).toBe('Cis');
    expect(germanName(spellMidi(63, -3))).toBe('Es');
    expect(spellMidi(59, -7)).toEqual({ step: 'C', alter: -1, octave: 4 });
    expect(spellMidi(60, 7)).toEqual({ step: 'B', alter: 1, octave: 3 });
  });

  it('wählt die nächstgelegene Oktave', () => {
    expect(nearestOctave('B', 0, { step: 'C', octave: 5 }, 4)).toEqual({ step: 'B', octave: 4 });
    expect(nearestOctave('D', 0, { step: 'B', octave: 4 }, 4)).toEqual({ step: 'D', octave: 5 });
  });

  it('übersetzt Tastenkürzel mit deutschen Notennamen', () => {
    const ctx = { refPitch: null, fifths: 0, clef: 'treble' as const, inputDuration: 'quarter' as const, inputDots: 0 };
    expect(shortcutFor({ key: 'h' }, ctx)).toEqual({
      type: 'insert',
      event: { pitch: { step: 'B', octave: 4 }, duration: { type: 'quarter' } },
    });
    expect(shortcutFor({ key: 'b' }, ctx)).toMatchObject({ event: { pitch: { step: 'B', alter: -1 } } });
    expect(shortcutFor({ key: 'f' }, { ...ctx, fifths: 1 })).toMatchObject({ event: { pitch: { step: 'F', alter: 1 } } });
    expect(shortcutFor({ key: '5' }, ctx)).toEqual({ type: 'setDuration', duration: 'half' });
    expect(shortcutFor({ key: 'z', ctrlKey: true }, ctx)).toEqual({ type: 'undo' });
    expect(shortcutFor({ key: 'x' }, ctx)).toBeNull();
  });
});
