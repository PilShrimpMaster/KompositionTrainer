import { useEffect, useMemo, useState } from 'react';
import { erledigt } from '../lernpfad/erledigt';
import type { Schreibaufgabe } from '../lernpfad/lektion';
import { pruefe } from '../lernpfad/pruefung';
import type { EditorDoc } from './rebar';

interface Props {
  aufgabe: Schreibaufgabe;
  doc: EditorDoc;
  /** Beginnt ein neues Stück mit den Vorgaben der Aufgabe */
  onBeginnen: () => void;
  onSchliessen: () => void;
  /** Nimmt die gelöste Aufgabe als Stück mit Fassung ins Portfolio auf */
  onPortfolio?: () => Promise<void>;
}

/** Aufgabe aus einer Lektion über dem Editor, mit automatischer Prüfung */
export function AufgabePanel({ aufgabe, doc, onBeginnen, onSchliessen, onPortfolio }: Props) {
  const [geprueft, setGeprueft] = useState(false);
  const [imPortfolio, setImPortfolio] = useState(false);
  const ergebnis = useMemo(() => pruefe(doc, aufgabe.pruefung, { leadsheet: aufgabe.leadsheet }), [doc, aufgabe]);
  const alleOk = ergebnis.length > 0 && ergebnis.every((p) => p.ok);
  const begonnen = doc.title === aufgabe.titel;

  useEffect(() => {
    setGeprueft(false);
    setImPortfolio(false);
  }, [aufgabe]);
  useEffect(() => {
    if (geprueft && alleOk) erledigt(`aufgabe:${aufgabe.id}`);
  }, [geprueft, alleOk, aufgabe.id]);

  return (
    <section className="aufgabe-panel" aria-label="Aufgabe">
      <div className="aufgabe-kopf">
        <strong>Aufgabe: {aufgabe.titel}</strong>
        <button className="secondary small" onClick={onSchliessen} aria-label="Aufgabe schließen">
          ✕
        </button>
      </div>
      <p>{aufgabe.text}</p>
      <div className="json-actions">
        {!begonnen && (
          <button onClick={onBeginnen}>Neu beginnen mit den Vorgaben</button>
        )}
        {aufgabe.pruefung.length > 0 && (
          <button className={begonnen ? '' : 'secondary'} onClick={() => setGeprueft(true)} disabled={doc.events.length === 0 && !doc.satz?.stimmen.some((s) => s.length)}>
            Lösung prüfen
          </button>
        )}
      </div>
      {!begonnen && (
        <p className="meta">Der aktuelle Entwurf wird dabei ersetzt. Stücke unter „Meine Stücke“ bleiben erhalten.</p>
      )}
      {geprueft && (
        <ul className="pruefliste">
          {ergebnis.map((p) => (
            <li key={p.text} className={p.ok ? 'ok' : 'falsch'}>
              {p.ok ? '✓' : '✗'} {p.text}
              {!p.ok && p.hinweis && <span className="meta"> {p.hinweis}</span>}
            </li>
          ))}
        </ul>
      )}
      {geprueft && alleOk && (
        <div className="aufgabe-geschafft">
          <p>Geschafft! Alle Punkte sind erfüllt.</p>
          {onPortfolio && (
            <button
              className="secondary"
              disabled={imPortfolio}
              onClick={async () => {
                await onPortfolio();
                setImPortfolio(true);
              }}
            >
              {imPortfolio ? '★ Im Portfolio gesichert' : '★ Ins Portfolio aufnehmen'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
