import { useMemo, useState } from 'react';
import type { Score } from '../model/types';
import { germanNameWithOctave } from '../model/pitch';
import { useNavigation } from '../navigation';
import { findeMotive, standardMotiv, type Fund, type Motiv } from './motive';

/** Motiv (automatisch oder mit fester Länge) und alle Funde im Satz */
export function useMotive(score: Score) {
  const [laenge, setLaenge] = useState<number | null>(null);
  const [auswahl, setAuswahl] = useState<number | null>(null);
  const motiv = useMemo(() => standardMotiv(score, laenge ?? undefined), [score, laenge]);
  const funde = useMemo(() => findeMotive(score, motiv), [score, motiv]);
  return { motiv, funde, laenge, setLaenge, auswahl: auswahl !== null && auswahl < funde.length ? auswahl : null, setAuswahl };
}

/** Markierungen für die Noten: alle Funde blau, der ausgewählte hervorgehoben */
export function motivMarkierungen(funde: Fund[], auswahl: number | null, dazu?: Map<string, string>): Map<string, string> {
  const m = new Map<string, string>();
  funde.forEach((f, i) => f.ids.forEach((id) => m.set(id, `is-motiv${f.bezug === 'Original' ? ' is-motiv-original' : ''}${auswahl === i ? ' is-auswahl' : ''}`)));
  dazu?.forEach((cls, id) => m.set(id, `${m.get(id) ?? ''} ${cls}`.trim()));
  return m;
}

interface Props {
  motiv: Motiv | null;
  funde: Fund[];
  laenge: number | null;
  onLaenge: (n: number | null) => void;
  auswahl: number | null;
  onAuswahl: (i: number | null) => void;
}

/** Liste der Motivfunde: Thema, Umkehrung, Krebs, Vergrößerung, Sequenz, Imitation */
export function MotivPanel({ motiv, funde, laenge, onLaenge, auswahl, onAuswahl }: Props) {
  const { oeffneLexikon } = useNavigation();
  const n = motiv?.toene.length ?? 0;
  const formen = [...new Set(funde.filter((f) => f.bezug !== 'Original').map((f) => (f.form === 'Thema' ? f.bezug : f.form)))];

  return (
    <section className="pruef-panel motiv-panel" aria-label="Motivanalyse">
      <div className="pruef-kopf">
        <strong>
          {!motiv
            ? 'Noch kein Motiv: Schreib mindestens drei Töne.'
            : funde.length <= 1
              ? 'Das Motiv kommt bisher nur einmal vor.'
              : `Das Motiv kommt ${funde.length}-mal vor${formen.length ? `: ${formen.join(', ')}` : ''}.`}
        </strong>
        {motiv && (
          <span className="motiv-laenge" role="group" aria-label="Länge des Motivs">
            Motiv: {n} Töne ab {germanNameWithOctave(motiv.toene[0].p)}
            <button className="secondary small" disabled={n <= 3} onClick={() => onLaenge(n - 1)} aria-label="Motiv kürzer">
              −
            </button>
            <button className="secondary small" onClick={() => onLaenge(n + 1)} aria-label="Motiv länger">
              +
            </button>
            {laenge !== null && (
              <button className="link small" onClick={() => onLaenge(null)}>
                automatisch
              </button>
            )}
          </span>
        )}
      </div>
      {funde.length > 0 && (
        <ol className="befunde">
          {funde.map((f, i) => (
            <li key={f.ids.join(',')} className={`befund motiv ${auswahl === i ? 'is-on' : ''}`}>
              <button className="befund-text" onClick={() => onAuswahl(auswahl === i ? null : i)} aria-pressed={auswahl === i}>
                <span className="befund-art">{f.bezug === 'Original' ? 'Motiv' : f.form === 'Thema' ? f.bezug : f.form}</span> Takt {f.takt}: {f.text}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="meta">
        Gesucht wird das Motiv mit gleichen Tonschritten und gleichem Rhythmus, auch gespiegelt, rückwärts, vergrößert und verkleinert. Ändere die Länge, wenn dein Motiv kürzer oder länger ist.{' '}
        <button className="link small" onClick={() => oeffneLexikon('spiegelung')}>
          Mehr dazu: Umkehrung, Krebs und Vergrößerung
        </button>
      </p>
    </section>
  );
}
