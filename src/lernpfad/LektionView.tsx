import { useEffect, useMemo, useState } from 'react';
import { Markdown } from '../lexikon/Markdown';
import { useNavigation } from '../navigation';
import { AkkordBeispiel, NotenBeispiel } from '../render/Beispiele';
import { UEBUNGEN, type UebungTyp } from '../uebungen/aufgaben';
import { erledigt, istErledigt } from './erledigt';
import type { Baustein, Lektion } from './lektion';

interface Props {
  lektion: Lektion;
  onUebung: (typ: UebungTyp) => void;
  onZurueck: () => void;
}

const schrittKey = (modul: string) => `kt-lektion-schritt-${modul}`;

/** Eine Lektion Schritt für Schritt: Erklären, Hören, Üben, Schreiben, Freie Aufgabe */
export function LektionView({ lektion, onUebung, onZurueck }: Props) {
  const [nr, setNr] = useState(() => {
    try {
      const n = Number(localStorage.getItem(schrittKey(lektion.modul)));
      return n >= 0 && n < lektion.schritte.length ? n : 0;
    } catch {
      return 0;
    }
  });
  const schritt = lektion.schritte[nr];
  // Jeder Fachbegriff wird pro Schritt einmal verlinkt
  const schon = useMemo(() => new Set<string>(), [nr]);

  useEffect(() => {
    try {
      localStorage.setItem(schrittKey(lektion.modul), String(nr));
    } catch {
      /* ignorieren */
    }
    if (nr === lektion.schritte.length - 1) erledigt(`lektion:${lektion.modul}`);
    window.scrollTo({ top: 0 });
  }, [nr, lektion]);

  return (
    <article className="lektion">
      <button className="secondary small zurueck" onClick={onZurueck}>
        ← Lernpfad
      </button>
      <h2>{lektion.titel}</h2>
      {lektion.dauer && <p className="meta">etwa {lektion.dauer}</p>}
      <ol className="lektion-schritte" aria-label="Schritte">
        {lektion.schritte.map((s, i) => (
          <li key={s.titel}>
            <button className={i === nr ? 'is-on' : i < nr ? 'is-done' : ''} onClick={() => setNr(i)} aria-current={i === nr}>
              {i + 1}. {s.titel}
            </button>
          </li>
        ))}
      </ol>

      <section className="lektion-inhalt" key={nr}>
        <h3>{schritt.titel}</h3>
        {schritt.bausteine.map((b, i) => (
          <BausteinView key={i} b={b} schon={schon} onUebung={onUebung} />
        ))}
      </section>

      <div className="lektion-nav">
        <button className="secondary" onClick={() => setNr(nr - 1)} disabled={nr === 0}>
          ← Zurück
        </button>
        {nr < lektion.schritte.length - 1 ? (
          <button onClick={() => setNr(nr + 1)}>Weiter: {lektion.schritte[nr + 1].titel} →</button>
        ) : (
          <button onClick={onZurueck}>Lektion abschließen</button>
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
      return <NotenBeispiel score={b.score} analyse={b.analyse} />;
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
          <button onClick={() => schreibeAufgabe(a)}>{fertig ? 'Noch einmal im Editor schreiben' : 'Im Editor schreiben'}</button>
          {a.pruefung.length > 0 && <p className="meta">Der Editor prüft deine Lösung auf {a.pruefung.length} Punkte.</p>}
        </div>
      );
    }
  }
}
