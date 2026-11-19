import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow/bravura';
import { diatonicIndex, toVexKey, toVexKeySpec } from '../model/pitch';
import type { Clef, KeySignature, Pitch } from '../model/types';

export interface NotesOptions {
  clef: Clef;
  key?: KeySignature;
  /** Jede Gruppe wird als ein Akkord gezeichnet; eine leere Liste zeigt nur das System */
  groups: Pitch[][];
  width?: number;
}

/**
 * Kleines Notensystem für Übungen: einzelne Töne, Intervalle oder Akkorde
 * als ganze Noten, ohne Taktart.
 */
export function renderNotes(container: HTMLElement, opts: NotesOptions) {
  container.innerHTML = '';
  const width = opts.width ?? Math.max(220, 120 + opts.groups.length * 70);
  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(width, 150);
  const ctx = renderer.getContext();
  ctx.scale(1.15, 1.15);
  const keySpec = opts.key ? toVexKeySpec(opts.key) : 'C';
  const stave = new Stave(6, 10, width / 1.15 - 12);
  stave.addClef(opts.clef);
  if (opts.key) stave.addKeySignature(keySpec);
  stave.setContext(ctx).draw();
  if (!opts.groups.length) return;

  const notes = opts.groups.map((g) => {
    const sorted = [...g].sort((a, b) => diatonicIndex(a) - diatonicIndex(b));
    return new StaveNote({ keys: sorted.map(toVexKey), duration: 'w', clef: opts.clef });
  });
  const voice = new Voice({ num_beats: 4 * notes.length, beat_value: 4 }).setStrict(false);
  voice.addTickables(notes);
  Accidental.applyAccidentals([voice], keySpec);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(ctx, stave);
}
