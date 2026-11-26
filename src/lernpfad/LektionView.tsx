import { useEffect, useMemo, useState } from 'react';
import { Markdown } from '../lexikon/Markdown';
import { useNavigation } from '../navigation';
import { AkkordBeispiel, NotenBeispiel } from '../render/Beispiele';
import { UEBUNGEN, type UebungTyp } from '../uebungen/aufgaben';
import { erledigt, istErledigt } from './erledigt';
import type { Baustein, Lektion } from './lektion';
import { QuizView } from './QuizView';
import { BeatBeispiel, SynthBeispiel } from '../produktion/Beispiele';
import { bestanden, quizErgebnis } from './quiz';

interface Props {
  lektion: Lektion;
  onUebung: (typ: UebungTyp) => void;
  /** Praxisteil des Quiz: gemischte Übungsrunde */
  onPraxis: (folge: UebungTyp[]) => void;
  onZurueck: () => void;
}

const schrittKey = (modul: string) => `kt-lektion-schritt-${modul}`;

/** Eine Lektion Schritt für Schritt: Erklären, Hören, Üben, Schreiben, Freie Aufgabe */
export function LektionView({ lektion, onUebung, onPraxis, onZurueck }: Props) {
  // Nach dem letzten Schritt folgt das Quiz, wenn die Lektion Fragen oder Übungen hat
  const hatQuiz = lektion.quiz.length > 0 || lektion.schritte.some((s) => s.bausteine.some((b) => b.art === 'uebungen'));
  const titel = [...lektion.schritte.map((s) => s.titel), ...(hatQuiz ? ['Quiz'] : [])];
  const letzter = lektion.schritte.length - 1;
  const [nr, setNr] = useState(() => {
    try {
      const n = Number(localStorage.getItem(schrittKey(lektion.modul)));
      return n >= 0 && n < titel.length ? n : 0;
    } catch {
      return 0;
    }
  });
  const schritt = nr <= letzter ? lektion.schritte[nr] : undefined;
  const quizStand = quizErgebnis(lektion.modul);
  // Jeder Fachbegriff wird pro Schritt einmal verlinkt
  const schon = useMemo(() => new Set<string>(), [nr]);

  useEffect(() => {
    try {
      localStorage.setItem(schrittKey(lektion.modul), String(nr));
    } catch {
      /* ignorieren */
    }
    if (nr >= letzter) erledigt(`lektion:${lektion.modul}`);
    window.scrollTo({ top: 0 });
  }, [nr, lektion]);

  return (
    <article className="lektion">
      <button className="secondary small zurueck" onClick={onZurueck}>
        ← Lernpfad
      </button>
      <h2>{lektion.titel}</h2>
      {lektion.dauer && <p className="meta">etwa {lektion.dauer}</p>}
      <div className="lektion-fortschritt">
        <div className="balken" role="progressbar" aria-label="Fortschritt in der Lektion" aria-valuenow={nr + 1} aria-valuemin={0} aria-valuemax={titel.length}>
          <div style={{ width: `${((nr + 1) / titel.length) * 100}%` }} />
        </div>
        <span className="meta">
          Schritt {nr + 1} von {titel.length}
        </span>
      </div>
      <ol className="lektion-schritte" aria-label="Schritte">
        {titel.map((t, i) => (
          <li key={t}>
            <button className={i === nr ? 'is-on' : i < nr ? 'is-done' : ''} onClick={() => setNr(i)} aria-current={i === nr}>
              {i + 1}. {t}
              {i > letzter && bestanden(quizStand) ? ' ✓' : ''}
            </button>
          </li>
        ))}
      </ol>

      <section className="lektion-inhalt" key={nr}>
        <h3>{titel[nr]}</h3>
        {schritt ? (
          schritt.bausteine.map((b, i) => <BausteinView key={i} b={b} schon={schon} onUebung={onUebung} />)
        ) : (
          <>
            <p>
              {/^s\d+-abschluss$/.test(lektion.modul)
                ? 'Zum Abschluss der Stufe fragt das Quiz alle Lektionen der Stufe ab, danach übst du alle Übungen der Stufe in einer gemischten Runde.'
                : 'Prüfe, was von dieser Lektion hängen geblieben ist: zuerst Wissensfragen, danach ein Praxisteil mit den Übungen der Lektion.'}
            </p>
            <QuizView lektion={lektion} onPraxis={onPraxis} />
          </>
        )}
      </section>

      <div className="lektion-nav">
        <button className="secondary" onClick={() => setNr(nr - 1)} disabled={nr === 0}>
          ← Zurück
        </button>
        {nr < titel.length - 1 ? (
          <button onClick={() => setNr(nr + 1)}>Weiter: {titel[nr + 1]} →</button>
        ) : (
          <button className={schritt ? '' : 'secondary'} onClick={onZurueck}>
            Lektion abschließen
          </button>
        )}
      </div>
    </article>
  );
}

function BausteinView({ b, schon, onUebung }: { b: Baustein; schon: Set<string>; onUebung: (typ: UebungTyp) => void }) {
  const { schreibeAufgabe } = useNavigation();
  switch (b.art) {
    case 'text':
      return <Markdown text={b.markdown} schon={schon} />;
    case 'noten':
      return <NotenBeispiel score={b.score} analyse={b.analyse} motive={b.motive} form={b.form} harmonien={b.harmonien} merkmale={b.merkmale} />;
    case 'akkorde':
      return <AkkordBeispiel gruppen={b.gruppen} klang={b.klang} schluessel={b.schluessel} tonart={b.tonart} />;
    case 'uebungen':
      return (
        <div className="lektion-uebungen">
          {b.typen.map((t) => {
            const u = UEBUNGEN.find((x) => x.typ === t);
            return u ? (
              <button key={t} onClick={() => onUebung(t)}>
                {u.hoeren ? '🎧 ' : '✎ '}
                {u.titel}
              </button>
            ) : null;
          })}
        </div>
      );
    case 'beat':
      return <BeatBeispiel titel={b.titel} beat={b.beat} />;
    case 'synth':
      return <SynthBeispiel titel={b.titel} vorlage={b.vorlage} noten={b.noten} />;
    case 'aufgabe': {
      const a = b.aufgabe;
      const fertig = istErledigt(`aufgabe:${a.id}`);
      return (
        <div className="aufgabe-karte">
          <strong>
            {fertig ? '✓ ' : ''}
            {a.titel}
          </strong>
          <p>{a.text}</p>
          <button onClick={() => schreibeAufgabe(a)}>
            {a.beat
              ? fertig
                ? 'Noch einmal im Beat-Baukasten bauen'
                : 'Im Beat-Baukasten bauen'
              : a.synth
                ? fertig
                  ? 'Noch einmal im Synth-Labor bauen'
                  : 'Im Synth-Labor bauen'
                : fertig
                  ? 'Noch einmal im Editor schreiben'
                  : 'Im Editor schreiben'}
          </button>
          {a.pruefung.length > 0 && (
            <p className="meta">
              {a.beat ? 'Der Beat-Baukasten' : a.synth ? 'Das Synth-Labor' : 'Der Editor'} prüft deine Lösung auf {a.pruefung.length} Punkte.
            </p>
          )}
        </div>
      );
    }
  }
}
