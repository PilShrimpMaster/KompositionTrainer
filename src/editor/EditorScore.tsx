import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { germanNameWithOctave, pitchAtY } from '../model/pitch';
import type { Pitch, Score } from '../model/types';
import { renderScore, type RenderResult, type StaveLayout } from '../render/renderScore';

interface Props {
  score: Score;
  showNoteNames: boolean;
  /** Anzeige-Kennungen, die als ausgewählt markiert werden */
  selectedIds: string[];
  activeId: string | null;
  /** Mit dem Finger schreiben (sonst nur Stift und Maus) */
  fingerWrites: boolean;
  /** Neue Note an Position `at` (Index in der Notenfolge) setzen */
  onInsert: (pitch: Pitch, at: number) => void;
  /** Note antippen: auswählen */
  onSelect: (displayId: string | null) => void;
  /** Ausgewählte Note per Ziehen auf eine neue Tonhöhe setzen */
  onDragPitch: (displayId: string, pitch: Pitch) => void;
  /** Anzeige-Kennung → Index in der Notenfolge */
  sourceOf: Map<string, number>;
  eventCount: number;
}

interface Hover {
  x: number;
  y: number;
  width: number;
  label: string;
}

const HIT_RADIUS = 14;

/**
 * Notenbild des Editors: zeichnet mit VexFlow und setzt Noten per Stift, Maus
 * oder (wenn eingeschaltet) Finger. Mit dem Finger wird sonst gescrollt.
 */
export function EditorScore(props: Props) {
  const { score, showNoteNames, selectedIds, activeId, fingerWrites } = props;
  const hostRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<RenderResult | null>(null);
  const dragRef = useRef<{ id: string; pointerId: number; moved: boolean; startY: number } | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const [renderTick, setRenderTick] = useState(0);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const host = hostRef.current?.querySelector<HTMLDivElement>('.score-canvas');
    if (!host || width === 0) return;
    layoutRef.current = renderScore(host, score, { width, showNoteNames });
    setRenderTick((t) => t + 1);
  }, [score, width, showNoteNames]);

  useLayoutEffect(() => {
    const els = layoutRef.current?.elements;
    if (!els) return;
    els.forEach((el, id) => {
      el.classList.toggle('is-selected', selectedIds.includes(id));
      el.classList.toggle('is-playing', id === activeId);
    });
  }, [selectedIds, activeId, renderTick]);

  // Safari scrollt sonst auch beim Schreiben mit dem Apple Pencil
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onTouch = (e: TouchEvent) => {
      const stylus = Array.from(e.touches).some((t) => (t as Touch & { touchType?: string }).touchType === 'stylus');
      if (stylus || propsRef.current.fingerWrites) e.preventDefault();
    };
    host.addEventListener('touchstart', onTouch, { passive: false });
    host.addEventListener('touchmove', onTouch, { passive: false });
    return () => {
      host.removeEventListener('touchstart', onTouch);
      host.removeEventListener('touchmove', onTouch);
    };
  }, []);

  function localPoint(e: React.PointerEvent) {
    const rect = hostRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function staveAt(x: number, y: number): StaveLayout | null {
    const staves = layoutRef.current?.staves ?? [];
    return (
      staves.find(
        (s) =>
          x >= s.x &&
          x <= s.x + s.width &&
          y >= s.topLineY - s.spacing * 6 &&
          y <= s.topLineY + s.spacing * 10,
      ) ?? null
    );
  }

  function noteAt(x: number, y: number) {
    const st = staveAt(x, y);
    if (!st) return null;
    const notes = (layoutRef.current?.notes ?? []).filter((n) => n.measure === st.measure);
    let best: (typeof notes)[number] | null = null;
    for (const n of notes) {
      const dx = Math.abs(n.x - x);
      if (dx <= HIT_RADIUS && (!best || dx < Math.abs(best.x - x))) best = n;
    }
    return best;
  }

  /** Einfügeposition in der Notenfolge für einen Punkt im System */
  function insertIndexAt(x: number, st: StaveLayout): number {
    const { sourceOf, eventCount } = propsRef.current;
    const notes = layoutRef.current?.notes ?? [];
    let idx = -1;
    let anyLater = false;
    for (const n of notes) {
      const src = sourceOf.get(n.id);
      if (src === undefined) continue;
      if (n.measure < st.measure || (n.measure === st.measure && n.x < x)) idx = Math.max(idx, src);
      else anyLater = true;
    }
    if (!anyLater) return eventCount;
    return idx + 1;
  }

  function writes(e: React.PointerEvent) {
    return e.pointerType === 'pen' || e.pointerType === 'mouse' || (e.pointerType === 'touch' && fingerWrites);
  }

  function updateHover(e: React.PointerEvent) {
    const { x, y } = localPoint(e);
    const st = staveAt(x, y);
    if (!st) return setHover(null);
    const pitch = pitchAtY(y, st, score.key.fifths);
    const snappedY = st.topLineY + Math.round((y - st.topLineY) / (st.spacing / 2)) * (st.spacing / 2);
    setHover({ x: st.x, y: snappedY, width: st.width, label: germanNameWithOctave(pitch) });
  }

  function onPointerDown(e: React.PointerEvent) {
    const { x, y } = localPoint(e);
    const hit = noteAt(x, y);
    if (hit) {
      propsRef.current.onSelect(hit.id);
      if (writes(e)) {
        dragRef.current = { id: hit.id, pointerId: e.pointerId, moved: false, startY: y };
        try {
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
          /* ohne Capture funktioniert das Ziehen innerhalb des Systems trotzdem */
        }
      }
      return;
    }
    if (!writes(e)) return;
    const st = staveAt(x, y);
    if (!st) {
      propsRef.current.onSelect(null);
      return;
    }
    e.preventDefault();
    propsRef.current.onInsert(pitchAtY(y, st, score.key.fifths), insertIndexAt(x, st));
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const { y } = localPoint(e);
      if (Math.abs(y - drag.startY) > 3) drag.moved = true;
      if (drag.moved) updateHover(e);
      return;
    }
    if (e.pointerType === 'pen' || e.pointerType === 'mouse') updateHover(e);
  }

  function onPointerUp(e: React.PointerEvent) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag || drag.pointerId !== e.pointerId || !drag.moved) return;
    const { x, y } = localPoint(e);
    const note = layoutRef.current?.notes.find((n) => n.id === drag.id);
    const st = note
      ? layoutRef.current?.staves.find((s) => s.measure === note.measure && s.voice === note.voice)
      : staveAt(x, y);
    if (st) propsRef.current.onDragPitch(drag.id, pitchAtY(y, st, score.key.fifths));
    setHover(null);
  }

  return (
    <div
      ref={hostRef}
      className={`editor-score ${fingerWrites ? 'finger-writes' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
        setHover(null);
      }}
      onPointerLeave={() => !dragRef.current && setHover(null)}
    >
      <div className="score-canvas" />
      {hover && (
        <div className="hover-line" style={{ left: hover.x, top: hover.y, width: hover.width }}>
          <span>{hover.label}</span>
        </div>
      )}
    </div>
  );
}
