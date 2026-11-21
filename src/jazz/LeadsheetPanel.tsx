import { useMemo, useState } from 'react';
import { playChord } from '../audio/player';
import { germanKeyName, toToneName } from '../model/pitch';
import type { Score } from '../model/types';
import { useNavigation } from '../navigation';
import { jazzAnalyse, leadsheet, pruefeLeadsheet, voicings } from './analyse';

const MUSTER_BEGRIFF: Record<string, string> = {
  'ii-v-i': 'zwei-fuenf-eins',
  'ii-v': 'zwei-fuenf-eins',
  'v-i': 'zwei-fuenf-eins',
  zwischendominante: 'zwischendominante',
  'tritonus-substitution': 'tritonus-substitution',
  'modale-mischung': 'modale-mischung',
};

/** Analyse eines Leadsheets: Stufen und Rollen der Akkordsymbole, Muster, Avoid Notes, Voicings zum Anhören */
export function LeadsheetPanel({ score }: { score: Score }) {
  const [offen, setOffen] = useState(false);
  const { oeffneLexikon } = useNavigation();
  const ls = useMemo(() => leadsheet(score), [score]);
  const analyse = useMemo(() => jazzAnalyse(ls.akkorde, score.key), [ls, score.key]);
  const befunde = useMemo(() => pruefeLeadsheet(score), [score]);
  if (!ls.akkorde.length && !ls.ungueltig.length) return null;
  return (
    <section className="pruef-panel leadsheet-panel" aria-label="Leadsheet-Analyse">
      <div className="pruef-kopf">
        <strong>Leadsheet · {germanKeyName(score.key)}</strong>
        <button className="secondary small" onClick={() => setOffen(!offen)}>
          {offen ? 'Analyse ausblenden' : `Akkorde analysieren (${ls.akkorde.length})`}
        </button>
      </div>
      {offen && (
        <>
          {befunde.length === 0 ? (
            <p className="meta">Melodie und Akkorde passen zusammen: keine langen Avoid Notes.</p>
          ) : (
            <ul className="befunde">
              {befunde.map((b, i) => (
                <li key={i} className={`befund ${b.art}`}>
                  <span className="befund-art">{b.art === 'fehler' ? 'Fehler' : 'Hinweis'}</span> Takt {b.takt}: {b.text}
                </li>
              ))}
            </ul>
          )}
          {analyse.muster.length > 0 && (
            <ul className="leadsheet-muster">
              {analyse.muster.map((m, i) => (
                <li key={i}>
                  Takt {m.takt}: {m.text}{' '}
                  <button className="link small" onClick={() => oeffneLexikon(MUSTER_BEGRIFF[m.art])}>
                    Lexikon
                  </button>
                </li>
              ))}
            </ul>
          )}
          <table className="leadsheet-tabelle">
            <thead>
              <tr>
                <th>Takt</th>
                <th>Symbol</th>
                <th>Stufe</th>
                <th>Rolle</th>
                <th>Voicing</th>
              </tr>
            </thead>
            <tbody>
              {analyse.deutungen.map((d) => {
                const v = voicings(d.akkord.sym);
                return (
                  <tr key={d.akkord.index}>
                    <td>{d.akkord.takt}</td>
                    <td>
                      <strong>{d.akkord.text}</strong>
                    </td>
                    <td>{d.stufe}</td>
                    <td>{d.rolle}</td>
                    <td className="voicing-knoepfe">
                      <button className="secondary small" onClick={() => playChord(v.shell.map(toToneName))} title="Grundton, Terz und Septime">
                        Shell
                      </button>{' '}
                      <button className="secondary small" onClick={() => playChord(v.drop2.map(toToneName))} title="Vierklang mit dem zweithöchsten Ton eine Oktave tiefer">
                        Drop 2
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
