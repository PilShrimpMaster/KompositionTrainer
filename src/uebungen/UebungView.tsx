import { useEffect, useMemo, useRef, useState } from 'react';
import { initAudio, play, playChord, playSequence } from '../audio/player';
import { taktText } from './analyse';
import { Klavier } from '../editor/Klavier';
import { germanName, spellMidi, toMidi, toToneName } from '../model/pitch';
import { renderNotes } from '../render/renderNotes';
import { diktatRichtig, erzeugeAufgabe, stufeFuer, UEBUNGEN, type Aufgabe, type Stufe, type UebungTyp } from './aufgaben';
import { eintrag } from '../lexikon/lexikon';
import { useNavigation } from '../navigation';
import { ergebnisSpeichern, modulSicherheit } from './fortschritt';
import { ScoreView } from '../ScoreView';
import { uebungAnfrage } from '../ki/erklaeren';
import { KiErklaerung } from '../ki/KiErklaerung';

const RUNDE = 10;

interface Props {
  /** Eine Übung, 10 Aufgaben lang … */
  typ?: UebungTyp;
  /** … oder eine gemischte Runde (z. B. die tägliche Wiederholung): eine Aufgabe je Eintrag */
  folge?: UebungTyp[];
  titel?: string;
  onEnde: () => void;
  /** Wohin „zurück“ führt, z. B. „Lektion“ */
  zurueck?: string;
}

/** Eine Übungsrunde mit sofortiger Rückmeldung und Fortschritt. */
export function UebungView({ typ, folge, titel, onEnde, zurueck = 'Lernpfad' }: Props) {
  const [plan] = useState<UebungTyp[]>(() => folge ?? Array<UebungTyp>(RUNDE).fill(typ!));
  const runde = plan.length;
  const { oeffneLexikon } = useNavigation();
  const [stufen, setStufen] = useState<Map<string, Stufe> | null>(null);
  const [nr, setNr] = useState(0);
  const [aufgabe, setAufgabe] = useState<Aufgabe | null>(null);
  const [antwort, setAntwort] = useState<string | null>(null);
  const [richtigAnzahl, setRichtigAnzahl] = useState(0);
  const [gespielt, setGespielt] = useState<number[]>([]);
  const [audioBereit, setAudioBereit] = useState(false);
  const [klavierTief, setKlavierTief] = useState(60);
  const [markiert, setMarkiert] = useState<number[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);
  const notenRef = useRef<HTMLDivElement>(null);
  const loesungRef = useRef<HTMLDivElement>(null);

  const info = UEBUNGEN.find((u) => u.typ === plan[Math.min(nr, runde - 1)])!;
  const stufe = stufen?.get(info.modul) ?? null;

  // Analyse: markierte Takte im Notenbild, nach dem Prüfen richtig (grün) und falsch (rot)
  const taktMarken = useMemo(() => {
    if (!aufgabe?.markieren || !aufgabe.satz) return undefined;
    const m = new Map<string, string>();
    const fertig = antwort !== null;
    aufgabe.satz.voices.forEach((v, vi) =>
      v.measures.forEach((takt, mi) =>
        takt.notes.forEach((_, ni) => {
          const id = `${vi}-${mi}-${ni}`;
          const gewaehlt = markiert.includes(mi);
          const soll = aufgabe.markieren!.includes(mi);
          if (fertig && soll) m.set(id, 'is-loesung');
          else if (fertig && gewaehlt) m.set(id, 'is-fehler');
          else if (gewaehlt) m.set(id, 'is-auswahl');
        }),
      ),
    );
    return m;
  }, [aufgabe, markiert, antwort]);

  // Schwierigkeit je Modul aus dem bisherigen Fortschritt
  async function stufenLaden() {
    const module = [...new Set(plan.map((t) => UEBUNGEN.find((u) => u.typ === t)!.modul))];
    const werte = await Promise.all(module.map((m) => modulSicherheit(m).catch(() => 0)));
    setStufen(new Map(module.map((m, i) => [m, stufeFuer(werte[i])])));
  }

  useEffect(() => {
    stufenLaden();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stufen === null) return;
    neueAufgabe(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stufen]);

  function neueAufgabe(i: number) {
    const t = plan[i];
    const u = UEBUNGEN.find((x) => x.typ === t)!;
    const a = erzeugeAufgabe(t, stufen?.get(u.modul) ?? 1);
    stopRef.current?.();
    setAufgabe(a);
    setAntwort(null);
    setMarkiert([]);
    setGespielt(a.diktat ? [toMidi(a.diktat[0])] : []);
    if (audioBereit && u.hoeren) setTimeout(() => abspielen(a), 300);
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
    await ergebnisSpeichern(info.modul, info.typ, richtig).catch(() => {});
  }

  async function markierungPruefen() {
    if (!aufgabe?.markieren) return;
    const soll = [...aufgabe.markieren].sort((a, b) => a - b).join(',');
    const ok = [...markiert].sort((a, b) => a - b).join(',') === soll;
    setAntwort(ok ? aufgabe.loesung : markiert.length ? taktText(markiert) : '–');
    if (ok) setRichtigAnzahl((n) => n + 1);
    await ergebnisSpeichern(info.modul, info.typ, ok).catch(() => {});
  }

  async function satzAbspielen() {
    if (!aufgabe?.satz) return;
    stopRef.current?.();
    await initAudio();
    setAudioBereit(true);
    stopRef.current = await play(aufgabe.satz, aufgabe.satz.tempo, { onEvent: () => {}, onEnd: () => (stopRef.current = null) });
  }

  async function diktatPruefen() {
    if (!aufgabe?.diktat) return;
    const ok = diktatRichtig(aufgabe.diktat, gespielt).every(Boolean);
    setAntwort(ok ? aufgabe.loesung : 'falsch');
    if (ok) setRichtigAnzahl((n) => n + 1);
    await ergebnisSpeichern(info.modul, info.typ, ok).catch(() => {});
  }

  function weiter() {
    if (stufen === null) return;
    setNr((n) => n + 1);
    if (nr + 1 < runde) neueAufgabe(nr + 1);
  }

  if (stufe === null || !aufgabe) return <p className="meta">Übung wird vorbereitet …</p>;

  if (nr >= runde) {
    const quote = richtigAnzahl / runde;
    return (
      <section className="uebung">
        <h2>{titel ?? info.titel}</h2>
        <p className="ergebnis-gross">
          {richtigAnzahl} von {runde} richtig
        </p>
        <p>{quote >= 0.9 ? 'Sehr sicher!' : quote >= 0.7 ? 'Gut, noch eine Runde festigt es.' : 'Übung macht den Meister: gleich noch eine Runde.'}</p>
        <div className="json-actions">
          {!folge && (
            <button
              onClick={() => {
                setNr(0);
                setRichtigAnzahl(0);
                setStufen(null);
                stufenLaden();
              }}
            >
              Noch eine Runde
            </button>
          )}
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
          {titel ? `${titel}: ${info.titel}` : info.titel} · Aufgabe {nr + 1} von {runde} · Schwierigkeit {stufe}
        </span>
      </div>
      <div className="uebung-balken">
        <div style={{ width: `${(nr / runde) * 100}%` }} />
      </div>

      <h2 className="frage">{aufgabe.frage}</h2>
      <div ref={notenRef} className="uebung-noten" />
      {aufgabe.satz && (
        <ScoreView
          score={aufgabe.satz}
          showNoteNames={false}
          activeId={null}
          markierungen={taktMarken}
          onNoteClick={
            aufgabe.markieren && antwort === null
              ? (id) => {
                  const t = Number(id.split('-')[1]);
                  setMarkiert((m) => (m.includes(t) ? m.filter((x) => x !== t) : [...m, t]));
                }
              : undefined
          }
        />
      )}
      {info.hoeren && (
        <button className="secondary" onClick={() => abspielen()}>
          {audioBereit ? '🔁 Nochmal anhören' : '▶ Anhören'}
        </button>
      )}

      {aufgabe.markieren ? (
        <div className="markieren">
          <p>
            Tippe auf eine Note, um ihren Takt zu markieren; nochmal tippen hebt die Markierung auf. Markiert:{' '}
            <strong>{markiert.length ? taktText(markiert) : '–'}</strong>
          </p>
          <div className="json-actions">
            <button className="secondary" onClick={satzAbspielen}>
              ▶ Ausschnitt anhören
            </button>
            {antwort === null && (
              <button onClick={markierungPruefen} disabled={markiert.length === 0}>
                Prüfen
              </button>
            )}
          </div>
        </div>
      ) : aufgabe.diktat ? (
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
              {nr + 1 < runde ? 'Weiter' : 'Ergebnis ansehen'}
            </button>
            {aufgabe.begriff && eintrag(aufgabe.begriff) && (
              <button className="secondary" onClick={() => oeffneLexikon(aufgabe.begriff)}>
                Im Lexikon: {eintrag(aufgabe.begriff)!.titel}
              </button>
            )}
          </div>
          <KiErklaerung
            key={`${nr}`}
            anfrage={() => ({ text: uebungAnfrage(aufgabe, antwort === 'falsch' ? gespielt.map((m) => germanName(spellMidi(m, 0))).join(' ') : antwort), vorlage: aufgabe.satz ?? null })}
          />
        </div>
      )}
    </section>
  );
}
