import { useEffect, useMemo, useRef, useState } from 'react';
import { erledigt } from '../lernpfad/erledigt';
import type { Schreibaufgabe } from '../lernpfad/lektion';
import { schreibeSmf } from '../midi/smf';
import { dateiname } from '../musicxml/export';
import { herunterladen } from '../musicxml/datei';
import { beatZuMidi, gespeicherteBeats, leererBeat, loescheBeat, pruefeBeat, speichereBeat, VORLAGEN, vorlage, type Beat } from './beat';
import { aufgabeNeuGestartet } from './aufgabeStart';
import { BeatGrid, type StepModus } from './BeatGrid';
import { spieleBeat } from './klang';

const ENTWURF = 'kt-beat-entwurf';

function ladeEntwurf(): Beat {
  try {
    const b = JSON.parse(localStorage.getItem(ENTWURF) ?? 'null') as Beat | null;
    if (b && b.kanaele && typeof b.bpm === 'number') return { ...leererBeat(), ...b, kanaele: { ...leererBeat().kanaele, ...b.kanaele } };
  } catch {
    /* ignorieren */
  }
  return vorlage('house');
}

interface Props {
  aufgabe?: Schreibaufgabe | null;
  onAufgabeSchliessen?: () => void;
}

/** Beat-Baukasten: Step-Sequencer mit Mischpult, Vorlagen, Speichern und MIDI-Export */
export function BeatView({ aufgabe, onAufgabeSchliessen }: Props) {
  const [beat, setBeatState] = useState<Beat>(ladeEntwurf);
  const [step, setStep] = useState(-1);
  const [laeuft, setLaeuft] = useState(false);
  const [modus, setModus] = useState<StepModus>('setzen');
  const [meine, setMeine] = useState<Beat[]>(gespeicherteBeats);
  const [geprueft, setGeprueft] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const beatRef = useRef(beat);
  beatRef.current = beat;
  const stopRef = useRef<(() => void) | null>(null);

  function setBeat(b: Beat) {
    setBeatState(b);
    setGeprueft(false);
    try {
      localStorage.setItem(ENTWURF, JSON.stringify(b));
    } catch {
      /* ignorieren */
    }
  }

  useEffect(() => () => stopRef.current?.(), []);
  useEffect(() => setGeprueft(false), [aufgabe]);
  useEffect(() => {
    if (aufgabe?.beat && aufgabeNeuGestartet(aufgabe.id)) setBeat({ ...aufgabe.beat.vorgabe, name: aufgabe.titel });
  }, [aufgabe?.id]);

  const ergebnis = useMemo(() => (aufgabe?.beat ? pruefeBeat(beat, aufgabe.pruefung) : []), [beat, aufgabe]);
  const alleOk = ergebnis.length > 0 && ergebnis.every((p) => p.ok);
  useEffect(() => {
    if (aufgabe && geprueft && alleOk) erledigt(`aufgabe:${aufgabe.id}`);
  }, [aufgabe, geprueft, alleOk]);

  async function abspielen() {
    if (laeuft) {
      stopRef.current?.();
      return;
    }
    setLaeuft(true);
    try {
      stopRef.current = await spieleBeat(() => beatRef.current, {
        onStep: setStep,
        onEnde: () => {
          setLaeuft(false);
          stopRef.current = null;
        },
      });
    } catch {
      setLaeuft(false);
    }
  }

  function exportieren() {
    const spur = beatZuMidi(beat, 4);
    herunterladen(schreibeSmf([spur], beat.bpm, { beats: 4, beatType: 4 }, beat.name) as BlobPart, dateiname(beat.name, 'mid'), 'audio/midi');
  }

  function zeige(text: string) {
    setMeldung(text);
    setTimeout(() => setMeldung(null), 2500);
  }

  return (
    <section className="beat-baukasten">
      {aufgabe?.beat && (
        <section className="aufgabe-panel" aria-label="Aufgabe">
          <div className="aufgabe-kopf">
            <strong>Aufgabe: {aufgabe.titel}</strong>
            <button className="secondary small" onClick={onAufgabeSchliessen} aria-label="Aufgabe schließen">
              ✕
            </button>
          </div>
          <p>{aufgabe.text}</p>
          <div className="json-actions">
            <button className="secondary" onClick={() => setBeat({ ...aufgabe.beat!.vorgabe, name: aufgabe.titel })}>
              Neu beginnen mit der Vorgabe
            </button>
            <button onClick={() => setGeprueft(true)}>Beat prüfen</button>
          </div>
          {geprueft && (
            <ul className="pruefliste">
              {ergebnis.map((p) => (
                <li key={p.text} className={p.ok ? 'ok' : 'falsch'}>
                  {p.ok ? '✓' : '✗'} {p.text}
                  {!p.ok && p.hinweis && <span className="meta"> {p.hinweis}</span>}
                </li>
              ))}
            </ul>
          )}
          {geprueft && alleOk && (
            <div className="aufgabe-geschafft">
              <p>Geschafft! Alle Punkte sind erfüllt. Speichere den Beat, exportiere ihn als MIDI und bau ihn in FL Studio nach.</p>
            </div>
          )}
        </section>
      )}

      <div className="beat-transport">
        <button className={`play ${laeuft ? 'is-on' : ''}`} onClick={abspielen}>
          {laeuft ? '■ Stopp' : '▶ Abspielen'}
        </button>
        <label className="beat-regler">
          <span>Tempo</span>
          <input type="number" min={60} max={200} value={beat.bpm} onChange={(e) => setBeat({ ...beat, bpm: Math.min(200, Math.max(60, Number(e.target.value) || 120)) })} aria-label="Tempo in BPM" />
          <span className="meta">BPM</span>
        </label>
        <label className="beat-regler">
          <span>Swing</span>
          <input type="range" min={0} max={80} step={5} value={Math.round(beat.swing * 100)} onChange={(e) => setBeat({ ...beat, swing: Number(e.target.value) / 100 })} aria-label="Swing in Prozent" />
          <span className="meta">{Math.round(beat.swing * 100)} %</span>
        </label>
        <div className="segment" role="group" aria-label="Eingabemodus">
          <button className={modus === 'setzen' ? '' : 'secondary'} onClick={() => setModus('setzen')} aria-pressed={modus === 'setzen'}>
            Setzen
          </button>
          <button className={modus === 'velocity' ? '' : 'secondary'} onClick={() => setModus('velocity')} aria-pressed={modus === 'velocity'} title="Antippen wechselt laut → mittel → leise → aus">
            Velocity
          </button>
        </div>
      </div>

      <BeatGrid beat={beat} onChange={setBeat} aktiv={step} modus={modus} mixer />
      <p className="meta">
        Tippe auf ein Feld, um einen Schlag zu setzen. Im Modus „Velocity“ wechselt jedes Antippen die Anschlagstärke: laut, mittel, leise (Ghost Note), aus. Ein Tipp auf den Spurnamen spielt den Klang.
      </p>

      <div className="beat-dateien">
        <label className="field">
          <span>Vorlage laden</span>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setBeat(vorlage(e.target.value));
            }}
          >
            <option value="">Genre wählen …</option>
            {VORLAGEN.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Name</span>
          <input type="text" value={beat.name} onChange={(e) => setBeat({ ...beat, name: e.target.value })} />
        </label>
        <div className="json-actions">
          <button
            className="secondary"
            onClick={() => {
              setMeine(speichereBeat(beat));
              zeige(`„${beat.name}“ gespeichert.`);
            }}
          >
            Speichern
          </button>
          <button className="secondary" onClick={exportieren} title="Standard-MIDI-Datei, Schlagzeug auf Kanal 10, 4 Takte">
            Als MIDI für FL Studio
          </button>
          <button className="secondary" onClick={() => setBeat({ ...leererBeat(beat.name, beat.bpm) })}>
            Alles leeren
          </button>
        </div>
        {meldung && (
          <p className="status" role="status">
            {meldung}
          </p>
        )}
      </div>

      {VORLAGEN.find((v) => v.name === beat.name) && <p className="meta">{VORLAGEN.find((v) => v.name === beat.name)!.beschreibung}</p>}

      {meine.length > 0 && (
        <details className="beat-meine">
          <summary>Meine Beats ({meine.length})</summary>
          <ul className="stueck-liste">
            {meine.map((b) => (
              <li key={b.name}>
                <span className="stueck-titel">{b.name}</span>
                <span className="meta">{b.bpm} BPM</span>
                <button className="secondary small" onClick={() => setBeat(b)}>
                  Laden
                </button>
                <button className="secondary small" onClick={() => setMeine(loescheBeat(b.name))} aria-label={`${b.name} löschen`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <details className="beat-fl">
        <summary>So kommt der Beat nach FL Studio</summary>
        <ol>
          <li>„Als MIDI für FL Studio“ speichert vier Takte als .mid-Datei, das Schlagzeug auf Kanal 10 (General MIDI: Kick 36, Snare 38, Clap 39, Hi-Hat 42, Open Hat 46).</li>
          <li>In FL Studio: Datei in die Playlist ziehen oder im Channel Rack einen Kanal wählen und in der Piano Roll über „Import MIDI file“ laden.</li>
          <li>Oder direkt nachbauen: Das Raster hier entspricht dem Channel Rack. Ein Pattern hat dort ebenfalls 16 Schritte (Steps), jede Zeile ist ein Kanal mit eigenem Sample.</li>
          <li>Swing heißt in FL Studio im Channel Rack ebenfalls „Swing“, die Velocity bearbeitest du in der Piano Roll unten im Event-Bereich.</li>
        </ol>
      </details>
    </section>
  );
}
