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
}

/** Zeigt eine Partitur mit VexFlow an und passt den Umbruch an die Bildschirmbreite an. */
export function ScoreView({ score, showNoteNames, activeId, markierungen }: Props) {
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
    els.forEach((el) => el.classList.remove('is-fehler', 'is-hinweis', 'is-auswahl'));
    markierungen?.forEach((cls, id) => els.get(id)?.classList.add(...cls.split(' ')));
  }, [markierungen, score, width, showNoteNames]);

  return (
    <div className="score">
      <div ref={hostRef} className="score-host" />
      {error && <p className="error">Die Noten konnten nicht gezeichnet werden: {error}</p>}
    </div>
  );
}
