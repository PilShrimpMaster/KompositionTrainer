import {
  Accidental,
  Barline,
  Beam,
  Dot,
  Formatter,
  Fraction,
  Renderer,
  Stave,
  StaveNote,
  StaveTie,
  Voice as VexVoice,
} from 'vexflow/bravura';
import { toVexDuration } from '../model/duration';
import { germanName, toVexKey, toVexKeySpec } from '../model/pitch';
import type { Score } from '../model/types';
import { eventId } from '../model/ids';

export interface RenderOptions {
  width: number;
  showNoteNames: boolean;
}


const STAVE_HEIGHT = 110;
const SYSTEM_GAP = 30;
const MARGIN = 10;
/** Mindestbreite eines Takts in Pixeln; daraus ergibt sich die Anzahl Takte pro Zeile. */
const MIN_MEASURE_WIDTH = 230;

/**
 * Zeichnet eine Partitur als SVG in `container` und liefert die SVG-Gruppen
 * der Noten zurück, damit die Wiedergabe die gerade klingende Note markieren kann.
 */
export function renderScore(
  container: HTMLElement,
  score: Score,
  opts: RenderOptions,
): Map<string, SVGElement> {
  container.innerHTML = '';
  const elements = new Map<string, SVGElement>();

  const measureCount = Math.max(...score.voices.map((v) => v.measures.length));
  const usable = Math.max(opts.width - 2 * MARGIN, 300);
  const firstExtra = 90; // Platz für Schlüssel, Vorzeichen und Taktart
  const perRow = Math.max(1, Math.floor((usable - firstExtra) / MIN_MEASURE_WIDTH));
  const rows = Math.ceil(measureCount / perRow);
  const systemHeight = score.voices.length * STAVE_HEIGHT + SYSTEM_GAP;
  const height = rows * systemHeight + MARGIN * 2;

  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(opts.width, height);
  const ctx = renderer.getContext();
  const keySpec = toVexKeySpec(score.key);
  const timeSpec = `${score.time.beats}/${score.time.beatType}`;

  // Pro Stimme die zuletzt gezeichnete Note mit Bindebogen merken
  const pendingTie: (StaveNote | null)[] = score.voices.map(() => null);

  for (let row = 0; row < rows; row++) {
    const start = row * perRow;
    const end = Math.min(start + perRow, measureCount);
    const inRow = end - start;
    const isLastRow = row === rows - 1;
    // In der letzten Zeile Takte nicht über die ganze Breite ziehen, wenn es wenige sind
    const rowWidth = isLastRow && inRow < perRow ? firstExtra + inRow * Math.min(usable / perRow, 320) : usable;
    const measureWidth = (rowWidth - firstExtra) / inRow;

    score.voices.forEach((voice, vi) => {
      const y = MARGIN + row * systemHeight + vi * STAVE_HEIGHT;
      let x = MARGIN;

      for (let mi = start; mi < end; mi++) {
        const first = mi === start;
        const width = measureWidth + (first ? firstExtra : 0);
        const stave = new Stave(x, y, width);
        if (first) {
          stave.addClef(voice.clef).addKeySignature(keySpec);
          if (row === 0) stave.addTimeSignature(timeSpec);
        }
        if (mi === measureCount - 1) stave.setEndBarType(Barline.type.END);
        stave.setContext(ctx).draw();
        x += width;

        const measure = voice.measures[mi];
        if (!measure) continue;

        const notes = measure.notes.map((ev) => {
          const rest = !ev.pitch;
          const note = new StaveNote({
            keys: [rest ? (voice.clef === 'bass' ? 'd/3' : 'b/4') : toVexKey(ev.pitch!)],
            duration: toVexDuration(ev.duration, rest),
            clef: voice.clef,
            auto_stem: true,
          });
          if (ev.duration.dots) Dot.buildAndAttach([note], { all: true });
          return note;
        });

        const vexVoice = new VexVoice({ num_beats: score.time.beats, beat_value: score.time.beatType });
        vexVoice.setStrict(false); // erlaubt Auftakte
        vexVoice.addTickables(notes);
        Accidental.applyAccidentals([vexVoice], keySpec);
        const beams = Beam.generateBeams(notes.filter((n) => !n.isRest()), {
          groups: beamGroups(score.time.beats, score.time.beatType),
        });
        new Formatter().joinVoices([vexVoice]).formatToStave([vexVoice], stave);
        vexVoice.draw(ctx, stave);
        beams.forEach((b) => b.setContext(ctx).draw());

        // Deutsche Notennamen auf einer gemeinsamen Linie unter dem System
        if (opts.showNoteNames) {
          const nameY = Math.max(stave.getYForLine(4) + 34, ...notes.map((n) => Math.max(...n.getYs()) + 22));
          ctx.save();
          ctx.setFont('Helvetica, Arial, sans-serif', 12);
          ctx.setFillStyle('#4a4560');
          measure.notes.forEach((ev, ni) => {
            if (!ev.pitch) return;
            const note = notes[ni];
            const text = germanName(ev.pitch);
            const center = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
            const w = ctx.measureText(text).width;
            ctx.fillText(text, center - w / 2, nameY);
          });
          ctx.restore();
        }

        measure.notes.forEach((ev, ni) => {
          const note = notes[ni];
          // Bindebogen von der vorherigen Note schließen
          const prev = pendingTie[vi];
          if (prev && ev.pitch) {
            const sameRow = mi !== start || ni !== 0;
            if (sameRow) {
              new StaveTie({ first_note: prev, last_note: note, first_indices: [0], last_indices: [0] })
                .setContext(ctx)
                .draw();
            } else {
              new StaveTie({ first_note: prev, last_note: null, first_indices: [0], last_indices: [0] })
                .setContext(ctx)
                .draw();
              new StaveTie({ first_note: null, last_note: note, first_indices: [0], last_indices: [0] })
                .setContext(ctx)
                .draw();
            }
          }
          pendingTie[vi] = ev.tie && ev.pitch ? note : null;

          const el = note.getSVGElement();
          if (el) elements.set(eventId(vi, mi, ni), el);
        });
      }
    });
  }

  const svg = container.querySelector('svg');
  if (svg) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Noten: ${score.title}`);
  }
  return elements;
}

/** Balkengruppen: im 6/8-, 9/8- und 12/8-Takt je punktierte Viertel, sonst je Viertel */
function beamGroups(beats: number, beatType: number): Fraction[] {
  if (beatType === 8 && beats % 3 === 0) return [new Fraction(3, 8)];
  return [new Fraction(1, 4)];
}
