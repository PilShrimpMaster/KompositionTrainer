import { useEffect, useRef, useState } from 'react';
import { initAudio, playChord, playSequence } from '../audio/player';
import { toToneName } from '../model/pitch';
import { renderNotes } from '../render/renderNotes';
import { MODULE } from './module';
import { auswerten, BESTANDEN_AB, einstufungAnwenden, erstelleTest, FRAGEN_JE_MODUL, type ModulErgebnis, type Testfrage } from './einstufung';

const DATUM_KEY = 'kt-einstufung-datum';

export function letzteEinstufung(): string | null {
  try {
    return localStorage.getItem(DATUM_KEY);
  } catch {
    return null;
  }
}

/** Einstufungstest: Bekanntes erkennen und überspringen */
export function EinstufungView({ onEnde }: { onEnde: () => void }) {
  const [fragen, setFragen] = useState<Testfrage[] | null>(null);
  const [antworten, setAntworten] = useState<(string | null)[]>([]);
  const [ergebnis, setErgebnis] = useState<ModulErgebnis[] | null>(null);
  const [audio, setAudio] = useState(false);
  const notenRef = useRef<HTMLDivElement>(null);
  const nr = antworten.length;
  const frage = fragen?.[nr];

  useEffect(() => {
    if (!frage || !notenRef.current) return;
    if (frage.aufgabe.noten) renderNotes(notenRef.current, frage.aufgabe.noten);
    else notenRef.current.innerHTML = '';
    if (frage.hoeren && audio) setTimeout(() => abspielen(frage), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frage]);

  async function abspielen(f: Testfrage | undefined = frage) {
    const k = f?.aufgabe.klang;
    if (!k) return;
    await initAudio();
    setAudio(true);
    const namen = k.toene.map(toToneName);
    if (k.art === 'zusammen') await playChord(namen);
    else await playSequence(namen, 0.8);
  }

  async function antworten_(wahl: string | null) {
    if (!fragen) return;
    const neu = [...antworten, wahl];
    setAntworten(neu);
    if (neu.length === fragen.length) {
      const e = auswerten(fragen, neu);
      setErgebnis(e);
      await einstufungAnwenden(e).catch(() => {});
      try {
        localStorage.setItem(DATUM_KEY, new Date().toLocaleDateString('de-DE'));
      } catch {
        /* ignorieren */
      }
    }
  }

  if (!fragen) {
    const anzahl = 6 * FRAGEN_JE_MODUL;
    return (
      <section className="uebung einstufung">
        <button className="link" onClick={onEnde}>
          ← Lernpfad
        </button>
        <h2>Einstufungstest Stufe 1</h2>
        <p>
          Du kannst schon Noten lesen und kennst Grundlagen der Harmonik? Dann musst du nicht bei null anfangen. Der Test stellt
          zu jedem Modul der Stufe 1 {FRAGEN_JE_MODUL} Fragen, insgesamt {anzahl}, zum Lesen und zum Hören. Er dauert etwa 10
          Minuten.
        </p>
        <p>
          Hast du in einem Modul mindestens {BESTANDEN_AB} von {FRAGEN_JE_MODUL} richtig, wird es als „übersprungen“ markiert.
          Du kannst es trotzdem jederzeit öffnen und üben. Rate nicht: „Weiß ich nicht“ ist eine gute Antwort, damit du dort
          einsteigst, wo es für dich sinnvoll ist. Der Test lässt sich jederzeit wiederholen.
        </p>
        <p className="meta">Für die Hörfragen am besten Kopfhörer benutzen und den Ton am iPad einschalten.</p>
        <button
          onClick={() => {
            setFragen(erstelleTest());
            setAntworten([]);
            setErgebnis(null);
            initAudio().then(() => setAudio(true)).catch(() => {});
          }}
        >
          Test starten
        </button>
      </section>
    );
  }

  if (ergebnis) {
    const bestanden = ergebnis.filter((e) => e.bestanden);
    return (
      <section className="uebung einstufung">
        <h2>Dein Ergebnis</h2>
        <ul className="einstufung-ergebnis">
          {ergebnis.map((e) => (
            <li key={e.modul} className={e.bestanden ? 'ok' : ''}>
              <span>{e.titel}</span>
              <span>
                {e.richtig} von {e.gesamt} {e.bestanden ? '✓ übersprungen' : ''}
              </span>
            </li>
          ))}
        </ul>
        <p>
          {bestanden.length === ergebnis.length
            ? 'Du beherrschst Stufe 1 schon sicher. Schau dir trotzdem das Abschlussprojekt an, dort schreibst du deine erste eigene Melodie.'
            : bestanden.length === 0
              ? 'Am besten startest du mit dem ersten Modul. Die Lektionen bauen aufeinander auf.'
              : `Am besten startest du mit „${ergebnis.find((e) => !e.bestanden)!.titel}“. Die übersprungenen Module kannst du jederzeit wiederholen.`}
        </p>
        <button onClick={onEnde}>Zum Lernpfad</button>
      </section>
    );
  }

  const a = frage!.aufgabe;
  return (
    <section className="uebung einstufung">
      <div className="uebung-kopf">
        <button className="link" onClick={onEnde}>
          ← Abbrechen
        </button>
        <span className="meta">
          {MODULE.find((m) => m.id === frage!.modul)?.titel} · Frage {nr + 1} von {fragen.length}
        </span>
      </div>
      <div className="uebung-balken">
        <div style={{ width: `${(nr / fragen.length) * 100}%` }} />
      </div>
      <h2 className="frage">{a.frage}</h2>
      <div ref={notenRef} className="uebung-noten" />
      {frage!.hoeren && (
        <button className="secondary" onClick={() => abspielen()}>
          {audio ? '🔁 Nochmal anhören' : '▶ Anhören'}
        </button>
      )}
      <div className="optionen">
        {a.optionen.map((o) => (
          <button key={o} className="option" onClick={() => antworten_(o)}>
            {o}
          </button>
        ))}
      </div>
      <button className="link" onClick={() => antworten_(null)}>
        Weiß ich nicht
      </button>
    </section>
  );
}
