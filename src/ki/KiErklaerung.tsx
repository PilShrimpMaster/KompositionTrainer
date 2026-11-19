import { useState } from 'react';
import type { Score } from '../model/types';
import { NotenBeispiel } from '../render/Beispiele';
import { frageClaude, KiFehler } from './client';
import { kiSchluessel, kiZaehler, kostenSchaetzung, setKiSchluessel } from './einstellungen';
import { antwortLesen, type Erklaerung } from './erklaeren';

export interface KiAnfrage {
  text: string;
  /** Satz, auf den sich die Vorschläge beziehen (Tonart, Takt, Tempo); null, wenn keine Noten erwartet werden */
  vorlage: Score | null;
  /** Der Ausschnitt im Original, zum Vergleich */
  original?: Score | null;
}

/** API-Schlüssel eingeben, Zähler und Hinweis aufs Ausgabenlimit */
export function KiEinstellungen({ onFertig }: { onFertig: () => void }) {
  const [wert, setWert] = useState('');
  const vorhanden = kiSchluessel();
  const z = kiZaehler();
  return (
    <div className="ki-einstellungen">
      <p>
        <strong>KI-Einstellungen</strong>
      </p>
      <p className="meta">
        Für „Erklär mir das“ brauchst du einen eigenen API-Schlüssel von Anthropic (
        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
          Console → API Keys
        </a>
        ). Er wird nur in diesem Browser gespeichert und nur an Anthropic geschickt. Lege in der Console unter{' '}
        <a href="https://console.anthropic.com/settings/limits" target="_blank" rel="noreferrer">
          Limits
        </a>{' '}
        ein monatliches Ausgabenlimit fest, dann kann nichts aus dem Ruder laufen.
      </p>
      <form
        className="ki-schluessel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!wert.trim()) return;
          setKiSchluessel(wert);
          setWert('');
          onFertig();
        }}
      >
        <input
          type="password"
          autoComplete="off"
          placeholder={vorhanden ? 'Schlüssel ist gespeichert' : 'sk-ant-…'}
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          aria-label="API-Schlüssel"
        />
        <button type="submit" disabled={!wert.trim()}>
          Speichern
        </button>
        {vorhanden && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setKiSchluessel(null);
              setWert('');
              onFertig();
            }}
          >
            Schlüssel entfernen
          </button>
        )}
      </form>
      <p className="meta">
        Diesen Monat: {z.anfragen} {z.anfragen === 1 ? 'Anfrage' : 'Anfragen'}, etwa {kostenSchaetzung(z).toFixed(2).replace('.', ',')} $.
      </p>
    </div>
  );
}

type Zustand =
  | { art: 'zu' }
  | { art: 'einstellungen' }
  | { art: 'laedt' }
  | { art: 'fehler'; text: string }
  | { art: 'fertig'; ergebnis: Erklaerung; original: Score | null };

/** Knopf „Erklär mir das“ mit Antwort von Claude und hörbaren Korrekturvorschlägen */
export function KiErklaerung({ anfrage, klein = false }: { anfrage: () => KiAnfrage; klein?: boolean }) {
  const [zustand, setZustand] = useState<Zustand>({ art: 'zu' });

  async function fragen() {
    if (!kiSchluessel()) {
      setZustand({ art: 'einstellungen' });
      return;
    }
    setZustand({ art: 'laedt' });
    try {
      const a = anfrage();
      const json = await frageClaude(a.text);
      setZustand({ art: 'fertig', ergebnis: antwortLesen(json, a.vorlage), original: a.original ?? null });
    } catch (e) {
      setZustand({ art: 'fehler', text: e instanceof KiFehler ? e.message : 'Die Antwort konnte nicht gelesen werden. Versuch es noch einmal.' });
    }
  }

  if (zustand.art === 'zu') {
    return (
      <button className={`ki-knopf ${klein ? 'link small' : 'secondary'}`} onClick={fragen}>
        ✨ Erklär mir das
      </button>
    );
  }

  return (
    <div className="ki-erklaerung" aria-live="polite">
      {zustand.art === 'einstellungen' && <KiEinstellungen onFertig={() => (kiSchluessel() ? fragen() : setZustand({ art: 'zu' }))} />}
      {zustand.art === 'laedt' && <p className="meta">Claude denkt nach …</p>}
      {zustand.art === 'fehler' && (
        <>
          <p className="error">{zustand.text}</p>
          <div className="json-actions">
            <button onClick={fragen}>Nochmal versuchen</button>
            <button className="secondary" onClick={() => setZustand({ art: 'einstellungen' })}>
              KI-Einstellungen
            </button>
          </div>
        </>
      )}
      {zustand.art === 'fertig' && (
        <>
          <p className="ki-text">{zustand.ergebnis.erklaerung}</p>
          {zustand.ergebnis.vorschlaege.length > 0 && zustand.original && <NotenBeispiel score={zustand.original} />}
          {zustand.ergebnis.vorschlaege.map((v, i) => (
            <div key={i} className="ki-vorschlag">
              <p>
                <strong>Vorschlag {i + 1}:</strong> {v.beschreibung}
              </p>
              {v.score ? (
                <>
                  <NotenBeispiel score={v.score} />
                  {v.restfehler > 0 && (
                    <p className="meta">
                      Achtung: Die Prüfung findet in diesem Vorschlag noch {v.restfehler} {v.restfehler === 1 ? 'Fehler' : 'Fehler'}. Auch die KI irrt
                      sich manchmal.
                    </p>
                  )}
                </>
              ) : (
                <p className="meta">Die Noten dieses Vorschlags waren nicht lesbar.</p>
              )}
            </div>
          ))}
          <p className="meta">
            Antwort von Claude, kann Fehler enthalten.{' '}
            <button className="link small" onClick={() => setZustand({ art: 'zu' })}>
              Schließen
            </button>{' '}
            <button className="link small" onClick={() => setZustand({ art: 'einstellungen' })}>
              KI-Einstellungen
            </button>
          </p>
        </>
      )}
    </div>
  );
}
