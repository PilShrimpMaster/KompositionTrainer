import {
  Accidental,
  Articulation,
  Modifier,
  StaveConnector,
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
import type { Clef, Score } from '../model/types';
import { eventId } from '../model/ids';
import { instrument } from '../model/instrumente';

export interface RenderOptions {
  width: number;
  showNoteNames: boolean;
}

/** Lage eines gezeichneten Takts, für die Eingabe per Stift oder Finger */
export interface StaveLayout {
  /** erste Stimme auf diesem System */
  voice: number;
  /** alle Stimmen auf diesem System */
  voices: number[];
  /** Nummer des Systems von oben */
  staff: number;
  measure: number;
  x: number;
  width: number;
  /** y der obersten Notenlinie */
  topLineY: number;
  /** Abstand zweier Notenlinien */
  spacing: number;
  /** x, ab dem Noten beginnen (nach Schlüssel und Vorzeichen) */
  noteStartX: number;
  clef: Clef;
}

export interface NoteLayout {
  id: string;
  voice: number;
  measure: number;
  index: number;
  /** Mitte des Notenkopfs */
  x: number;
  y: number;
}

export interface RenderResult {
  elements: Map<string, SVGElement>;
  staves: StaveLayout[];
  notes: NoteLayout[];
  height: number;
}

const STAVE_HEIGHT = 110;
const LYRIC_SPACE = 56;
const SYSTEM_GAP = 30;
const MARGIN = 10;
/** Mindestbreite eines Takts in Pixeln; daraus ergibt sich die Anzahl Takte pro Zeile. */
const MIN_MEASURE_WIDTH = 230;

/** Welche Stimmen auf welchem Notensystem stehen */
export function staffGroups(score: Score): number[][] {
  const groups: number[][] = [];
  score.voices.forEach((v, vi) => {
    const s = v.staff ?? vi;
    (groups[s] ??= []).push(vi);
  });
  return groups.filter((g) => g && g.length);
}

/**
 * Zeichnet eine Partitur als SVG in `container` und liefert die SVG-Gruppen
 * der Noten zurück, damit die Wiedergabe die gerade klingende Note markieren kann.
 * Stimmen mit derselben `staff`-Nummer teilen sich ein System (z. B. Sopran und Alt).
 */
export function renderScore(
  container: HTMLElement,
  score: Score,
  opts: RenderOptions,
): RenderResult {
  container.innerHTML = '';
  const elements = new Map<string, SVGElement>();
  const staves: StaveLayout[] = [];
  const noteLayouts: NoteLayout[] = [];

  const groups = staffGroups(score);
  const hasLyrics = groups.map((g) => g.some((vi) => score.voices[vi].measures.some((m) => m.notes.some((n) => n.lyric))));
  const staffY = groups.map((_, si) => groups.slice(0, si).reduce((sum, _g, i) => sum + STAVE_HEIGHT + (hasLyrics[i] ? LYRIC_SPACE : 0), 0));
  const systemHeight = groups.reduce((sum, _g, i) => sum + STAVE_HEIGHT + (hasLyrics[i] ? LYRIC_SPACE : 0), 0) + SYSTEM_GAP;

  const measureCount = Math.max(1, ...score.voices.map((v) => v.measures.length));
  // Partitur mit Instrumenten: Abkürzungen links neben den Systemen, eckige Klammer statt Klavierklammer
  const partitur = score.voices.some((v) => instrument(v.instrument));
  const label = partitur ? 58 : 0;
  const usable = Math.max(opts.width - 2 * MARGIN - label, 300);
  const firstExtra = 90; // Platz für Schlüssel, Vorzeichen und Taktart
  const perRow = Math.max(1, Math.floor((usable - firstExtra) / MIN_MEASURE_WIDTH));
  const rows = Math.ceil(measureCount / perRow);
  const height = rows * systemHeight + MARGIN * 2;

  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(opts.width, height);
  const ctx = renderer.getContext();
  // Vorzeichen je System: transponierende Stimmen haben eigene
  const keySpecs = groups.map((g) => toVexKeySpec(score.voices[g[0]].key ?? score.key));
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
    let x = MARGIN + label;
    if (partitur) {
      ctx.save();
      ctx.setFont('Helvetica, Arial, sans-serif', 12);
      ctx.setFillStyle('#4a4560');
      groups.forEach((g, si) => {
        const v = score.voices[g[0]];
        const text = v.kurz ?? instrument(v.instrument)?.kurz ?? v.name;
        const w = ctx.measureText(text).width;
        ctx.fillText(text, MARGIN + label - 6 - w, MARGIN + row * systemHeight + staffY[si] + 40 + 24);
      });
      ctx.restore();
    }

    for (let mi = start; mi < end; mi++) {
      const first = mi === start;
      const width = measureWidth + (first ? firstExtra : 0);

      // Ein Stave je System, alle mit gleichem Notenbeginn, damit die Schläge übereinander stehen
      const measureStaves = groups.map((g, si) => {
        const clef = score.voices[g[0]].clef;
        const stave = new Stave(x, MARGIN + row * systemHeight + staffY[si], width);
        if (first) {
          stave.addClef(clef).addKeySignature(keySpecs[si]);
          if (row === 0) stave.addTimeSignature(timeSpec);
        }
        if (mi === measureCount - 1) stave.setEndBarType(Barline.type.END);
        return stave;
      });
      const noteStart = Math.max(...measureStaves.map((st) => st.getNoteStartX()));
      measureStaves.forEach((st) => st.setNoteStartX(noteStart));
      measureStaves.forEach((st) => st.setContext(ctx).draw());

      if (groups.length > 1) {
        const top = measureStaves[0];
        const bottom = measureStaves[measureStaves.length - 1];
        if (first) {
          new StaveConnector(top, bottom).setType(partitur ? StaveConnector.type.BRACKET : StaveConnector.type.BRACE).setContext(ctx).draw();
          new StaveConnector(top, bottom).setType(StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
        }
        new StaveConnector(top, bottom)
          .setType(mi === measureCount - 1 ? StaveConnector.type.BOLD_DOUBLE_RIGHT : StaveConnector.type.SINGLE_RIGHT)
          .setContext(ctx)
          .draw();
      }

      groups.forEach((g, si) => {
        const st = measureStaves[si];
        staves.push({
          voice: g[0],
          voices: g,
          staff: si,
          measure: mi,
          x: st.getX(),
          width,
          topLineY: st.getYForLine(0),
          spacing: st.getSpacingBetweenLines(),
          noteStartX: st.getNoteStartX(),
          clef: score.voices[g[0]].clef,
        });
      });

      // Noten aller Stimmen dieses Takts bauen
      type Built = { vi: number; si: number; notes: StaveNote[]; vex: VexVoice; beams: Beam[] };
      const built: Built[] = [];
      groups.forEach((g, si) => {
        const shared = g.length > 1;
        g.forEach((vi, pos) => {
          const voice = score.voices[vi];
          const measure = voice.measures[mi];
          if (!measure || measure.notes.length === 0) return;
          const dir = shared ? ((voice.stem ?? (pos === 0 ? 'up' : 'down')) === 'up' ? 1 : -1) : 0;
          const notes = measure.notes.map((ev) => {
            const rest = !ev.pitch;
            const restKey = voice.clef === 'bass' ? (dir > 0 ? 'f/3' : dir < 0 ? 'b/2' : 'd/3') : voice.clef === 'alto' ? (dir > 0 ? 'd/4' : dir < 0 ? 'g/3' : 'c/4') : dir > 0 ? 'e/5' : dir < 0 ? 'f/4' : 'b/4';
            const note = new StaveNote({
              keys: [rest ? restKey : toVexKey(ev.pitch!)],
              duration: toVexDuration(ev.duration, rest),
              clef: voice.clef,
              auto_stem: dir === 0,
              ...(dir ? { stem_direction: dir } : {}),
            });
            if (ev.duration.dots) Dot.buildAndAttach([note], { all: true });
            if (ev.fermata) {
              note.addModifier(
                new Articulation(dir < 0 ? 'a@u' : 'a@a').setPosition(dir < 0 ? Modifier.Position.BELOW : Modifier.Position.ABOVE),
                0,
              );
            }
            return note;
          });
          const vex = new VexVoice({ num_beats: score.time.beats, beat_value: score.time.beatType });
          vex.setStrict(false); // erlaubt Auftakte
          vex.addTickables(notes);
          const beams = Beam.generateBeams(
            notes.filter((n) => !n.isRest()),
            { groups: beamGroups(score.time.beats, score.time.beatType), maintain_stem_directions: shared },
          );
          built.push({ vi, si, notes, vex, beams });
        });
      });
      if (!built.length) {
        x += width;
        continue;
      }

      // Vorzeichen je System gemeinsam, Formatierung über alle Systeme
      groups.forEach((_g, si) => {
        const vs = built.filter((b) => b.si === si).map((b) => b.vex);
        if (vs.length) Accidental.applyAccidentals(vs, keySpecs[si]);
      });
      const formatter = new Formatter();
      groups.forEach((_g, si) => {
        const vs = built.filter((b) => b.si === si).map((b) => b.vex);
        if (vs.length) formatter.joinVoices(vs);
      });
      const available = measureStaves[0].getNoteEndX() - noteStart - 14;
      formatter.format(
        built.map((b) => b.vex),
        Math.max(available, 40),
      );

      // Erst alle Stimmen zeichnen, dann Namen, Text und Bögen (brauchen fertige Positionen)
      for (const b of built) {
        b.vex.draw(ctx, measureStaves[b.si]);
        b.beams.forEach((beam) => beam.setContext(ctx).draw());
      }
      for (const b of built) {
        const st = measureStaves[b.si];
        const voice = score.voices[b.vi];
        const measure = voice.measures[mi];

        // Deutsche Notennamen auf einer gemeinsamen Linie unter dem System (nur bei einer Stimme je System)
        if (opts.showNoteNames && groups[b.si].length === 1) {
          const nameY = Math.max(st.getYForLine(4) + 34, ...b.notes.map((n) => Math.max(...n.getYs()) + 22));
          ctx.save();
          ctx.setFont('Helvetica, Arial, sans-serif', 12);
          ctx.setFillStyle('#4a4560');
          measure.notes.forEach((ev, ni) => {
            if (!ev.pitch) return;
            const note = b.notes[ni];
            const text = germanName(ev.pitch);
            const center = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
            const w = ctx.measureText(text).width;
            ctx.fillText(text, center - w / 2, nameY);
          });
          ctx.restore();
        }

        // Liedtext unter dem System, unterhalb der tiefsten Note samt Hals
        if (measure.notes.some((n) => n.lyric)) {
          const tiefste = Math.max(
            ...built.filter((x) => x.si === b.si).flatMap((x) => x.notes.map((n) => Math.max(...n.getYs(), n.getStemExtents?.().baseY ?? 0, n.getStemExtents?.().topY ?? 0))),
          );
          const lyricY = Math.max(st.getYForLine(4) + 44, tiefste + 18);
          ctx.save();
          ctx.setFont('Helvetica, Arial, sans-serif', 13);
          ctx.setFillStyle('#1f1b2e');
          measure.notes.forEach((ev, ni) => {
            if (!ev.lyric) return;
            const note = b.notes[ni];
            const center = (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2;
            const w = ctx.measureText(ev.lyric).width;
            ctx.fillText(ev.lyric, center - w / 2, lyricY);
          });
          ctx.restore();
        }

        measure.notes.forEach((ev, ni) => {
          const note = b.notes[ni];
          // Bindebogen von der vorherigen Note schließen
          const prev = pendingTie[b.vi];
          if (prev && ev.pitch) {
            const sameRow = mi !== start || ni !== 0;
            if (sameRow) {
              new StaveTie({ first_note: prev, last_note: note, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
            } else {
              new StaveTie({ first_note: prev, last_note: null, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
              new StaveTie({ first_note: null, last_note: note, first_indices: [0], last_indices: [0] }).setContext(ctx).draw();
            }
          }
          pendingTie[b.vi] = ev.tie && ev.pitch ? note : null;

          const id = eventId(b.vi, mi, ni);
          const el = note.getSVGElement();
          if (el) elements.set(id, el);
          noteLayouts.push({
            id,
            voice: b.vi,
            measure: mi,
            index: ni,
            x: (note.getNoteHeadBeginX() + note.getNoteHeadEndX()) / 2,
            y: note.getYs()[0],
          });
        });
      }
      x += width;
    }
  }

  const svg = container.querySelector('svg');
  if (svg) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Noten: ${score.title}`);
  }
  return { elements, staves, notes: noteLayouts, height };
}

/** Balkengruppen: im 6/8-, 9/8- und 12/8-Takt je punktierte Viertel, sonst je Viertel */
function beamGroups(beats: number, beatType: number): Fraction[] {
  if (beatType === 8 && beats % 3 === 0) return [new Fraction(3, 8)];
  return [new Fraction(1, 4)];
}
