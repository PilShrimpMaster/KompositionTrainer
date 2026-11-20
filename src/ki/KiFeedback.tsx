import { useState } from 'react';
import type { Score } from '../model/types';
import type { Befund } from '../satz/regeln';
import { frageClaude, KiFehler } from './client';
import { kiSchluessel } from './einstellungen';
import { FEEDBACK_SCHEMA, FEEDBACK_SYSTEM, feedbackAnfrage, feedbackLesen, FOKUS, type Feedback, type Fokus } from './feedback';
import { KiEinstellungen } from './KiErklaerung';
import { NotenBeispiel } from '../render/Beispiele';

interface Props {
  score: Score;
  besetzung: string;
  befunde: Befund[];
  aufgabe?: string;
}

type Zustand = { art: 'zu' } | { art: 'einstellungen' } | { art: 'laedt' } | { art: 'fehler'; text: string } | { art: 'fertig'; feedback: Feedback };

/** „Feedback zu meinem Stück“: Claude als Kompositionslehrer */
export function KiFeedback({ score, besetzung, befunde, aufgabe }: Props) {
  const [zustand, setZustand] = useState<Zustand>({ art: 'zu' });
  const [fokus, setFokus] = useState<Fokus>('allgemein');

  async function fragen() {
    if (!kiSchluessel()) {
      setZustand({ art: 'einstellungen' });
      return;
    }
    setZustand({ art: 'laedt' });
    try {
      const json = await frageClaude(feedbackAnfrage(score, { besetzung, befunde, aufgabe, fokus }), { system: FEEDBACK_SYSTEM, schema: FEEDBACK_SCHEMA });
      setZustand({ art: 'fertig', feedback: feedbackLesen(json, score) });
    } catch (e) {
      setZustand({ art: 'fehler', text: e instanceof KiFehler ? e.message : 'Die Antwort konnte nicht gelesen werden. Versuch es noch einmal.' });
    }
  }

  return (
    <section className="pruef-panel ki-feedback" aria-label="Feedback zum Stück">
      <div className="pruef-kopf">
        <strong>✨ Feedback zu deinem Stück</strong>
      </div>
      <p className="meta">Claude hört sich das ganze Stück an, mit der Analyse der App, und antwortet wie ein Lehrer: was gelingt, was am meisten bringt, und was du als Nächstes übst.</p>
      <div className="fassung-neu">
        <label className="field">
          <span>Schwerpunkt</span>
          <select value={fokus} onChange={(e) => setFokus(e.target.value as Fokus)}>
            {(Object.keys(FOKUS) as Fokus[]).map((f) => (
              <option key={f} value={f}>
                {FOKUS[f]}
              </option>
            ))}
          </select>
        </label>
        <button onClick={fragen} disabled={zustand.art === 'laedt'}>
          {zustand.art === 'fertig' ? 'Neu fragen' : 'Feedback holen'}
        </button>
      </div>
      {zustand.art === 'einstellungen' && <KiEinstellungen onFertig={() => (kiSchluessel() ? fragen() : setZustand({ art: 'zu' }))} />}
      {zustand.art === 'laedt' && <p className="meta">Claude hört zu …</p>}
      {zustand.art === 'fehler' && <p className="error">{zustand.text}</p>}
      {zustand.art === 'fertig' && (
        <div className="ki-erklaerung" aria-live="polite">
          {zustand.feedback.einordnung && <p className="ki-text">{zustand.feedback.einordnung}</p>}
          {zustand.feedback.staerken.length > 0 && (
            <>
              <p>
                <strong>Was gelingt</strong>
              </p>
              <ul>
                {zustand.feedback.staerken.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {zustand.feedback.verbesserungen.length > 0 && (
            <>
              <p>
                <strong>Was am meisten bringt</strong>
              </p>
              <ol>
                {zustand.feedback.verbesserungen.map((v, i) => (
                  <li key={i}>
                    {v.takte && <strong>{v.takte}: </strong>}
                    {v.beobachtung} <em>{v.vorschlag}</em>
                    {v.beispiel && <NotenBeispiel score={v.beispiel} />}
                  </li>
                ))}
              </ol>
            </>
          )}
          {zustand.feedback.naechsterSchritt && (
            <p>
              <strong>Nächster Schritt:</strong> {zustand.feedback.naechsterSchritt}
            </p>
          )}
          <p className="meta">Antwort von Claude, kann Fehler enthalten. Dein Ohr hat das letzte Wort.</p>
        </div>
      )}
    </section>
  );
}
