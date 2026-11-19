import { useMemo, useState } from 'react';
import { eintrag } from '../lexikon/lexikon';
import type { Score } from '../model/types';
import { useNavigation } from '../navigation';
import { pruefeSatz, regel, type Befund } from './regeln';

const HINWEISE_KEY = 'kt-pruefung-hinweise';

function hinweiseGespeichert(): boolean {
  try {
    return localStorage.getItem(HINWEISE_KEY) !== 'nein';
  } catch {
    return true;
  }
}

/** Markierungen fürs Notenbild: Fehler rot, Hinweise orange, ausgewählter Befund hervorgehoben */
export function markierungenFuer(befunde: Befund[], auswahl: number | null): Map<string, string> {
  const m = new Map<string, string>();
  befunde.forEach((b) => b.ids.forEach((id) => (m.get(id) !== 'is-fehler' ? m.set(id, b.art === 'fehler' ? 'is-fehler' : 'is-hinweis') : null)));
  if (auswahl !== null) befunde[auswahl]?.ids.forEach((id) => m.set(id, `${m.get(id) ?? ''} is-auswahl`.trim()));
  return m;
}

export function usePruefung(score: Score) {
  const [hinweise, setHinweiseState] = useState(hinweiseGespeichert);
  const befunde = useMemo(() => pruefeSatz(score, { hinweise }), [score, hinweise]);
  function setHinweise(v: boolean) {
    setHinweiseState(v);
    try {
      localStorage.setItem(HINWEISE_KEY, v ? 'ja' : 'nein');
    } catch {
      /* ignorieren */
    }
  }
  return { befunde, hinweise, setHinweise };
}

interface Props {
  befunde: Befund[];
  auswahl: number | null;
  onAuswahl: (i: number | null) => void;
  hinweise: boolean;
  onHinweise: (v: boolean) => void;
}

/** Liste der Befunde mit Erklärung und Verweis ins Lexikon */
export function PruefPanel({ befunde, auswahl, onAuswahl, hinweise, onHinweise }: Props) {
  const { oeffneLexikon } = useNavigation();
  const fehler = befunde.filter((b) => b.art === 'fehler').length;
  const hinw = befunde.length - fehler;

  return (
    <section className="pruef-panel" aria-label="Prüfung">
      <div className="pruef-kopf">
        <strong>
          {befunde.length === 0
            ? 'Keine Regelverstöße gefunden.'
            : `${fehler} ${fehler === 1 ? 'Fehler' : 'Fehler'}${hinw ? `, ${hinw} ${hinw === 1 ? 'Hinweis' : 'Hinweise'}` : ''}`}
        </strong>
        <label className="check">
          <input type="checkbox" checked={hinweise} onChange={(e) => onHinweise(e.target.checked)} />
          <span>Stilhinweise zeigen</span>
        </label>
      </div>
      {befunde.length > 0 && (
        <ol className="befunde">
          {befunde.map((b, i) => {
            const r = regel(b.regel);
            const e = r ? eintrag(r.begriff) : undefined;
            return (
              <li key={i} className={`befund ${b.art} ${auswahl === i ? 'is-on' : ''}`}>
                <button className="befund-text" onClick={() => onAuswahl(auswahl === i ? null : i)} aria-pressed={auswahl === i}>
                  <span className="befund-art">{b.art === 'fehler' ? 'Fehler' : 'Hinweis'}</span> Takt {b.takt}: {b.text}
                </button>
                {e && (
                  <button className="link small" onClick={() => oeffneLexikon(e.id)}>
                    Mehr dazu: {e.titel}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {befunde.length > 0 && <p className="meta">Tippe auf einen Befund, um die betroffenen Noten hervorzuheben.</p>}
    </section>
  );
}
