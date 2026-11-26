import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '../navigation';
import type { Beat } from './beat';
import { BeatGrid } from './BeatGrid';
import { spieleBeat, stelleSynth, synthPhrase } from './klang';
import { SYNTH_VORLAGEN } from './synthVorlagen';

/** Beat in einer Lektion: Raster ansehen, abspielen, im Beat-Baukasten weiterbauen */
export function BeatBeispiel({ titel, beat }: { titel: string; beat: Beat }) {
  const [step, setStep] = useState(-1);
  const [laeuft, setLaeuft] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  const { oeffneProduktion } = useNavigation();
  useEffect(() => () => stopRef.current?.(), []);

  async function abspielen() {
    if (laeuft) {
      stopRef.current?.();
      return;
    }
    setLaeuft(true);
    try {
      stopRef.current = await spieleBeat(() => beat, {
        onStep: setStep,
        takte: 4,
        onEnde: () => {
          setLaeuft(false);
          stopRef.current = null;
        },
      });
    } catch {
      setLaeuft(false);
    }
  }

  function weiterbauen() {
    stopRef.current?.();
    try {
      localStorage.setItem('kt-beat-entwurf', JSON.stringify({ ...beat, name: titel }));
    } catch {
      /* ignorieren */
    }
    oeffneProduktion('beat');
  }

  return (
    <figure className="sheet beat-beispiel">
      <figcaption className="sheet-head">
        <h2>{titel}</h2>
        <span className="meta">
          {beat.bpm} BPM{beat.swing ? ` · Swing ${Math.round(beat.swing * 100)} %` : ''}
        </span>
      </figcaption>
      <BeatGrid beat={beat} aktiv={step} nurBenutzte />
      <div className="json-actions">
        <button onClick={abspielen}>{laeuft ? '■ Stopp' : '▶ Anhören'}</button>
        <button className="secondary" onClick={weiterbauen}>
          Im Beat-Baukasten öffnen
        </button>
      </div>
    </figure>
  );
}

/** Synth-Klang in einer Lektion: Vorlage anhören und im Synth-Labor öffnen */
export function SynthBeispiel({ titel, vorlage, noten }: { titel: string; vorlage: string; noten: string[] }) {
  const { oeffneProduktion } = useNavigation();
  const e = SYNTH_VORLAGEN.find((v) => v.name === vorlage)!;
  return (
    <div className="aufgabe-karte synth-beispiel">
      <strong>{titel}</strong>
      <p className="meta">
        Vorlage „{e.name}“: {WELLE[e.welle]}, {FILTER[e.filter]} bei {e.cutoff >= 1000 ? `${(e.cutoff / 1000).toFixed(1).replace('.', ',')} kHz` : `${e.cutoff} Hz`}, Attack {Math.round(e.attack * 1000)} ms, Release {Math.round(e.release * 1000)} ms
        {e.lfoTiefe ? `, LFO ${e.lfoRate} Hz` : ''}.
      </p>
      <div className="json-actions">
        <button
          onClick={() => {
            stelleSynth(e);
            synthPhrase(noten, e.attack > 0.5 ? 1.2 : 0.32).catch(() => {});
          }}
        >
          ▶ Anhören
        </button>
        <button className="secondary" onClick={() => oeffneProduktion('synth', vorlage)}>
          Im Synth-Labor öffnen
        </button>
      </div>
    </div>
  );
}

const WELLE = { sine: 'Sinus', triangle: 'Dreieck', sawtooth: 'Sägezahn', square: 'Rechteck' } as const;
const FILTER = { lowpass: 'Tiefpass', highpass: 'Hochpass', bandpass: 'Bandpass' } as const;
