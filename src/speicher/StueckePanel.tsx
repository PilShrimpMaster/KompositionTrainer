import { useEffect, useState } from 'react';
import type { EditorDoc } from '../editor/rebar';
import { besetzungsName, scoreAusDoc } from '../editor/satzdoc';
import { speichereMusicXml } from '../musicxml/datei';
import type { Stueck } from './backup';
import { alleStuecke, portfolioSetzen, stueckLoeschen, stueckSpeichern, versionLoeschen, versionSichern, versionZurueckholen } from './db';

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

function takte(doc: EditorDoc): number {
  try {
    return scoreAusDoc(doc).voices[0]?.measures.length ?? 0;
  } catch {
    return 0;
  }
}

/** „Meine Stücke“: Stücke öffnen, anlegen, löschen; Fassungen sichern und zurückholen; fertige Werke ins Portfolio */
export function StueckePanel({ doc, stueckId, setStueckId, onOpen, onNew, version }: Props) {
  const [liste, setListe] = useState<Stueck[]>([]);
  const [loeschen, setLoeschen] = useState<string | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [nurPortfolio, setNurPortfolio] = useState(false);
  const [fassungName, setFassungName] = useState('');
  const [meldung, setMeldung] = useState<string | null>(null);

  const laden = () =>
    alleStuecke()
      .then(setListe)
      .catch(() => setFehler('Die Stücke konnten nicht geladen werden.'));

  useEffect(() => {
    laden();
  }, [version, stueckId]);

  const leer = doc.events.length === 0 && !doc.satz?.stimmen.some((s) => s.length);
  const aktuell = liste.find((s) => s.id === stueckId);
  const sichtbar = nurPortfolio ? liste.filter((s) => s.portfolio) : liste;

  async function speichern() {
    try {
      const s = await stueckSpeichern(doc, stueckId ?? undefined);
      setStueckId(s.id);
      await laden();
    } catch {
      setFehler('Speichern hat nicht geklappt.');
    }
  }

  async function fassungSichern() {
    if (!stueckId) return;
    try {
      const s = await versionSichern(stueckId, doc, fassungName);
      setFassungName('');
      setMeldung(`Fassung „${s.versionen![s.versionen!.length - 1].name}“ gesichert.`);
      await laden();
    } catch {
      setFehler('Die Fassung konnte nicht gesichert werden.');
    }
  }

  return (
    <section className="stuecke">
      <div className="stuecke-head">
        <h3>Meine Stücke</h3>
        <div className="json-actions">
          {!stueckId && (
            <button onClick={speichern} disabled={leer}>
              Als Stück speichern
            </button>
          )}
          <button className="secondary" onClick={onNew}>
            Neues Stück
          </button>
        </div>
      </div>
      {fehler && <p className="error">{fehler}</p>}

      {stueckId && aktuell && (
        <div className="fassungen">
          <p className="meta">„{aktuell.titel}“ wird automatisch gespeichert. Sichere wichtige Zwischenstände als Fassung, dann kannst du jederzeit zu ihnen zurück.</p>
          <div className="fassung-neu">
            <input
              type="text"
              value={fassungName}
              placeholder={`Fassung ${(aktuell.versionen?.length ?? 0) + 1}, z. B. „Trio fertig“`}
              onChange={(e) => setFassungName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fassungSichern()}
              aria-label="Name der Fassung"
            />
            <button className="secondary" onClick={fassungSichern}>
              Fassung sichern
            </button>
            <label className="check">
              <input
                type="checkbox"
                checked={!!aktuell.portfolio}
                onChange={async (e) => {
                  await portfolioSetzen(aktuell.id, e.target.checked);
                  await laden();
                }}
              />
              <span>Im Portfolio</span>
            </label>
          </div>
          {meldung && <p className="meta">{meldung}</p>}
          {(aktuell.versionen?.length ?? 0) > 0 && (
            <ol className="fassung-liste" reversed>
              {[...aktuell.versionen!].reverse().map((v) => (
                <li key={v.id}>
                  <strong>{v.name}</strong> <span className="meta">{datum.format(v.zeit)} · {takte(v.doc)} Takte</span>{' '}
                  <button
                    className="secondary small"
                    onClick={async () => {
                      const d = await versionZurueckholen(aktuell.id, v.id, doc);
                      onOpen(d);
                      setMeldung(`„${v.name}“ zurückgeholt. Der vorige Stand ist als eigene Fassung gesichert.`);
                      await laden();
                    }}
                  >
                    Zurückholen
                  </button>{' '}
                  <button className="secondary small" onClick={() => speichereMusicXml(scoreAusDoc(v.doc))} title="Diese Fassung als MusicXML für MuseScore">
                    MuseScore
                  </button>{' '}
                  <button
                    className="link small"
                    onClick={async () => {
                      await versionLoeschen(aktuell.id, v.id);
                      await laden();
                    }}
                    aria-label={`Fassung ${v.name} löschen`}
                  >
                    entfernen
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {liste.length > 0 && (
        <div className="stueck-filter" role="group" aria-label="Filter">
          <button className={`small ${nurPortfolio ? 'secondary' : ''}`} onClick={() => setNurPortfolio(false)} aria-pressed={!nurPortfolio}>
            Alle ({liste.length})
          </button>
          <button className={`small ${nurPortfolio ? '' : 'secondary'}`} onClick={() => setNurPortfolio(true)} aria-pressed={nurPortfolio}>
            ★ Portfolio ({liste.filter((s) => s.portfolio).length})
          </button>
        </div>
      )}
      {sichtbar.length === 0 ? (
        <p className="meta">{nurPortfolio ? 'Noch keine Stücke im Portfolio. Hake bei einem fertigen Stück „Im Portfolio“ an.' : 'Noch keine gespeicherten Stücke.'}</p>
      ) : (
        <ul className="stueck-liste">
          {sichtbar.map((s) => (
            <li key={s.id} className={s.id === stueckId ? 'is-current' : ''}>
              <button
                className="link stueck-titel"
                onClick={() => {
                  setStueckId(s.id);
                  onOpen(s.doc);
                }}
              >
                {s.portfolio ? '★ ' : ''}
                {s.titel}
              </button>
              <span className="meta">
                {besetzungsName(s.doc)} · {takte(s.doc)} Takte{s.versionen?.length ? ` · ${s.versionen.length} ${s.versionen.length === 1 ? 'Fassung' : 'Fassungen'}` : ''} · {datum.format(s.geaendert)}
              </span>
              <button className="secondary small" onClick={() => speichereMusicXml(scoreAusDoc(s.doc))} title="Als MusicXML für MuseScore speichern">
                MuseScore
              </button>
              {loeschen === s.id ? (
                <span className="loeschen-frage">
                  Wirklich löschen?{' '}
                  <button
                    className="secondary small danger"
                    onClick={async () => {
                      await stueckLoeschen(s.id);
                      if (s.id === stueckId) setStueckId(null);
                      setLoeschen(null);
                      await laden();
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
