import { useEffect, useState } from 'react';
import type { EditorDoc } from '../editor/rebar';
import type { Stueck } from './backup';
import { alleStuecke, stueckLoeschen, stueckSpeichern } from './db';

interface Props {
  doc: EditorDoc;
  stueckId: string | null;
  setStueckId: (id: string | null) => void;
  onOpen: (doc: EditorDoc) => void;
  onNew: () => void;
  /** Ändert sich bei jedem automatischen Speichern, damit die Liste neu lädt */
  version: number;
}

const datum = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' });

/** „Meine Stücke“: Stücke in der lokalen Datenbank öffnen, anlegen und löschen. */
export function StueckePanel({ doc, stueckId, setStueckId, onOpen, onNew, version }: Props) {
  const [liste, setListe] = useState<Stueck[]>([]);
  const [loeschen, setLoeschen] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    alleStuecke()
      .then(setListe)
      .catch(() => setFehler('Die Stücke konnten nicht geladen werden.'));
  }, [version, stueckId]);

  async function speichern() {
    try {
      const s = await stueckSpeichern(doc, stueckId ?? undefined);
      setStueckId(s.id);
      setListe(await alleStuecke());
    } catch {
      setFehler('Speichern hat nicht geklappt.');
    }
  }

  return (
    <section className="stuecke">
      <div className="stuecke-head">
        <h3>Meine Stücke</h3>
        <div className="json-actions">
          {!stueckId && (
            <button onClick={speichern} disabled={doc.events.length === 0}>
              Als Stück speichern
            </button>
          )}
          <button className="secondary" onClick={onNew}>
            Neues Stück
          </button>
        </div>
      </div>
      {stueckId && <p className="meta">Dieses Stück wird automatisch gespeichert.</p>}
      {fehler && <p className="error">{fehler}</p>}
      {liste.length === 0 ? (
        <p className="meta">Noch keine gespeicherten Stücke.</p>
      ) : (
        <ul className="stueck-liste">
          {liste.map((s) => (
            <li key={s.id} className={s.id === stueckId ? 'is-current' : ''}>
              <button
                className="link stueck-titel"
                onClick={() => {
                  setStueckId(s.id);
                  onOpen(s.doc);
                }}
              >
                {s.titel}
              </button>
              <span className="meta">
                {s.doc.events.length} Noten · {datum.format(s.geaendert)}
              </span>
              {loeschen === s.id ? (
                <span className="loeschen-frage">
                  Wirklich löschen?{' '}
                  <button
                    className="secondary small danger"
                    onClick={async () => {
                      await stueckLoeschen(s.id);
                      if (s.id === stueckId) setStueckId(null);
                      setLoeschen(null);
                      setListe(await alleStuecke());
                    }}
                  >
                    Ja, löschen
                  </button>{' '}
                  <button className="secondary small" onClick={() => setLoeschen(null)}>
                    Nein
                  </button>
                </span>
              ) : (
                <button className="secondary small" onClick={() => setLoeschen(s.id)} aria-label={`${s.titel} löschen`}>
                  Löschen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
