import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { initAudio, play, playNote } from '../audio/player';
import { germanKeyName, germanName, toToneName } from '../model/pitch';
import type { DurationType, Pitch } from '../model/types';
import { validateScore } from '../model/validate';
import { EditorScore } from './EditorScore';
import { Klavier } from './Klavier';
import type { Schreibaufgabe } from '../lernpfad/lektion';
import { AufgabePanel } from './AufgabePanel';
import { docFromScore, rebar, type EditorDoc } from './rebar';
import { alsSatz, rebarSatz, STIMMEN, type SatzRebar } from './satzdoc';
import { markierungenFuer, PruefPanel, usePruefung } from '../satz/PruefPanel';
import { SHORTCUT_HELP, shortcutFor } from './shortcuts';
import { editorReducer, emptyDoc, initialState, type EditorAction } from './state';
import { spellMidi } from '../model/pitch';
import { MidiPanel } from '../midi/MidiPanel';
import { useMidi } from '../midi/useMidi';
import { StueckePanel } from '../speicher/StueckePanel';
import { stueckSpeichern } from '../speicher/db';

const STORAGE_KEY = 'kt-editor-entwurf-v1';
const STUECK_KEY = 'kt-editor-stueck-id';
const MITSPIELEN_KEY = 'kt-midi-mitspielen';
const PRUEFEN_KEY = 'kt-editor-pruefen';
/** Unterste Taste des Bildschirmklaviers je Stimme */
const KLAVIER_TIEF = [60, 60, 48, 36];

function lesen(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function schreiben(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignorieren */
  }
}

const DURATIONS: { type: DurationType; label: string; glyph: string; key: string }[] = [
  { type: 'whole', label: 'Ganze', glyph: '𝅝', key: '6' },
  { type: 'half', label: 'Halbe', glyph: '𝅗𝅥', key: '5' },
  { type: 'quarter', label: 'Viertel', glyph: '♩', key: '4' },
  { type: 'eighth', label: 'Achtel', glyph: '♪', key: '3' },
  { type: '16th', label: 'Sechzehntel', glyph: '𝅘𝅥𝅯', key: '2' },
];

const TIMES = ['2/4', '3/4', '4/4', '2/2', '3/8', '6/8', '9/8', '12/8'];

function loadDraft(): EditorDoc {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const doc = JSON.parse(raw) as EditorDoc;
      if (Array.isArray(doc.events) && doc.time && doc.key) return doc;
    }
  } catch {
    /* kein Speicher verfügbar, z. B. im privaten Modus */
  }
  return emptyDoc();
}

function fmtQuarters(q: number) {
  const names: [number, string][] = [
    [4, 'eine Ganze'],
    [3, 'eine punktierte Halbe'],
    [2, 'eine Halbe'],
    [1.5, 'eine punktierte Viertel'],
    [1, 'eine Viertel'],
    [0.5, 'eine Achtel'],
    [0.25, 'eine Sechzehntel'],
  ];
  const exact = names.find(([v]) => Math.abs(v - q) < 1e-9);
  if (exact) return exact[1];
  return `${q.toLocaleString('de-DE')} Viertel`;
}

interface Props {
  aufgabe?: Schreibaufgabe | null;
  onAufgabeSchliessen?: () => void;
}

export function EditorView({ aufgabe, onAufgabeSchliessen }: Props = {}) {
  const [state, dispatch] = useReducer(editorReducer, undefined, () => initialState(loadDraft()));
  const { doc, selected } = state;
  const [showNames, setShowNames] = useState(true);
  const [fingerWrites, setFingerWrites] = useState(false);
  const [showPiano, setShowPiano] = useState(true);
  const [pianoLow, setPianoLow] = useState(doc.clef === 'bass' ? 48 : 60);
  const [pianoDown, setPianoDown] = useState<number[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stueckId, setStueckIdState] = useState<string | null>(() => lesen(STUECK_KEY));
  const [saveVersion, setSaveVersion] = useState(0);
  const [mitspielen, setMitspielenState] = useState(() => lesen(MITSPIELEN_KEY) !== 'nein');

  function setStueckId(id: string | null) {
    setStueckIdState(id);
    schreiben(STUECK_KEY, id);
  }
  function setMitspielen(v: boolean) {
    setMitspielenState(v);
    schreiben(MITSPIELEN_KEY, v ? 'ja' : 'nein');
  }

  const midi = useMidi((notes) => {
    if (doc.satz && notes.length > 1) {
      const pitches = notes.map((n) => spellMidi(n.midi, doc.key.fifths));
      if (mitspielen) notes.forEach((n) => playNote(toToneName(spellMidi(n.midi, doc.key.fifths)), 0.5, n.velocity / 127).catch(() => {}));
      dispatch({ type: 'insertChord', pitches });
      if (notes.length !== 4) setNotice(`Akkord mit ${notes.length} Tönen von oben auf die Stimmen verteilt. Für alle vier Stimmen spiel vier Töne gleichzeitig.`);
      return;
    }
    const top = notes[notes.length - 1];
    const pitch = spellMidi(top.midi, doc.key.fifths);
    const event = { pitch, duration: inputDuration(), velocity: top.velocity };
    if (mitspielen) notes.forEach((n) => playNote(toToneName(spellMidi(n.midi, doc.key.fifths)), 0.5, n.velocity / 127).catch(() => {}));
    dispatch({ type: 'insert', event });
    if (notes.length > 1) {
      setNotice(
        `Akkord erkannt: ${notes.map((n) => germanName(spellMidi(n.midi, doc.key.fifths))).join('–')}. Im einstimmigen Editor wird nur der oberste Ton übernommen.`,
      );
    }
  });

  const [stumm, setStumm] = useState<boolean[]>([false, false, false, false]);
  const [pruefen, setPruefenState] = useState(() => lesen(PRUEFEN_KEY) === 'ja');
  const [auswahl, setAuswahl] = useState<number | null>(null);
  function setPruefen(v: boolean) {
    setPruefenState(v);
    setAuswahl(null);
    schreiben(PRUEFEN_KEY, v ? 'ja' : 'nein');
  }
  const bar = useMemo(() => (doc.satz ? rebarSatz(doc) : rebar(doc)), [doc]);
  const stimmeVon = doc.satz ? (bar as SatzRebar).stimmeVon : null;
  const aktiv = doc.satz?.aktiv ?? 0;
  const pruefung = usePruefung(bar.score);
  const markierungen = useMemo(
    () => (doc.satz && pruefen ? markierungenFuer(pruefung.befunde, auswahl) : undefined),
    [doc.satz, pruefen, pruefung.befunde, auswahl],
  );
  useEffect(() => setAuswahl(null), [doc]);
  useEffect(() => {
    if (doc.satz) setPianoLow(KLAVIER_TIEF[aktiv]);
  }, [aktiv, doc.satz]);
  const selectedIds = selected === null ? [] : (bar.partsOf.get(selected) ?? []);
  const selectedEvent = selected === null ? null : doc.events[selected];

  // Entwurf automatisch im Browser sichern
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    } catch {
      /* ignorieren */
    }
  }, [doc]);

  useEffect(() => () => stopRef.current?.(), []);

  // Gespeicherte Stücke automatisch aktualisieren (kurz nach der letzten Änderung)
  useEffect(() => {
    if (!stueckId) return;
    const t = setTimeout(() => {
      stueckSpeichern(doc, stueckId)
        .then(() => setSaveVersion((v) => v + 1))
        .catch(() => setNotice('Automatisches Speichern hat nicht geklappt.'));
    }, 800);
    return () => clearTimeout(t);
  }, [doc, stueckId]);

  /** Aktion ausführen und gesetzte oder geänderte Note kurz anspielen */
  function act(action: EditorAction, sound?: Pitch) {
    dispatch(action);
    if (sound) playNote(toToneName(sound), 0.5).catch(() => setNotice('Ton konnte nicht gestartet werden.'));
  }

  function inputDuration() {
    return state.inputDots ? { type: state.inputDuration, dots: state.inputDots } : { type: state.inputDuration };
  }

  async function togglePlay() {
    if (playing) {
      stopRef.current?.();
      return;
    }
    if (doc.events.length === 0) {
      setNotice('Noch keine Noten zum Abspielen.');
      return;
    }
    try {
      await initAudio();
      setPlaying(true);
      const klingend = doc.satz && stumm.some(Boolean) ? rebarSatz(doc, stumm).score : bar.score;
      stopRef.current = await play(klingend, doc.tempo, {
        onEvent: setActiveId,
        onEnd: () => {
          setPlaying(false);
          setActiveId(null);
          stopRef.current = null;
        },
      });
    } catch {
      setPlaying(false);
      setNotice('Der Klang konnte nicht gestartet werden.');
    }
  }

  // Tastenkürzel
  const kbdRef = useRef({ state, togglePlay, act });
  kbdRef.current = { state, togglePlay, act };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      const { state: s, togglePlay: tp, act: a } = kbdRef.current;
      if (e.key === 'Tab' && s.doc.satz && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        a({ type: 'setAktiv', stimme: (s.doc.satz.aktiv + (e.shiftKey ? 3 : 1)) % 4 });
        return;
      }
      const ref =
        (s.selected !== null ? s.doc.events[s.selected]?.pitch : null) ??
        [...s.doc.events].reverse().find((ev) => ev.pitch)?.pitch ??
        null;
      const res = shortcutFor(e, {
        refPitch: ref,
        fifths: s.doc.key.fifths,
        clef: s.doc.clef,
        inputDuration: s.inputDuration,
        inputDots: s.inputDots,
      });
      if (!res) return;
      e.preventDefault();
      if (res.type === 'play') return void tp();
      const sound = res.type === 'insert' ? res.event.pitch : undefined;
      a(res, sound);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onPianoKey(midi: number) {
    const pitch = spellMidi(midi, doc.key.fifths);
    setPianoDown([midi]);
    setTimeout(() => setPianoDown((d) => d.filter((m) => m !== midi)), 250);
    act({ type: 'insert', event: { pitch, duration: inputDuration() } }, pitch);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(bar.score, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'melodie'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importJson(file: File) {
    try {
      const result = validateScore(JSON.parse(await file.text()));
      if (!result.score) {
        setNotice(`Datei nicht übernommen: ${result.errors[0]}`);
        return;
      }
      setStueckId(null); // geöffnete Datei überschreibt kein gespeichertes Stück
      act({ type: 'load', doc: docFromScore(result.score) });
      setNotice(`„${result.score.title}“ geöffnet.`);
    } catch {
      setNotice('Die Datei ist kein gültiges JSON.');
    }
  }

  const status = (() => {
    if (doc.events.length === 0 && doc.satz) return `${STIMMEN[aktiv].name}: noch leer. Tippe ins ${aktiv < 2 ? 'obere' : 'untere'} System, spiel auf dem Klavier oder wechsle die Stimme mit Tab.`;
    if (doc.events.length === 0) return 'Tippe mit dem Apple Pencil (oder der Maus) ins Notensystem, spiel auf dem Klavier oder tippe Buchstaben wie c, d, e.';
    const parts: string[] = [];
    if (selectedEvent) {
      parts.push(
        selectedEvent.pitch
          ? `Ausgewählt: ${germanName(selectedEvent.pitch)} (Note ${selected! + 1})`
          : `Ausgewählt: Pause (Note ${selected! + 1})`,
      );
    }
    if (doc.satz) parts.unshift(STIMMEN[aktiv].name);
    if (bar.missing > 0) parts.push(`Im letzten Takt fehlt noch ${fmtQuarters(bar.missing)}.`);
    else parts.push(`${bar.score.voices[0].measures.length} volle Takte.`);
    return parts.join(' · ');
  })();

  function aufgabeBeginnen(a: Schreibaufgabe) {
    setStueckId(null);
    const basis = { ...emptyDoc(), title: a.titel, key: a.tonart ?? doc.key, time: a.takt ?? doc.time, clef: a.schluessel ?? doc.clef };
    if (a.vorgabe) {
      // Vierstimmiger Satz: Vorgaben übernehmen, die erste leere Stimme wird bearbeitet
      const stimmen = a.vorgabe.map((st) => structuredClone(st));
      const aktiv = Math.max(0, stimmen.findIndex((st) => st.length === 0));
      act({ type: 'load', doc: { ...basis, clef: STIMMEN[aktiv].clef, events: stimmen[aktiv], satz: { stimmen, aktiv, text: a.liedtext } } });
      setPianoLow(STIMMEN[aktiv].clef === 'bass' ? 48 : 60);
      return;
    }
    act({ type: 'load', doc: basis });
    if (a.schluessel) setPianoLow(a.schluessel === 'bass' ? 48 : 60);
  }

  // Ist der Editor leer, gleich mit den Vorgaben der Aufgabe beginnen
  useEffect(() => {
    if (aufgabe && doc.events.length === 0 && doc.title !== aufgabe.titel) aufgabeBeginnen(aufgabe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aufgabe]);

  return (
    <div className="editor">
      {aufgabe && (
        <AufgabePanel aufgabe={aufgabe} doc={doc} onBeginnen={() => aufgabeBeginnen(aufgabe)} onSchliessen={() => onAufgabeSchliessen?.()} />
      )}
      <div className="toolbar" role="toolbar" aria-label="Werkzeuge">
        <div className="tool-group" aria-label="Notenwert">
          {DURATIONS.map((d) => {
            const current = selectedEvent ? selectedEvent.duration.type : state.inputDuration;
            return (
              <button
                key={d.type}
                className={`tool ${current === d.type ? 'is-on' : ''}`}
                onClick={() => act({ type: 'setDuration', duration: d.type })}
                title={`${d.label} (${d.key})`}
                aria-pressed={current === d.type}
              >
                <span className="glyph">{d.glyph}</span>
                <span className="tool-label">{d.label}</span>
              </button>
            );
          })}
          <button
            className={`tool ${(selectedEvent ? selectedEvent.duration.dots : state.inputDots) ? 'is-on' : ''}`}
            onClick={() => act({ type: 'toggleDot' })}
            title="Punktierung (.)"
          >
            <span className="glyph">•</span>
            <span className="tool-label">Punkt</span>
          </button>
        </div>

        <div className="tool-group" aria-label="Vorzeichen und Pausen">
          <button className="tool" onClick={() => act({ type: 'alter', delta: 1 })} disabled={!selectedEvent?.pitch} title="Erhöhen (+)">
            <span className="glyph">♯</span>
            <span className="tool-label">Kreuz</span>
          </button>
          <button className="tool" onClick={() => act({ type: 'alter', delta: -1 })} disabled={!selectedEvent?.pitch} title="Erniedrigen (-)">
            <span className="glyph">♭</span>
            <span className="tool-label">b</span>
          </button>
          <button className="tool" onClick={() => act({ type: 'natural' })} disabled={!selectedEvent?.pitch?.alter} title="Auflösen (N)">
            <span className="glyph">♮</span>
            <span className="tool-label">Auflösen</span>
          </button>
          <button
            className={`tool ${selectedEvent?.tie ? 'is-on' : ''}`}
            onClick={() => act({ type: 'toggleTie' })}
            disabled={!selectedEvent?.pitch}
            title="Haltebogen (T)"
          >
            <span className="glyph">‿</span>
            <span className="tool-label">Bogen</span>
          </button>
          <button
            className="tool"
            onClick={() =>
              selectedEvent?.pitch ? act({ type: 'toRest' }) : act({ type: 'insert', event: { duration: inputDuration() } })
            }
            title="Pause (0)"
          >
            <span className="glyph">𝄽</span>
            <span className="tool-label">Pause</span>
          </button>
        </div>

        <div className="tool-group" aria-label="Bearbeiten">
          <button className="tool" onClick={() => act({ type: 'delete' })} disabled={doc.events.length === 0} title="Löschen (Entf)">
            <span className="glyph">⌫</span>
            <span className="tool-label">Löschen</span>
          </button>
          <button className="tool" onClick={() => act({ type: 'undo' })} disabled={!state.past.length} title="Rückgängig (Strg+Z)">
            <span className="glyph">↶</span>
            <span className="tool-label">Zurück</span>
          </button>
          <button className="tool" onClick={() => act({ type: 'redo' })} disabled={!state.future.length} title="Wiederholen (Strg+Y)">
            <span className="glyph">↷</span>
            <span className="tool-label">Vor</span>
          </button>
        </div>

        <button className={`play ${playing ? 'is-on' : ''}`} onClick={togglePlay}>
          {playing ? '■ Stopp' : '▶ Abspielen'}
        </button>
      </div>

      <div className="editor-sheet sheet">
        <div className="sheet-head editor-head">
          <div>
            <h2>{doc.title}</h2>
            <p className="meta">
              {germanKeyName(doc.key)} · {doc.time.beats}/{doc.time.beatType}-Takt ·{' '}
              {doc.satz ? 'Chorsatz SATB' : doc.clef === 'treble' ? 'Violinschlüssel' : 'Bassschlüssel'} · {doc.tempo} ♩/min
            </p>
          </div>
          <button className="secondary small" onClick={() => setShowMeta((s) => !s)} aria-expanded={showMeta}>
            Stück einstellen
          </button>
        </div>

        {showMeta && (
          <MetaPanel
            doc={doc}
            onChange={(meta) => act({ type: 'setMeta', meta })}
            onSatz={(an) => act({ type: 'setSatz', an })}
            onText={(text) => act({ type: 'setText', text })}
          />
        )}

        {doc.satz && (
          <div className="stimmen-wahl" role="group" aria-label="Stimme">
            {STIMMEN.map((st, i) => (
              <div key={st.id} className={`stimme stimme-${i} ${i === aktiv ? 'is-on' : ''}`}>
                <button onClick={() => act({ type: 'setAktiv', stimme: i })} aria-pressed={i === aktiv} title="Stimme bearbeiten (Tab wechselt)">
                  {st.name}
                  <span className="stimme-anzahl">{doc.satz!.stimmen[i].filter((e) => e.pitch).length}</span>
                </button>
                <button
                  className={`stumm ${stumm[i] ? 'is-on' : ''}`}
                  onClick={() => setStumm((m) => m.map((v, j) => (j === i ? !v : v)))}
                  aria-pressed={stumm[i]}
                  title={stumm[i] ? `${st.name} wieder hören` : `${st.name} stumm schalten`}
                >
                  {stumm[i] ? '🔇' : '🔈'}
                </button>
              </div>
            ))}
            <button
              className="link small"
              onClick={() => setStumm((m) => (m.every((v, j) => v === (j !== aktiv)) ? [false, false, false, false] : STIMMEN.map((_, j) => j !== aktiv)))}
            >
              {stumm.every((v, j) => v === (j !== aktiv)) ? 'Alle hören' : `Nur ${STIMMEN[aktiv].name} hören`}
            </button>
          </div>
        )}

        <EditorScore
          score={bar.score}
          showNoteNames={showNames}
          selectedIds={selectedIds}
          activeId={activeId}
          fingerWrites={fingerWrites}
          sourceOf={bar.sourceOf}
          eventCount={doc.events.length}
          markierungen={markierungen}
          onInsert={(pitch, at, voices) => {
            if (doc.satz && !voices.includes(aktiv)) {
              // Tipp ins andere System: passende Stimme dort wählen (Sopran↔Tenor, Alt↔Bass)
              act({ type: 'setAktiv', stimme: voices[Math.min(aktiv % 2, voices.length - 1)] });
              act({ type: 'insert', event: { pitch, duration: inputDuration() } }, pitch);
              return;
            }
            act({ type: 'insert', event: { pitch, duration: inputDuration() }, at }, pitch);
          }}
          onSelect={(id) => {
            const andere = id ? stimmeVon?.get(id) : undefined;
            if (andere && andere[0] !== aktiv) {
              act({ type: 'setAktiv', stimme: andere[0] });
              act({ type: 'select', index: andere[1] });
              return;
            }
            act({ type: 'select', index: id === null ? null : (bar.sourceOf.get(id) ?? null) });
          }}
          onDragPitch={(id, pitch) => {
            const idx = bar.sourceOf.get(id);
            if (idx !== undefined) act({ type: 'setPitch', index: idx, pitch }, pitch);
          }}
        />
        <p className="status" aria-live="polite">
          {status}
        </p>
      </div>

      {doc.satz && (
        <div className="pruefung">
          <button className={pruefen ? 'secondary' : ''} onClick={() => setPruefen(!pruefen)}>
            {pruefen ? 'Prüfung ausblenden' : 'Satz prüfen'}
          </button>
          {pruefen && (
            <PruefPanel
              befunde={pruefung.befunde}
              score={bar.score}
              auswahl={auswahl}
              onAuswahl={setAuswahl}
              hinweise={pruefung.hinweise}
              onHinweise={(v) => {
                setAuswahl(null);
                pruefung.setHinweise(v);
              }}
            />
          )}
          {pruefen && <p className="meta">Die Prüfung läuft mit, während du schreibst.</p>}
        </div>
      )}

      {notice && (
        <p className="notice" role="status" onClick={() => setNotice(null)}>
          {notice}
        </p>
      )}

      <div className="editor-options">
        <label className="check">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
          <span>Notennamen</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={fingerWrites} onChange={(e) => setFingerWrites(e.target.checked)} />
          <span>Mit dem Finger schreiben</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={showPiano} onChange={(e) => setShowPiano(e.target.checked)} />
          <span>Bildschirmklavier</span>
        </label>
        <button className="link" onClick={() => setShowHelp((h) => !h)} aria-expanded={showHelp}>
          {showHelp ? '▾' : '▸'} Tastenkürzel
        </button>
      </div>

      <MidiPanel
        status={midi.status}
        devices={midi.devices}
        connect={midi.connect}
        mitspielen={mitspielen}
        setMitspielen={setMitspielen}
      />

      {showHelp && (
        <table className="help">
          <tbody>
            {SHORTCUT_HELP.map(([k, v]) => (
              <tr key={k}>
                <th>{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showPiano && (
        <Klavier
          lowest={pianoLow}
          octaves={2}
          fifths={doc.key.fifths}
          active={[...pianoDown, ...midi.held]}
          onKey={onPianoKey}
          onShift={(d) => setPianoLow((l) => Math.max(24, Math.min(84, l + d)))}
        />
      )}

      <StueckePanel
        doc={doc}
        stueckId={stueckId}
        setStueckId={setStueckId}
        version={saveVersion}
        onOpen={(d) => act({ type: 'load', doc: d })}
        onNew={() => {
          setStueckId(null);
          const leer = { ...emptyDoc(), key: doc.key, time: doc.time, clef: doc.clef };
          act({ type: 'load', doc: doc.satz ? { ...alsSatz({ ...leer, clef: 'treble' }, true), title: 'Mein Chorsatz' } : leer });
        }}
      />

      <div className="json-actions file-actions">
        <button className="secondary" onClick={exportJson} disabled={doc.events.length === 0}>
          Als JSON speichern
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          JSON-Datei öffnen …
        </button>
        <button
          className="secondary danger"
          onClick={() => act({ type: 'clear' })}
          disabled={doc.events.length === 0}
          title="Lässt sich mit „Zurück“ rückgängig machen"
        >
          Alles löschen
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importJson(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

function MetaPanel({
  doc,
  onChange,
  onSatz,
  onText,
}: {
  doc: EditorDoc;
  onChange: (m: Partial<Omit<EditorDoc, 'events'>>) => void;
  onSatz: (an: boolean) => void;
  onText: (text: string) => void;
}) {
  const keys = [];
  for (let f = -7; f <= 7; f++) keys.push(f);
  return (
    <div className="meta-panel">
      <label className="field">
        <span>Titel</span>
        <input type="text" value={doc.title} onChange={(e) => onChange({ title: e.target.value })} />
      </label>
      <label className="field">
        <span>Taktart</span>
        <select
          value={`${doc.time.beats}/${doc.time.beatType}`}
          onChange={(e) => {
            const [beats, beatType] = e.target.value.split('/').map(Number);
            onChange({ time: { beats, beatType } });
          }}
        >
          {TIMES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Tonart</span>
        <select
          value={`${doc.key.fifths}:${doc.key.mode}`}
          onChange={(e) => {
            const [f, mode] = e.target.value.split(':');
            onChange({ key: { fifths: Number(f), mode: mode as 'major' | 'minor' } });
          }}
        >
          {keys.map((f) => (
            <option key={`${f}:major`} value={`${f}:major`}>
              {germanKeyName({ fifths: f, mode: 'major' })}
            </option>
          ))}
          {keys.map((f) => (
            <option key={`${f}:minor`} value={`${f}:minor`}>
              {germanKeyName({ fifths: f, mode: 'minor' })}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Besetzung</span>
        <select value={doc.satz ? 'satz' : 'melodie'} onChange={(e) => onSatz(e.target.value === 'satz')}>
          <option value="melodie">Melodie (einstimmig)</option>
          <option value="satz">Chorsatz: Sopran, Alt, Tenor, Bass</option>
        </select>
      </label>
      {!doc.satz && (
        <label className="field">
          <span>Schlüssel</span>
          <select value={doc.clef} onChange={(e) => onChange({ clef: e.target.value as 'treble' | 'bass' })}>
            <option value="treble">Violinschlüssel</option>
            <option value="bass">Bassschlüssel</option>
          </select>
        </label>
      )}
      {doc.satz && (
        <label className="field liedtext">
          <span>Liedtext (Silben mit Leerzeichen trennen: „Lo- be den Her- ren“)</span>
          <input type="text" value={doc.satz.text ?? ''} onChange={(e) => onText(e.target.value)} />
        </label>
      )}
      <label className="field">
        <span>Tempo: {doc.tempo} ♩/min</span>
        <input
          type="range"
          min={40}
          max={200}
          value={doc.tempo}
          onChange={(e) => onChange({ tempo: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
