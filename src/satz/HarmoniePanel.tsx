import { useMemo } from 'react';
import type { Score } from '../model/types';
import { useNavigation } from '../navigation';
import { klavierHarmonien } from './klavier';

/** Die erkannten Harmonien eines Klaviersatzes, Takt für Takt */
export function HarmoniePanel({ score }: { score: Score }) {
  const { oeffneLexikon } = useNavigation();
  const harmonien = useMemo(() => klavierHarmonien(score), [score]);
  const takte = useMemo(() => {
    const m = new Map<number, typeof harmonien>();
    harmonien.forEach((h) => m.set(h.takt, [...(m.get(h.takt) ?? []), h]));
    return [...m.entries()];
  }, [harmonien]);
  const ergaenzt = harmonien.some((h) => h.ergaenzt);

  return (
    <section className="pruef-panel harmonie-panel" aria-label="Harmonien">
      <div className="pruef-kopf">
        <strong>{harmonien.length ? 'Harmonien, die Melodie und Begleitung zusammen ergeben' : 'Noch keine Harmonien: Schreib Melodie und Begleitung.'}</strong>
      </div>
      {takte.length > 0 && (
        <ol className="harmonie-takte">
          {takte.map(([t, hs]) => (
            <li key={t}>
              <span className="harmonie-takt">{t + 1}</span>
              {hs.map((h) => (
                <span key={h.start} className={`harmonie ${h.kurz === '?' ? 'is-unklar' : ''}`} title={h.akkord ? `${h.akkord.name}${h.ergaenzt ? ' (Terz ergänzt)' : ''}` : 'kein klarer Akkord'}>
                  {h.kurz}
                  {h.ergaenzt ? '*' : ''}
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}
      <p className="meta">
        Je Taktschwerpunkt werden alle Töne zusammengezählt; die Begleitung zählt mehr als die Melodie. Ein ? heißt: kein klarer Akkord.
        {ergaenzt ? ' * Die Terz fehlt und ist leitereigen ergänzt; spiel sie in der Begleitung, damit Dur oder Moll eindeutig wird.' : ''}{' '}
        <button className="link small" onClick={() => oeffneLexikon('funktionstheorie')}>
          Mehr dazu: Funktionstheorie
        </button>
      </p>
    </section>
  );
}
