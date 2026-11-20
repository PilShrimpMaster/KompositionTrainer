import { useMemo } from 'react';
import type { Score } from '../model/types';
import { useNavigation } from '../navigation';
import { analysiereForm, kadenzText } from './form';

/** Formübersicht: Zweitaktglieder mit Buchstaben, Kadenzen und erkannte Form */
export function FormPanel({ score }: { score: Score }) {
  const { oeffneLexikon } = useNavigation();
  const f = useMemo(() => analysiereForm(score), [score]);
  const lex = f.form?.includes('Periode') ? 'periode' : f.form === 'Satz' ? 'satz-form' : f.form?.includes('Liedform') ? 'liedform' : f.form?.includes('Menuett') ? 'menuett' : 'phrase';

  return (
    <section className="pruef-panel form-panel" aria-label="Form">
      <div className="pruef-kopf">
        <strong>{f.form ? `Form: ${f.form}` : f.takte < 4 ? 'Form: Schreib mindestens vier Takte.' : 'Form: noch keine bekannte Form erkannt.'}</strong>
      </div>
      {f.glieder.length > 0 && (
        <ol className="harmonie-takte" aria-label="Zweitaktglieder">
          {f.glieder.map((g) => (
            <li key={g.von}>
              <span className="harmonie-takt">
                {g.von}–{g.bis}
              </span>
              <span className="harmonie">{g.name}</span>
            </li>
          ))}
        </ol>
      )}
      {f.kadenzen.length > 0 && (
        <ul className="form-kadenzen">
          {f.kadenzen.map((k) => (
            <li key={k.takt} className={`kadenz-${k.art}`}>
              {kadenzText(k)}
            </li>
          ))}
        </ul>
      )}
      {f.text.map((t) => (
        <p key={t}>{t}</p>
      ))}
      <p className="meta">
        Gleiche Buchstaben bedeuten gleiche oder ähnliche Zweitakter (′ = verändert). Kadenzen werden alle vier Takte gesucht.{' '}
        <button className="link small" onClick={() => oeffneLexikon(lex)}>
          Mehr dazu
        </button>
      </p>
    </section>
  );
}
