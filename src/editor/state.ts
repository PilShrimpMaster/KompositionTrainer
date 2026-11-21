import { moveDiatonic } from '../model/pitch';
import type { DurationType, NoteEvent, Pitch } from '../model/types';
import type { EditorDoc } from './rebar';
import { aktiviere, akkordAnfuegen, alsSatz, synchron } from './satzdoc';

export interface EditorState {
  doc: EditorDoc;
  /** Ausgewählte Note (Index in doc.events) oder null = Eingabe am Ende */
  selected: number | null;
  /** Notenwert für die nächste Eingabe */
  inputDuration: DurationType;
  inputDots: number;
  past: EditorDoc[];
  future: EditorDoc[];
}

export type EditorAction =
  | { type: 'insert'; event: NoteEvent; at?: number }
  | { type: 'setPitch'; index: number; pitch: Pitch }
  | { type: 'select'; index: number | null }
  | { type: 'moveSelection'; delta: number }
  | { type: 'setDuration'; duration: DurationType }
  | { type: 'toggleDot' }
  | { type: 'toggleTie' }
  | { type: 'alter'; delta: number }
  | { type: 'natural' }
  | { type: 'transpose'; steps: number }
  | { type: 'toRest' }
  | { type: 'delete' }
  | { type: 'clear' }
  | { type: 'setMeta'; meta: Partial<Omit<EditorDoc, 'events'>> }
  | { type: 'load'; doc: EditorDoc }
  | { type: 'undo' }
  | { type: 'redo' }
  /** Vierstimmiger Satz: bearbeitete Stimme wechseln */
  | { type: 'setAktiv'; stimme: number }
  /** Vierstimmiger Satz: Akkord auf die Stimmen verteilen (z. B. vom MIDI-Keyboard) */
  | { type: 'insertChord'; pitches: Pitch[] }
  /** Zwischen Melodie und vierstimmigem Satz umschalten */
  | { type: 'setSatz'; an: boolean }
  | { type: 'setText'; text: string }
  /** Akkordsymbol über einer Note setzen oder (leer) entfernen */
  | { type: 'setAkkord'; index: number; akkord: string };

const HISTORY_LIMIT = 200;

export const emptyDoc = (): EditorDoc => ({
  title: 'Meine Melodie',
  tempo: 90,
  time: { beats: 4, beatType: 4 },
  key: { fifths: 0, mode: 'major' },
  clef: 'treble',
  events: [],
});

export function initialState(doc: EditorDoc = emptyDoc()): EditorState {
  return { doc, selected: null, inputDuration: 'quarter', inputDots: 0, past: [], future: [] };
}

/** Neues Dokument übernehmen und den alten Stand für „Rückgängig“ merken */
function commit(state: EditorState, doc: EditorDoc, selected: number | null = state.selected): EditorState {
  return {
    ...state,
    doc,
    selected,
    past: [...state.past.slice(-HISTORY_LIMIT + 1), state.doc],
    future: [],
  };
}

function updateEvent(state: EditorState, index: number, fn: (ev: NoteEvent) => NoteEvent | null): EditorState {
  const ev = state.doc.events[index];
  if (!ev) return state;
  const next = fn(ev);
  if (!next) return state;
  const events = state.doc.events.slice();
  events[index] = next;
  return commit(state, { ...state.doc, events });
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'setAktiv':
      if (!state.doc.satz || state.doc.satz.aktiv === action.stimme) return state;
      return { ...state, doc: aktiviere(state.doc, action.stimme), selected: null };
    case 'insertChord': {
      if (!state.doc.satz) return state;
      const dur = state.inputDots ? { type: state.inputDuration, dots: state.inputDots } : { type: state.inputDuration };
      return commit(state, akkordAnfuegen(state.doc, action.pitches, dur), null);
    }
    case 'setSatz':
      if (!!state.doc.satz === action.an) return state;
      return commit(state, alsSatz(state.doc, action.an), null);
    case 'setText':
      if (!state.doc.satz) return state;
      return commit(state, { ...state.doc, satz: { ...synchron(state.doc).satz!, text: action.text } });
  }
  const next = einstimmig(state, action);
  return next.doc !== state.doc && next.doc.satz ? { ...next, doc: synchron(next.doc) } : next;
}

function einstimmig(state: EditorState, action: EditorAction): EditorState {
  const { doc, selected } = state;
  switch (action.type) {
    case 'insert': {
      const at = action.at ?? (selected === null ? doc.events.length : selected + 1);
      const events = doc.events.slice();
      events.splice(at, 0, action.event);
      return commit(state, { ...doc, events }, at);
    }
    case 'setPitch':
      return updateEvent(state, action.index, (ev) =>
        ev.pitch && samePitch(ev.pitch, action.pitch) ? null : { ...ev, pitch: action.pitch },
      );
    case 'select': {
      const idx = action.index;
      return { ...state, selected: idx !== null && idx >= 0 && idx < doc.events.length ? idx : null };
    }
    case 'moveSelection': {
      if (doc.events.length === 0) return state;
      const cur = selected ?? doc.events.length; // „am Ende“ steht hinter der letzten Note
      const next = cur + action.delta;
      if (next >= doc.events.length) return { ...state, selected: null };
      return { ...state, selected: Math.max(0, next) };
    }
    case 'setDuration': {
      const s = { ...state, inputDuration: action.duration };
      if (selected === null) return s;
      return updateEvent(s, selected, (ev) =>
        ev.duration.type === action.duration ? null : { ...ev, duration: { type: action.duration, dots: ev.duration.dots } },
      );
    }
    case 'toggleDot': {
      if (selected === null) return { ...state, inputDots: state.inputDots ? 0 : 1 };
      return updateEvent(state, selected, (ev) => ({
        ...ev,
        duration: ev.duration.dots ? { type: ev.duration.type } : { type: ev.duration.type, dots: 1 },
      }));
    }
    case 'toggleTie':
      if (selected === null) return state;
      return updateEvent(state, selected, (ev) => {
        if (!ev.pitch) return null;
        const { tie, ...rest } = ev;
        return tie ? rest : { ...rest, tie: true };
      });
    case 'alter':
      if (selected === null) return state;
      return updateEvent(state, selected, (ev) => {
        if (!ev.pitch) return null;
        const alter = Math.max(-2, Math.min(2, (ev.pitch.alter ?? 0) + action.delta));
        return { ...ev, pitch: withAlter(ev.pitch, alter) };
      });
    case 'natural':
      if (selected === null) return state;
      return updateEvent(state, selected, (ev) => (ev.pitch?.alter ? { ...ev, pitch: withAlter(ev.pitch, 0) } : null));
    case 'transpose':
      if (selected === null) return state;
      return updateEvent(state, selected, (ev) =>
        ev.pitch ? { ...ev, pitch: moveDiatonic(ev.pitch, action.steps, doc.key.fifths) } : null,
      );
    case 'setAkkord':
      return updateEvent(state, action.index, (ev) => {
        const akkord = action.akkord.trim();
        if ((ev.akkord ?? '') === akkord) return null;
        const { akkord: _alt, ...rest } = ev;
        return akkord ? { ...rest, akkord } : rest;
      });
    case 'toRest':
      if (selected === null) return state;
      return updateEvent(state, selected, (ev) => (ev.pitch ? { duration: ev.duration } : null));
    case 'delete': {
      const idx = selected ?? doc.events.length - 1;
      if (idx < 0 || idx >= doc.events.length) return state;
      const events = doc.events.slice();
      events.splice(idx, 1);
      const nextSel = selected === null ? null : idx > 0 ? idx - 1 : events.length ? 0 : null;
      return commit(state, { ...doc, events }, nextSel);
    }
    case 'clear':
      if (doc.events.length === 0) return state;
      return commit(state, { ...doc, events: [] }, null);
    case 'setMeta':
      return commit(state, { ...doc, ...action.meta });
    case 'load':
      return commit(state, action.doc, null);
    case 'undo': {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        ...state,
        doc: prev,
        selected: clampSel(selected, prev.events.length),
        past: state.past.slice(0, -1),
        future: [doc, ...state.future],
      };
    }
    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        doc: next,
        selected: clampSel(selected, next.events.length),
        past: [...state.past, doc],
        future: state.future.slice(1),
      };
    }
    default:
      return state;
  }
}

function withAlter(p: Pitch, alter: number): Pitch {
  const { alter: _old, ...rest } = p;
  void _old;
  return alter ? { ...rest, alter } : rest;
}

function samePitch(a: Pitch, b: Pitch) {
  return a.step === b.step && a.octave === b.octave && (a.alter ?? 0) === (b.alter ?? 0);
}

function clampSel(sel: number | null, len: number) {
  return sel === null || sel >= len ? null : sel;
}
