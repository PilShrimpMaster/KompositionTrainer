import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { initAudio, play, playNote } from '../audio/player';
import { germanKeyName, germanName, toToneName } from '../model/pitch';
import type { DurationType, Pitch } from '../model/types';
import { EditorScore } from './EditorScore';
import { Klavier } from './Klavier';
import type { Schreibaufgabe } from '../lernpfad/lektion';
import { AufgabePanel } from './AufgabePanel';
import { docFromScore, rebar, type EditorDoc } from './rebar';
import { alsSatz, besetzungsName, ensembleDoc, ensembleName, freiDoc, klavierDoc, kpBesetzung, kpDoc, rebarSatz, stimmenVon, synchron, type SatzRebar } from './satzdoc';
import { anzeigeTransposition, ENSEMBLES, INSTRUMENTE, instrument, partiturRang, transponiereScore, verschiebe } from '../model/instrumente';
import { HarmoniePanel } from '../satz/HarmoniePanel';
import { FormPanel } from '../satz/FormPanel';
import { StilPanel } from '../satz/StilPanel';
import type { Merkmal } from '../satz/stilmerkmale';
import { KiFeedback } from '../ki/KiFeedback';
import { erzeugeCantus, MODI } from '../kontrapunkt/cantus';
import { GATTUNGEN, STRENGE_GATTUNGEN, type Gattung } from '../kontrapunkt/fux';
import { motivMarkierungen, MotivPanel, useMotive } from '../kontrapunkt/MotivPanel';
import { markierungenFuer, PruefPanel, usePruefung } from '../satz/PruefPanel';
import { STILE, stilProfil } from '../satz/stil';
import { measureLength, quarterLength } from '../model/duration';
import { ladeDatei, NOTENDATEIEN, speichereJson, speichereMusicXml } from '../musicxml/datei';
import { SHORTCUT_HELP, shortcutFor } from './shortcuts';
import { editorReducer, emptyDoc, initialState, type EditorAction } from './state';
import { spellMidi } from '../model/pitch';
import { MidiPanel } from '../midi/MidiPanel';
import { useMidi } from '../midi/useMidi';
import { StueckePanel } from '../speicher/StueckePanel';
import { AkkordFeld } from '../jazz/AkkordFeld';
import { LeadsheetPanel } from '../jazz/LeadsheetPanel';
import { insPortfolio, stueckSpeichern } from '../speicher/db';

const STORAGE_KEY = 'kt-editor-entwurf-v1';
const STUECK_KEY = 'kt-editor-stueck-id';
const MITSPIELEN_KEY = 'kt-midi-mitspielen';
const PRUEFEN_KEY = 'kt-editor-pruefen';
type Besetzungsart = 'melodie' | 'satz' | 'kontrapunkt' | 'frei' | 'klavier' | 'ensemble';
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

  const [stumm, setStumm] = useState<boolean[]>(() => Array(8).fill(false));
  const [pruefen, setPruefenState] = useState(() => lesen(PRUEFEN_KEY) === 'ja');
  const [auswahl, setAuswahl] = useState<number | null>(null);
  const [formZeigen, setFormZeigen] = useState(false);
  const [stilZeigen, setStilZeigen] = useState(false);
  const [merkmal, setMerkmal] = useState<Merkmal | null>(null);
  const [feedbackZeigen, setFeedbackZeigen] = useState(false);
  function setPruefen(v: boolean) {
    setPruefenState(v);
    setAuswahl(null);
    schreiben(PRUEFEN_KEY, v ? 'ja' : 'nein');
  }
  const bar = useMemo(() => (doc.satz ? rebarSatz(doc) : rebar(doc)), [doc]);
  const stimmeVon = doc.satz ? (bar as SatzRebar).stimmeVon : null;
  const aktiv = doc.satz?.aktiv ?? 0;
  const besetzung = stimmenVon(doc.satz);
  const gesperrt = doc.satz?.gesperrt ?? [];
  const klavier = !!doc.satz?.klavier;
  const ensemble = doc.satz?.ensemble;
  const transponiert = !!doc.satz?.transponiert;
  /** Angezeigte Partitur: bei Ensembles transponiert oder klingend (Kontrabass immer eine Oktave höher) */
  const anzeige = useMemo(() => (ensemble ? transponiereScore(bar.score, transponiert) : bar.score), [bar.score, ensemble, transponiert]);
  /** Ein getippter (notierter) Ton einer Stimme, zurück in die klingende Höhe */
  const klingendIn = (pitch: Pitch, stimme: number) => {
    const t = anzeigeTransposition(besetzung[stimme]?.instrument, transponiert);
    return t ? verschiebe(pitch, -t.stufen, -t.halbtoene) : pitch;
  };
  const pruefung = usePruefung(bar.score, doc.satz?.kontrapunkt, klavier);
  const frei = doc.satz?.kontrapunkt?.gattung === 'frei';
  const motive = useMotive(bar.score);
  const markierungen = useMemo(() => {
    if (stilZeigen && merkmal) return new Map(merkmal.ids.map((id) => [id, 'is-auswahl']));
    if (!doc.satz || !pruefen) return undefined;
    const regeln = markierungenFuer(pruefung.befunde, auswahl);
    return frei ? motivMarkierungen(motive.funde, motive.auswahl, regeln) : regeln;
  }, [doc.satz, pruefen, pruefung.befunde, auswahl, frei, motive.funde, motive.auswahl, stilZeigen, merkmal]);
  useEffect(() => setAuswahl(null), [doc]);
  useEffect(() => {
    if (doc.satz) setPianoLow(doc.satz.besetzung ? (doc.satz.besetzung[aktiv]?.clef === 'bass' ? 48 : 60) : KLAVIER_TIEF[aktiv]);
    if (doc.satz?.besetzung?.[aktiv]?.clef === 'alto') setPianoLow(48);
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
    const klang = instrument(stimmenVon(doc.satz)[doc.satz?.aktiv ?? 0]?.instrument)?.klang;
    if (sound) playNote(toToneName(sound), klang ? 0.8 : 0.5, 0.7, klang).catch(() => setNotice('Ton konnte nicht gestartet werden.'));
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
        const n = s.doc.satz.stimmen.length;
        let ziel = s.doc.satz.aktiv;
        for (let i = 0; i < n; i++) {
          ziel = (ziel + (e.shiftKey ? n - 1 : 1)) % n;
          if (!s.doc.satz.gesperrt?.includes(ziel)) break;
        }
        a({ type: 'setAktiv', stimme: ziel });
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
        oktave: (() => {
          const i = instrument(stimmenVon(s.doc.satz)[s.doc.satz?.aktiv ?? 0]?.instrument);
          return i ? Math.floor((i.lage[0] + i.lage[1]) / 24) - 1 : undefined;
        })(),
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

  async function importDatei(file: File) {
    const r = await ladeDatei(file);
    if (!r.score) {
      setNotice(`Datei nicht übernommen: ${r.fehler}`);
      return;
    }
    setStueckId(null); // geöffnete Datei überschreibt kein gespeichertes Stück
    const neu = docFromScore(r.score);
    act({ type: 'load', doc: neu });
    const n = r.score.voices.length;
    const teile = [`„${r.score.title}“ geöffnet.`];
    if (n !== 1 && !neu.satz) teile.push(`Der Editor zeigt nur die erste von ${n} Stimmen; alle Stimmen siehst und hörst du unter „Hören“.`);
    const takt1 = r.score.voices[0].measures[0].notes.reduce((q, ev) => q + quarterLength(ev.duration), 0);
    if (takt1 < measureLength(r.score.time) - 1e-6) teile.push('Der Auftakt geht im Editor verloren, weil er die Taktstriche neu setzt; unter „Hören“ bleibt er erhalten.');
    if (r.hinweise.length) teile.push(...r.hinweise);
    setNotice(teile.join(' '));
  }

  const status = (() => {
    if (doc.events.length === 0 && klavier)
      return aktiv === 0
        ? 'Melodie: noch leer. Schreib die Melodie ins obere System; Tab wechselt zur Begleitung.'
        : 'Begleitung: noch leer. Schreib Bass oder gebrochene Akkorde ins untere System (z. B. c–g–e–g); Tab wechselt zur Melodie.';
    if (doc.events.length === 0 && doc.satz?.kontrapunkt?.gattung === 'frei') return `${besetzung[aktiv].name}: noch leer. Beginne mit einem kurzen Motiv in einer Stimme und lass es die andere nachahmen. Tab wechselt die Stimme.`;
    if (doc.events.length === 0 && doc.satz?.kontrapunkt) return `Schreib die Gegenstimme ins ${besetzung[aktiv].staff === 0 ? 'obere' : 'untere'} System: ${GATTUNGEN[doc.satz.kontrapunkt.gattung].kurz}.`;
    if (doc.events.length === 0 && doc.satz) return `${besetzung[aktiv].name}: noch leer. Tippe ins ${doc.satz.ensemble ? `System ${besetzung[aktiv].kurz ?? besetzung[aktiv].name}` : besetzung[aktiv].staff === 0 ? 'obere System' : 'untere System'}, spiel auf dem Klavier oder wechsle die Stimme mit Tab.`;
    if (doc.events.length === 0) return 'Tippe mit dem Apple Pencil (oder der Maus) ins Notensystem, spiel auf dem Klavier oder tippe Buchstaben wie c, d, e.';
    const parts: string[] = [];
    if (selectedEvent) {
      parts.push(
        selectedEvent.pitch
          ? `Ausgewählt: ${germanName(selectedEvent.pitch)} (Note ${selected! + 1})`
          : `Ausgewählt: Pause (Note ${selected! + 1})`,
      );
    }
    if (doc.satz) parts.unshift(besetzung[aktiv].name);
    if (bar.missing > 0) parts.push(`Im letzten Takt fehlt noch ${fmtQuarters(bar.missing)}.`);
    else parts.push(`${bar.score.voices[0].measures.length} volle Takte.`);
    return parts.join(' · ');
  })();

  /** Neuer Kontrapunkt mit einem frisch erzeugten Cantus firmus */
  function kontrapunktNeu(gattung: Gattung = 1, cf: 0 | 1 = 1, modus = MODI[Math.floor(Math.random() * MODI.length)].id) {
    setStueckId(null);
    const cantus = erzeugeCantus(modus, Math.random, cf === 1 ? 3 : 4);
    const name = MODI.find((m) => m.id === modus)!.name;
    act({ type: 'load', doc: kpDoc({ ...emptyDoc(), title: `Kontrapunkt (${name})`, key: { fifths: 0, mode: 'major' }, time: { beats: 4, beatType: 4 } }, gattung, cf, cantus) });
    setPruefen(true);
  }

  function besetzungWaehlen(art: Besetzungsart) {
    if (art === 'kontrapunkt') {
      if (!doc.satz?.kontrapunkt || doc.satz.kontrapunkt.gattung === 'frei') kontrapunktNeu();
      return;
    }
    if (art === 'klavier') {
      if (klavier) return;
      // Eine vorhandene Melodie wird übernommen
      const d = synchron(doc);
      const melodie = d.satz ? (d.satz.kontrapunkt ? [] : d.satz.stimmen[0]) : d.clef === 'treble' ? d.events : [];
      setStueckId(null);
      act({ type: 'load', doc: klavierDoc({ ...d, satz: undefined, title: d.title === 'Meine Melodie' ? 'Mein Klavierstück' : d.title }, melodie) });
      setPruefen(true);
      return;
    }
    if (art === 'ensemble') {
      if (ensemble) return;
      ensembleWaehlen(ENSEMBLES[0].instrumente);
      return;
    }
    if (art === 'frei') {
      if (doc.satz?.kontrapunkt?.gattung === 'frei') return;
      setStueckId(null);
      act({ type: 'load', doc: freiDoc({ ...emptyDoc(), title: 'Meine Invention', key: doc.key, time: { beats: 4, beatType: 4 } }) });
      setPruefen(true);
      return;
    }
    if (klavier || ensemble) {
      // Vom Klaviersatz oder Ensemble zurück: die Melodie (oberste Stimme) bleibt
      const melodie = synchron(doc).satz!.stimmen[0];
      const basis = { ...doc, satz: undefined, clef: 'treble' as const, events: melodie };
      act({ type: 'load', doc: art === 'satz' ? alsSatz(basis, true) : basis });
      return;
    }
    if (doc.satz?.kontrapunkt) {
      // Vom Kontrapunkt zurück: neu beginnen
      const leer = { ...emptyDoc(), title: art === 'satz' ? 'Mein Chorsatz' : 'Meine Melodie' };
      act({ type: 'load', doc: art === 'satz' ? alsSatz(leer, true) : leer });
      return;
    }
    act({ type: 'setSatz', an: art === 'satz' });
  }

  /**
   * Neue Besetzung für das Ensemble: Stimmen mit gleichem Instrument behalten ihre Noten,
   * eine vorhandene Melodie wird zur obersten Stimme.
   */
  function ensembleWaehlen(ids: string[], quelle?: number[]) {
    const d = synchron(doc);
    const alt = d.satz?.ensemble;
    let vorgabe: EditorDoc['events'][] = [];
    if (alt && quelle) {
      vorgabe = quelle.map((k) => d.satz!.stimmen[k] ?? []);
    } else if (alt) {
      const frei = alt.map((_, k) => k);
      vorgabe = ids.map((id) => {
        const k = frei.find((j) => alt[j] === id);
        if (k === undefined) return [];
        frei.splice(frei.indexOf(k), 1);
        return d.satz!.stimmen[k];
      });
    } else {
      const melodie = d.satz ? (d.satz.kontrapunkt ? [] : d.satz.stimmen[0]) : d.clef === 'treble' ? d.events : [];
      vorgabe = [melodie];
      setStueckId(null);
    }
    const title = alt ? d.title : d.title === 'Meine Melodie' || d.title === 'Mein Chorsatz' || d.title === 'Mein Klavierstück' ? 'Mein Ensemblesatz' : d.title;
    const neu = ensembleDoc({ ...d, satz: undefined, title }, ids, vorgabe);
    act({ type: 'load', doc: { ...neu, satz: { ...neu.satz!, transponiert: d.satz?.transponiert } } });
    setStumm(Array(8).fill(false));
    setPruefen(true);
  }

  /** Gattung oder Lage des Cantus firmus ändern, die Gegenstimme bleibt (bei neuer Lage wird sie geleert) */
  function kontrapunktAendern(gattung: Gattung, cf: 0 | 1) {
    const d = synchron(doc);
    const alt = d.satz!.kontrapunkt!;
    const cantus = d.satz!.stimmen[alt.cf];
    const kp = cf === alt.cf ? d.satz!.stimmen[1 - alt.cf] : [];
    const verschoben = cf === alt.cf ? cantus : cantus.map((e) => (e.pitch ? { ...e, pitch: { ...e.pitch, octave: e.pitch.octave + (cf === 0 ? 1 : -1) } } : e));
    act({ type: 'load', doc: kpDoc(d, gattung, cf, verschoben, kp) });
  }

  function aufgabeBeginnen(a: Schreibaufgabe) {
    setStueckId(null);
    const basis = { ...emptyDoc(), title: a.titel, key: a.tonart ?? doc.key, time: a.takt ?? doc.time, clef: a.schluessel ?? doc.clef, ...(a.stil ? { stil: a.stil } : {}) };
    if (a.klavier) {
      const neu = klavierDoc(basis, a.klavier.melodie, a.klavier.begleitung, true);
      act({ type: 'load', doc: neu });
      setPianoLow(neu.satz!.aktiv === 1 ? 48 : 60);
      setPruefen(true);
      return;
    }
    if (a.ensemble) {
      act({ type: 'load', doc: ensembleDoc(basis, a.ensemble.instrumente, a.ensemble.vorgabe, true) });
      setStumm(Array(8).fill(false));
      setPruefen(true);
      return;
    }
    if (a.kontrapunkt) {
      const { gattung, cf, cantus } = a.kontrapunkt;
      const neu = gattung === 'frei' ? freiDoc(basis, cantus) : kpDoc(basis, gattung, cf, cantus);
      act({ type: 'load', doc: neu });
      setPianoLow(kpBesetzung(cf)[1 - cf].clef === 'bass' ? 48 : 60);
      setPruefen(true);
      return;
    }
    if (a.vorgabe) {
      // Vierstimmiger Satz: Vorgaben übernehmen, die erste leere Stimme wird bearbeitet
      const stimmen = a.vorgabe.map((st) => structuredClone(st));
      const aktiv = Math.max(0, stimmen.findIndex((st) => st.length === 0));
      act({ type: 'load', doc: { ...basis, clef: stimmenVon(undefined)[aktiv].clef, events: stimmen[aktiv], satz: { stimmen, aktiv, text: a.liedtext } } });
      setPianoLow(stimmenVon(undefined)[aktiv].clef === 'bass' ? 48 : 60);
      return;
    }
    act({ type: 'load', doc: a.leadsheet ? { ...basis, events: structuredClone(a.leadsheet) } : basis });
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
        <AufgabePanel
          aufgabe={aufgabe}
          doc={doc}
          onBeginnen={() => aufgabeBeginnen(aufgabe)}
          onSchliessen={() => onAufgabeSchliessen?.()}
          onPortfolio={async () => {
            try {
              const s = await insPortfolio(synchron(doc), stueckId, `Aufgabe gelöst: ${aufgabe.titel}`);
              setStueckId(s.id);
              setSaveVersion((v) => v + 1);
              setNotice(`„${s.titel}“ ist jetzt in deinem Portfolio (unter „Meine Stücke“), mit einer gesicherten Fassung.`);
            } catch {
              setNotice('Das Stück konnte nicht gespeichert werden.');
            }
          }}
        />
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
              {doc.satz?.kontrapunkt ? GATTUNGEN[doc.satz.kontrapunkt.gattung].name : klavier ? 'Klaviersatz' : ensemble ? `${ensembleName(ensemble)}${transponiert ? ', transponiert' : ', klingend'}` : doc.satz ? 'Chorsatz SATB' : doc.clef === 'treble' ? 'Violinschlüssel' : 'Bassschlüssel'} {doc.stil && doc.stil !== 'streng' ? ` · Stil: ${stilProfil(doc.stil).name}` : ''} · {doc.tempo} ♩/min
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
            onSatz={(art) => besetzungWaehlen(art)}
            onText={(text) => act({ type: 'setText', text })}
            onEnsemble={ensembleWaehlen}
            onTransponiert={(an) => act({ type: 'load', doc: { ...synchron(doc), satz: { ...synchron(doc).satz!, transponiert: an } } })}
          />
        )}

        {doc.satz?.kontrapunkt && doc.satz.kontrapunkt.gattung !== 'frei' && (
          <div className="kp-leiste" role="group" aria-label="Kontrapunkt">
            <select
              value={doc.satz.kontrapunkt.gattung}
              onChange={(e) => kontrapunktAendern(Number(e.target.value) as Gattung, doc.satz!.kontrapunkt!.cf)}
              aria-label="Gattung"
            >
              {STRENGE_GATTUNGEN.map((g) => (
                <option key={g} value={g}>
                  {GATTUNGEN[g].name}
                </option>
              ))}
            </select>
            <select
              value={doc.satz.kontrapunkt.cf}
              onChange={(e) => kontrapunktAendern(doc.satz!.kontrapunkt!.gattung, Number(e.target.value) as 0 | 1)}
              aria-label="Lage des Cantus firmus"
            >
              <option value={1}>Cantus firmus unten</option>
              <option value={0}>Cantus firmus oben</option>
            </select>
            <button className="secondary small" onClick={() => kontrapunktNeu(doc.satz!.kontrapunkt!.gattung, doc.satz!.kontrapunkt!.cf)}>
              Neuer Cantus firmus
            </button>
          </div>
        )}

        {doc.satz && (
          <div className="stimmen-wahl" role="group" aria-label="Stimme">
            {besetzung.map((st, i) => (
              <div key={st.id} className={`stimme stimme-${i} ${i === aktiv ? 'is-on' : ''}`}>
                <button
                  onClick={() => act({ type: 'setAktiv', stimme: i })}
                  aria-pressed={i === aktiv}
                  disabled={gesperrt.includes(i)}
                  title={gesperrt.includes(i) ? 'Vorgegeben' : 'Stimme bearbeiten (Tab wechselt)'}
                >
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
              onClick={() => setStumm((m) => (m.every((v, j) => v === (j !== aktiv)) ? besetzung.map(() => false) : besetzung.map((_, j) => j !== aktiv)))}
            >
              {stumm.slice(0, besetzung.length).every((v, j) => v === (j !== aktiv)) ? 'Alle hören' : `Nur ${besetzung[aktiv].name} hören`}
            </button>
          </div>
        )}

        <EditorScore
          score={anzeige}
          showNoteNames={showNames}
          selectedIds={selectedIds}
          activeId={activeId}
          fingerWrites={fingerWrites}
          sourceOf={bar.sourceOf}
          eventCount={doc.events.length}
          markierungen={markierungen}
          onInsert={(notiert, at, voices) => {
            const pitch = ensemble && voices.length ? klingendIn(notiert, voices[0]) : notiert;
            if (doc.satz && voices.length && voices.every((v) => gesperrt.includes(v))) {
              setNotice(`${besetzung[voices[0]].name} ist vorgegeben. Schreib in der anderen Stimme.`);
              return;
            }
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
            if (andere && gesperrt.includes(andere[0])) return;
            if (andere && andere[0] !== aktiv) {
              act({ type: 'setAktiv', stimme: andere[0] });
              act({ type: 'select', index: andere[1] });
              return;
            }
            act({ type: 'select', index: id === null ? null : (bar.sourceOf.get(id) ?? null) });
          }}
          onDragPitch={(id, notiert) => {
            const pitch = ensemble ? klingendIn(notiert, aktiv) : notiert;
            const idx = bar.sourceOf.get(id);
            if (idx !== undefined) act({ type: 'setPitch', index: idx, pitch }, pitch);
          }}
        />
        <p className="status" aria-live="polite">
          {status}
        </p>
        {selected !== null && selectedEvent && <AkkordFeld key={selected} wert={selectedEvent.akkord ?? ''} onSetzen={(akkord) => act({ type: 'setAkkord', index: selected, akkord })} />}
        <LeadsheetPanel score={bar.score} />
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
          {pruefen && klavier && <HarmoniePanel score={bar.score} />}
          {pruefen && frei && (
            <MotivPanel
              motiv={motive.motiv}
              funde={motive.funde}
              laenge={motive.laenge}
              onLaenge={motive.setLaenge}
              auswahl={motive.auswahl}
              onAuswahl={(i) => {
                setAuswahl(null);
                motive.setAuswahl(i);
              }}
            />
          )}
          {pruefen && <p className="meta">Die Prüfung läuft mit, während du schreibst.</p>}
        </div>
      )}

      {bar.score.voices[0].measures.length >= 4 && (
        <div className="pruefung">
          <button className={formZeigen ? 'secondary' : ''} onClick={() => setFormZeigen(!formZeigen)} aria-expanded={formZeigen}>
            {formZeigen ? 'Form ausblenden' : 'Form zeigen'}
          </button>
          <button className={stilZeigen ? 'secondary' : ''} onClick={() => { setStilZeigen(!stilZeigen); setMerkmal(null); }} aria-expanded={stilZeigen}>
            {stilZeigen ? 'Stilmerkmale ausblenden' : 'Stilmerkmale zeigen'}
          </button>
          <button className="secondary" onClick={() => setFeedbackZeigen(!feedbackZeigen)} aria-expanded={feedbackZeigen}>
            {feedbackZeigen ? 'KI-Feedback ausblenden' : '✨ Feedback zu meinem Stück'}
          </button>
          {formZeigen && <FormPanel score={bar.score} />}
          {stilZeigen && <StilPanel score={bar.score} auswahl={merkmal?.id ?? null} onAuswahl={setMerkmal} />}
          {feedbackZeigen && (
            <KiFeedback
              score={bar.score}
              besetzung={besetzungsName(doc)}
              befunde={doc.satz ? pruefung.befunde : []}
              aufgabe={aufgabe && doc.title === aufgabe.titel ? aufgabe.text : undefined}
            />
          )}
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
        <button className="secondary" onClick={() => speichereMusicXml(bar.score)} disabled={doc.events.length === 0} title="MusicXML öffnet sich direkt in MuseScore Studio 4">
          Für MuseScore speichern
        </button>
        <button className="secondary" onClick={() => speichereJson(bar.score)} disabled={doc.events.length === 0}>
          Als JSON speichern
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          Datei öffnen (MusicXML, JSON) …
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
          accept={NOTENDATEIEN}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importDatei(f);
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
  onEnsemble,
  onTransponiert,
}: {
  doc: EditorDoc;
  onChange: (m: Partial<Omit<EditorDoc, 'events'>>) => void;
  onSatz: (art: Besetzungsart) => void;
  onText: (text: string) => void;
  onEnsemble: (ids: string[], quelle?: number[]) => void;
  onTransponiert: (an: boolean) => void;
}) {
  const ens = doc.satz?.ensemble;
  const sortiert = (ids: string[]) => [...ids].sort((a, b) => partiturRang(a) - partiturRang(b));
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
        <select
          value={doc.satz?.kontrapunkt ? (doc.satz.kontrapunkt.gattung === 'frei' ? 'frei' : 'kontrapunkt') : doc.satz?.klavier ? 'klavier' : ens ? 'ensemble' : doc.satz ? 'satz' : 'melodie'}
          onChange={(e) => onSatz(e.target.value as Besetzungsart)}
        >
          <option value="melodie">Melodie (einstimmig)</option>
          <option value="klavier">Klavier: Melodie mit Begleitung</option>
          <option value="satz">Chorsatz: Sopran, Alt, Tenor, Bass</option>
          <option value="kontrapunkt">Kontrapunkt: Gegenstimme zu einem Cantus firmus</option>
          <option value="frei">Zweistimmig frei: Invention</option>
          <option value="ensemble">Ensemble: Streichquartett, Bläser …</option>
        </select>
      </label>
      {doc.satz && !(doc.satz.kontrapunkt && doc.satz.kontrapunkt.gattung !== 'frei') && (
        <label className="field">
          <span>Stil der Prüfung</span>
          <select value={doc.stil ?? 'streng'} onChange={(e) => onChange({ stil: e.target.value === 'streng' ? undefined : e.target.value })}>
            {STILE.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <small className="feld-hilfe">{stilProfil(doc.stil).epoche}</small>
        </label>
      )}
      {ens && (
        <div className="field ensemble-wahl">
          <span>Instrumente</span>
          <select
            value={ENSEMBLES.find((e) => e.instrumente.join() === ens.join())?.id ?? ''}
            onChange={(e) => {
              const neu = ENSEMBLES.find((x) => x.id === e.target.value);
              if (neu) onEnsemble(neu.instrumente);
            }}
            aria-label="Besetzung wählen"
          >
            <option value="" disabled>
              Eigene Besetzung
            </option>
            {ENSEMBLES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <div className="ensemble-stimmen">
            {ens.map((id, k) => (
              <span key={k} className="ensemble-stimme">
                <select
                  value={id}
                  onChange={(e) => onEnsemble(ens.map((x, j) => (j === k ? e.target.value : x)), ens.map((_, j) => j))}
                  aria-label={`Instrument der Stimme ${k + 1}`}
                >
                  {INSTRUMENTE.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                      {i.stimmung ? ` ${i.stimmung}` : ''}
                    </option>
                  ))}
                </select>
                {ens.length > 2 && (
                  <button
                    className="link small"
                    onClick={() => onEnsemble(ens.filter((_, j) => j !== k), ens.map((_, j) => j).filter((j) => j !== k))}
                    title="Stimme entfernen"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {ens.length < 8 && (
              <button className="secondary small" onClick={() => onEnsemble(sortiert([...ens, 'violine']))}>
                + Stimme
              </button>
            )}
          </div>
          <label className="check">
            <input type="checkbox" checked={!!doc.satz?.transponiert} onChange={(e) => onTransponiert(e.target.checked)} />
            Partitur transponiert zeigen (wie die Spieler lesen)
          </label>
        </div>
      )}
      {!doc.satz && (
        <label className="field">
          <span>Schlüssel</span>
          <select value={doc.clef} onChange={(e) => onChange({ clef: e.target.value as 'treble' | 'bass' })}>
            <option value="treble">Violinschlüssel</option>
            <option value="bass">Bassschlüssel</option>
          </select>
        </label>
      )}
      {doc.satz && !doc.satz.kontrapunkt && !doc.satz.klavier && !ens && (
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
