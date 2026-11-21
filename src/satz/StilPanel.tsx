import { useMemo } from 'react';
import type { Score } from '../model/types';
import { useNavigation } from '../navigation';
import { stilProfil } from './stil';
import { stilmerkmale, stilTendenz, type Merkmal } from './stilmerkmale';

/** Stilmerkmale eines Stücks: alterierte Akkorde, Chromatik, Mixturen, Ganzton … und welche Epoche dazu passt */
export function StilPanel({ score, auswahl, onAuswahl }: { score: Score; auswahl?: string | null; onAuswahl?: (m: Merkmal | null) => void }) {
  const { oeffneLexikon } = useNavigation();
  const merkmale = useMemo(() => stilmerkmale(score), [score]);
  const tendenz = useMemo(() => stilTendenz(merkmale), [merkmale]);

  return (
    <section className="pruef-panel stil-panel" aria-label="Stilmerkmale">
      <div className="pruef-kopf">
        <strong>
          {merkmale.length === 0
            ? 'Stilmerkmale: nichts Auffälliges gefunden, der Satz bleibt in der Dur-Moll-Harmonik.'
            : `Stilmerkmale: ${merkmale.length}${tendenz[0] ? `, am ehesten ${stilProfil(tendenz[0].stil).name}` : ''}`}
        </strong>
      </div>
      {merkmale.length > 0 && (
        <ol className="befunde">
          {merkmale.map((m) => (
            <li key={m.id} className={`befund merkmal ${auswahl === m.id ? 'is-on' : ''}`}>
              <button className="befund-text" onClick={() => onAuswahl?.(auswahl === m.id ? null : m)} aria-pressed={auswahl === m.id}>
                {m.text}
                <span className="meta"> · typisch für {m.epochen.map((e) => stilProfil(e).name).join(', ')}</span>
              </button>
              <button className="link small" onClick={() => oeffneLexikon(m.begriff)}>
                Mehr dazu: {m.name}
              </button>
            </li>
          ))}
        </ol>
      )}
      <p className="meta">
        Gesucht werden alterierte Akkorde, Chromatik, Sequenzen, Orgelpunkte, parallel verschobene Klänge, Ganzton und Pentatonik, Quarten, Cluster und Zwölftonreihen.
      </p>
    </section>
  );
}
