import { useEffect, useRef, useState } from 'react';
import type { Score } from './model/types';
import { renderScore } from './render/renderScore';

interface Props {
  score: Score;
  showNoteNames: boolean;
  /** Kennung der gerade klingenden Note */
  activeId: string | null;
  /** Zusätzliche CSS-Klassen je Note, z. B. für Fehler der Prüf-Engine */
  markierungen?: Map<string, string>;
  /** Tippen auf eine Note (z. B. um einen Takt zu markieren) */
  onNoteClick?: (id: string) => void;
}

/** Zeigt eine Partitur mit VexFlow an und passt den Umbruch an die Bildschirmbreite an. */
export function ScoreView({ score, showNoteNames, activeId, markierungen, onNoteClick }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<Map<string, SVGElement>>(new Map());
  const [width, setWidth] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || width === 0) return;
    try {
      elementsRef.current = renderScore(host, score, { width, showNoteNames }).elements;
      setError(null);
    } catch (e) {
      host.innerHTML = '';
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [score, width, showNoteNames]);

  useEffect(() => {
    const els = elementsRef.current;
    els.forEach((el) => el.classList.remove('is-playing'));
    if (activeId) els.get(activeId)?.classList.add('is-playing');
  }, [activeId, score, width, showNoteNames]);

  useEffect(() => {
    const els = elementsRef.current;
    els.forEach((el) => el.classList.remove(...[...el.classList].filter((c) => c.startsWith('is-') && c !== 'is-playing')));
    markierungen?.forEach((cls, id) => els.get(id)?.classList.add(...cls.split(' ')));
  }, [markierungen, score, width, showNoteNames]);

  // Tippen auf Noten: ein Klick-Handler am Host findet die Note über das Element-Verzeichnis
  const klickRef = useRef(onNoteClick);
  klickRef.current = onNoteClick;
  function klick(e: React.MouseEvent) {
    if (!klickRef.current) return;
    let el = e.target as Element | null;
    const ids = new Map([...elementsRef.current].map(([id, x]) => [x as Element, id]));
    while (el && el !== hostRef.current) {
      const id = ids.get(el);
      if (id) return klickRef.current(id);
      el = el.parentElement;
    }
    // Daneben getippt: die nächstgelegene Note nehmen (großzügig für Finger und Stift)
    let best: { id: string; d: number } | null = null;
    elementsRef.current.forEach((x, id) => {
      const r = x.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      const d = Math.hypot(dx, dy);
      if (!best || d < best.d) best = { id, d };
    });
    const b = best as { id: string; d: number } | null;
    if (b && b.d < 60) klickRef.current(b.id);
  }

  return (
    <div className={`score${onNoteClick ? ' ist-tippbar' : ''}`} onClick={onNoteClick ? klick : undefined}>
      <div ref={hostRef} className="score-host" />
      {error && <p className="error">Die Noten konnten nicht gezeichnet werden: {error}</p>}
    </div>
  );
}
