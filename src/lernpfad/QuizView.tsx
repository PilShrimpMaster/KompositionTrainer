import { useMemo, useState } from 'react';
import type { UebungTyp } from '../uebungen/aufgaben';
import { UEBUNGEN } from '../uebungen/aufgaben';
import { erledigt } from './erledigt';
import type { Lektion } from './lektion';
import { LEKTIONEN } from './lektionen';
import { BESTANDEN, mische, quizErgebnis, quizFuer, quizSpeichern, type QuizFrage } from './quiz';

interface Props {
  lektion: Lektion;
  /** Startet die Praxisrunde mit den Übungen der Lektion */
  onPraxis: (folge: UebungTyp[]) => void;
}

/** Quiz am Ende einer Lektion: Wissensfragen mit Rückmeldung, danach die Praxisrunde */
export function QuizView({ lektion, onPraxis }: Props) {
  const quiz = useMemo(() => quizFuer(lektion, LEKTIONEN), [lektion]);
  const [fragen, setFragen] = useState<QuizFrage[]>(quiz.fragen);
  const [nr, setNr] = useState(0);
  const [gewaehlt, setGewaehlt] = useState<number | null>(null);
  const [falsch, setFalsch] = useState<QuizFrage[]>([]);
  const [wiederholung, setWiederholung] = useState(false);
  const [bisher] = useState(() => quizErgebnis(lektion.modul));
  // Antworten je Frage einmal mischen, damit die richtige nicht immer oben steht
  const reihenfolge = useMemo(() => fragen.map((f) => mische(f.antworten.map((_, i) => i))), [fragen]);

  const anzahl = fragen.length;
  const herkunft = (f: QuizFrage) => (f.modul !== lektion.modul ? LEKTIONEN.find((l) => l.modul === f.modul)?.titel : undefined);

  if (!anzahl && !quiz.praxis.length) return null;

  if (nr >= anzahl) {
    const richtig = anzahl - falsch.length;
    const quote = anzahl ? richtig / anzahl : 1;
    const ok = quote >= BESTANDEN;
    return (
      <div className="quiz">
        {anzahl > 0 && (
          <>
            <p className="ergebnis-gross">
              {richtig} von {anzahl} richtig
            </p>
            <p>
              {wiederholung
                ? falsch.length
                  ? 'Ein paar sitzen noch nicht. Lies die Erklärungen und versuch es gleich noch einmal.'
                  : 'Jetzt sitzt alles.'
                : ok
                  ? 'Bestanden! Du hast das Wichtigste dieser Lektion verstanden.'
                  : `Noch nicht bestanden (ab ${Math.round(BESTANDEN * 100)} %). Schau dir die Schritte zu den falschen Fragen noch einmal an.`}
            </p>
          </>
        )}
        <div className="json-actions">
          {falsch.length > 0 && (
            <button
              onClick={() => {
                setFragen(mische(falsch));
                setFalsch([]);
                setNr(0);
                setGewaehlt(null);
                setWiederholung(true);
              }}
            >
              Falsche Fragen wiederholen ({falsch.length})
            </button>
          )}
          {quiz.praxis.length > 0 && (
            <button className={falsch.length ? 'secondary' : ''} onClick={() => onPraxis(quiz.praxis)}>
              Praxisteil: {quiz.praxis.length} Aufgaben aus {new Set(quiz.praxis).size === 1 ? 'der Übung' : 'den Übungen'}{' '}
              {[...new Set(quiz.praxis)].map((t) => UEBUNGEN.find((u) => u.typ === t)?.titel ?? t).join(', ')}
            </button>
          )}
        </div>
      </div>
    );
  }

  const f = fragen[nr];
  const beantwortet = gewaehlt !== null;
  const stimmt = gewaehlt === f.richtig;

  function waehlen(i: number) {
    if (gewaehlt !== null) return;
    setGewaehlt(i);
    const neuFalsch = i === f.richtig ? falsch : [...falsch, f];
    if (i !== f.richtig) setFalsch(neuFalsch);
    // Ergebnis speichern, sobald die letzte Frage beantwortet ist (Wiederholungen zählen nicht)
    if (nr === anzahl - 1 && !wiederholung) {
      const richtig = anzahl - neuFalsch.length;
      quizSpeichern(lektion.modul, richtig, anzahl);
      if (richtig / anzahl >= BESTANDEN) erledigt(`quiz:${lektion.modul}`);
    }
  }

  return (
    <div className="quiz">
      <div className="uebung-kopf">
        <span className="meta">
          {wiederholung ? 'Wiederholung · ' : ''}Frage {nr + 1} von {anzahl}
          {bisher && !wiederholung ? ` · bisher bestes Ergebnis ${bisher.beste} von ${bisher.von}` : ''}
        </span>
      </div>
      <div className="uebung-balken" role="progressbar" aria-valuenow={nr} aria-valuemin={0} aria-valuemax={anzahl}>
        <div style={{ width: `${(nr / anzahl) * 100}%` }} />
      </div>
      {herkunft(f) && <p className="meta">Aus der Lektion „{herkunft(f)}“</p>}
      <h3 className="frage">{f.frage}</h3>
      <div className="optionen quiz-optionen">
        {reihenfolge[nr].map((i) => {
          const cls = !beantwortet ? '' : i === f.richtig ? 'ist-richtig' : i === gewaehlt ? 'ist-falsch' : 'ist-aus';
          return (
            <button key={i} className={`option ${cls}`} onClick={() => waehlen(i)} disabled={beantwortet}>
              {f.antworten[i]}
            </button>
          );
        })}
      </div>
      {beantwortet && (
        <div className={`rueckmeldung ${stimmt ? 'ok' : 'falsch'}`} role="status">
          <strong>{stimmt ? 'Richtig!' : `Leider nicht. Richtig ist: ${f.antworten[f.richtig]}`}</strong>
          {f.erklaerung && <p>{f.erklaerung}</p>}
          <div className="rueckmeldung-knoepfe">
            <button
              autoFocus
              onClick={() => {
                setNr(nr + 1);
                setGewaehlt(null);
              }}
            >
              {nr + 1 < anzahl ? 'Weiter' : 'Ergebnis ansehen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
