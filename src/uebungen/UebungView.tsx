import { useEffect, useRef, useState } from 'react';
import { initAudio, playChord, playSequence } from '../audio/player';
import { Klavier } from '../editor/Klavier';
import { germanName, spellMidi, toMidi, toToneName } from '../model/pitch';
import { renderNotes } from '../render/renderNotes';
import { diktatRichtig, erzeugeAufgabe, stufeFuer, UEBUNGEN, type Aufgabe, type Stufe, type UebungTyp } from './aufgaben';
import { eintrag } from '../lexikon/lexikon';
import { useNavigation } from '../navigation';
import { ergebnisSpeichern, modulSicherheit } from './fortschritt';
import { ScoreView } from '../ScoreView';

const RUNDE = 10;

interface Props {
  typ: UebungTyp;
  onEnde: () => void;
  /** Wohin „zurück“ führt, z. B. „Lektion“ */
  zurueck?: string;
}

/** Eine Übungsrunde mit 10 Aufgaben, sofortiger Rückmeldung und Fortschritt. */
export function UebungView({ typ, onEnde, zurueck = 'Lernpfad' }: Props) {
  const info = UEBUNGEN.find((u) => u.typ === typ)!;
  const { oeffneLexikon } = useNavigation();
  const [stufe, setStufe] = useState<Stufe | null>(null);
  const [nr, setNr] = useState(0);
  const [aufgabe, setAufgabe] = useState<Aufgabe | null>(null);
  const [antwort, setAntwort] = useState<string | null>(null);
  const [richtigAnzahl, setRichtigAnzahl] = useState(0);
  const [gespielt, setGespielt] = useState<number[]>([]);
  const [audioBereit, setAudioBereit] = useState(false);
  const [klavierTief, setKlavierTief] = useState(60);
  const notenRef = useRef<HTMLDivElement>(null);
  const loesungRef = useRef<HTMLDivElement>(null);

  // Schwierigkeit aus dem bisherigen Fortschritt
  useEffect(() => {
    modulSicherheit(info.modul)
      .catch(() => 0)
      .then((s) => setStufe(stufeFuer(s)));
  }, [info.modul]);

  useEffect(() => {
    if (stufe === null) return;
    neueAufgabe(stufe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stufe]);

  function neueAufgabe(s: Stufe) {
    const a = erzeugeAufgabe(typ, s);
    setAufgabe(a);
    setAntwort(null);
    setGespielt(a.diktat ? [toMidi(a.diktat[0])] : []);
    if (audioBereit && info.hoeren) setTimeout(() => abspielen(a), 300);
  }

  useEffect(() => {
    if (!aufgabe || !notenRef.current) return;
    if (aufgabe.noten) renderNotes(notenRef.current, aufgabe.noten);
    else notenRef.current.innerHTML = '';
  }, [aufgabe]);

  useEffect(() => {
    if (!aufgabe?.diktat || antwort === null || !loesungRef.current) return;
    renderNotes(loesungRef.current, { clef: 'treble', groups: aufgabe.diktat.map((p) => [p]) });
  }, [aufgabe, antwort]);

  async function abspielen(a: Aufgabe | null = aufgabe) {
    if (!a?.klang) return;
    await initAudio();
    setAudioBereit(true);
    const namen = a.klang.toene.map(toToneName);
    if (a.klang.folge) {
      a.klang.folge.forEach((akk, i) => setTimeout(() => playChord(akk.map(toToneName), 1.1), i * 1100));
      return;
    }
    if (a.klang.art === 'zusammen') await playChord(namen);
    else await playSequence(namen, a.typ === 'melodiediktat' ? 0.6 : 0.8);
  }

  async function beantworten(wahl: string) {
    if (!aufgabe || antwort !== null) return;
    const richtig = wahl === aufgabe.loesung;
    setAntwort(wahl);
    if (richtig) setRichtigAnzahl((n) => n + 1);
    if (!info.hoeren && aufgabe.klang) abspielen().catch(() => {});
    await ergebnisSpeichern(info.modul, typ, richtig).catch(() => {});
  }

  async function diktatPruefen() {
    if (!aufgabe?.diktat) return;
    const ok = diktatRichtig(aufgabe.diktat, gespielt).every(Boolean);
    setAntwort(ok ? aufgabe.loesung : 'falsch');
    if (ok) setRichtigAnzahl((n) => n + 1);
    await ergebnisSpeichern(info.modul, typ, ok).catch(() => {});
  }

  function weiter() {
    if (stufe === null) return;
    setNr((n) => n + 1);
    if (nr + 1 < RUNDE) neueAufgabe(stufe);
  }

  if (stufe === null || !aufgabe) return <p className="meta">Übung wird vorbereitet …</p>;

  if (nr >= RUNDE) {
    return (
      <section className="uebung">
        <h2>{info.titel}</h2>
        <p className="ergebnis-gross">
          {richtigAnzahl} von {RUNDE} richtig
        </p>
        <p>{richtigAnzahl >= 9 ? 'Sehr sicher!' : richtigAnzahl >= 7 ? 'Gut, noch eine Runde festigt es.' : 'Übung macht den Meister: gleich noch eine Runde.'}</p>
        <div className="json-actions">
          <button
            onClick={() => {
              setNr(0);
              setRichtigAnzahl(0);
              setStufe(null);
              modulSicherheit(info.modul).then((s) => setStufe(stufeFuer(s)));
            }}
          >
            Noch eine Runde
          </button>
          <button className="secondary" onClick={onEnde}>
            Zurück zu{zurueck === 'Lektion' ? 'r' : 'm'} {zurueck}
          </button>
        </div>
      </section>
    );
  }

  const beantwortet = antwort !== null;
  const richtig = antwort === aufgabe.loesung;
  const diktatErgebnis = aufgabe.diktat && beantwortet ? diktatRichtig(aufgabe.diktat, gespielt) : null;

  return (
    <section className="uebung">
      <div className="uebung-kopf">
        <button className="link" onClick={onEnde}>
          ← {zurueck}
        </button>
        <span className="meta">
          {info.titel} · Aufgabe {nr + 1} von {RUNDE} · Schwierigkeit {stufe}
        </span>
      </div>
      <div className="uebung-balken">
        <div style={{ width: `${(nr / RUNDE) * 100}%` }} />
      </div>

      <h2 className="frage">{aufgabe.frage}</h2>
      <div ref={notenRef} className="uebung-noten" />
      {aufgabe.satz && <ScoreView score={aufgabe.satz} showNoteNames={false} activeId={null} />}
      {info.hoeren && (
        <button className="secondary" onClick={() => abspielen()}>
          {audioBereit ? '🔁 Nochmal anhören' : '▶ Anhören'}
        </button>
      )}

      {aufgabe.diktat ? (
        <div className="diktat">
          <p>
            Gespielt: <strong>{gespielt.map((m) => germanName(spellMidi(m, 0))).join(' ') || '–'}</strong> ({gespielt.length} von{' '}
            {aufgabe.diktat.length})
          </p>
          {!beantwortet && (
            <>
              <Klavier
                lowest={klavierTief}
                octaves={2}
                fifths={0}
                onKey={(m) => {
                  playChord([toToneName(spellMidi(m, 0))], 0.5).catch(() => {});
                  setGespielt((g) => (g.length < aufgabe.diktat!.length ? [...g, m] : g));
                }}
                onShift={(d) => setKlavierTief((l) => Math.max(36, Math.min(72, l + d)))}
              />
              <div className="json-actions">
                <button className="secondary" onClick={() => setGespielt((g) => (g.length > 1 ? g.slice(0, -1) : g))}>
                  Letzten Ton löschen
                </button>
                <button onClick={diktatPruefen} disabled={gespielt.length !== aufgabe.diktat.length}>
                  Prüfen
                </button>
              </div>
            </>
          )}
          {diktatErgebnis && (
            <p>
              {diktatErgebnis.map((ok, i) => (
                <span key={i} className={ok ? 'ok' : 'falsch'}>
                  {ok ? '✓' : '✗'} {germanName(aufgabe.diktat![i])}
                  {!ok && gespielt[i] !== undefined ? ` (gespielt: ${germanName(spellMidi(gespielt[i], 0))})` : ''}{' '}
                </span>
              ))}
            </p>
          )}
          {beantwortet && <div ref={loesungRef} className="uebung-noten" />}
        </div>
      ) : (
        <div className="optionen">
          {aufgabe.optionen.map((o) => {
            const cls = !beantwortet ? '' : o === aufgabe.loesung ? 'ist-richtig' : o === antwort ? 'ist-falsch' : 'ist-aus';
            return (
              <button key={o} className={`option ${cls}`} onClick={() => beantworten(o)} disabled={beantwortet}>
                {o}
              </button>
            );
          })}
        </div>
      )}

      {beantwortet && (
        <div className={`rueckmeldung ${richtig ? 'ok' : 'falsch'}`} role="status">
          <strong>{richtig ? 'Richtig!' : `Leider nicht. Richtig ist: ${aufgabe.loesung}`}</strong>
          <p>{aufgabe.erklaerung}</p>
          <div className="rueckmeldung-knoepfe">
            <button onClick={weiter} autoFocus>
              {nr + 1 < RUNDE ? 'Weiter' : 'Ergebnis ansehen'}
            </button>
            {aufgabe.begriff && eintrag(aufgabe.begriff) && (
              <button className="secondary" onClick={() => oeffneLexikon(aufgabe.begriff)}>
                Im Lexikon: {eintrag(aufgabe.begriff)!.titel}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
