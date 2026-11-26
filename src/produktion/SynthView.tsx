import { useEffect, useMemo, useRef, useState } from 'react';
import { erledigt } from '../lernpfad/erledigt';
import type { Schreibaufgabe } from '../lernpfad/lektion';
import { pruefeSynth } from './synthVorlagen';
import { aufgabeNeuGestartet } from './aufgabeStart';
import { MidiInput, midiSupported } from '../midi/midi';
import { stelleSynth, SYNTH_VORLAGEN, synthAllesAus, synthAn, synthAus, synthPhrase, synthSpektrum, synthWellenform, type FilterTyp, type SynthEinstellung, type Welle } from './klang';

const WELLEN: { id: Welle; name: string }[] = [
  { id: 'sine', name: 'Sinus' },
  { id: 'triangle', name: 'Dreieck' },
  { id: 'sawtooth', name: 'Sägezahn' },
  { id: 'square', name: 'Rechteck' },
];

const FILTER: { id: FilterTyp; name: string }[] = [
  { id: 'lowpass', name: 'Tiefpass' },
  { id: 'highpass', name: 'Hochpass' },
  { id: 'bandpass', name: 'Bandpass' },
];

const NAMEN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiName = (m: number) => `${NAMEN[m % 12]}${Math.floor(m / 12) - 1}`;
/** Computertastatur wie in vielen DAWs: untere Reihe weiße, obere schwarze Tasten */
const TASTEN: Record<string, number> = { a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, z: 8, y: 8, h: 9, u: 10, j: 11, k: 12, o: 13, l: 14 };


const SPEICHER = 'kt-synth-v1';

function ladeEinstellung(name?: string): SynthEinstellung {
  if (name) {
    const v = SYNTH_VORLAGEN.find((x) => x.name === name);
    if (v) return { ...v };
  }
  try {
    const e = JSON.parse(localStorage.getItem(SPEICHER) ?? 'null') as SynthEinstellung | null;
    if (e && e.welle) return { ...SYNTH_VORLAGEN[0], ...e };
  } catch {
    /* ignorieren */
  }
  return { ...SYNTH_VORLAGEN[0] };
}

/** Hz-Regler logarithmisch: 0–1000 → 40 Hz bis 16 kHz */
const zuHz = (x: number) => Math.round(40 * Math.pow(400, x / 1000));
const vonHz = (hz: number) => Math.round((1000 * Math.log(hz / 40)) / Math.log(400));
const hzText = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(1).replace('.', ',')} kHz` : `${hz} Hz`);

interface Props {
  /** Name einer Vorlage, mit der das Labor startet (aus einer Lektion) */
  vorlage?: string;
  aufgabe?: Schreibaufgabe | null;
  onAufgabeSchliessen?: () => void;
}

/** Synth-Labor: subtraktive Synthese zum Ausprobieren, mit Oszilloskop und Spektrum */
export function SynthView({ vorlage, aufgabe, onAufgabeSchliessen }: Props) {
  const [e, setE] = useState<SynthEinstellung>(() => ladeEinstellung(vorlage));
  const [geprueft, setGeprueft] = useState(false);
  const ergebnis = useMemo(() => (aufgabe ? pruefeSynth(e, aufgabe.pruefung) : []), [e, aufgabe]);
  const alleOk = ergebnis.length > 0 && ergebnis.every((p) => p.ok);
  useEffect(() => setGeprueft(false), [aufgabe, e]);
  useEffect(() => {
    if (aufgabe && geprueft && alleOk) erledigt(`aufgabe:${aufgabe.id}`);
  }, [aufgabe, geprueft, alleOk]);
  const [oktave, setOktave] = useState(4);
  const [gedrueckt, setGedrueckt] = useState<number[]>([]);
  const [midiStatus, setMidiStatus] = useState<'aus' | 'an' | 'fehler'>('aus');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spektrumRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (vorlage) setE(ladeEinstellung(vorlage));
  }, [vorlage]);
  useEffect(() => {
    if (aufgabe && aufgabeNeuGestartet(aufgabe.id)) setE({ ...SYNTH_VORLAGEN[0] });
  }, [aufgabe?.id]);

  useEffect(() => {
    stelleSynth(e);
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(e));
    } catch {
      /* ignorieren */
    }
  }, [e]);

  // Oszilloskop und Spektrum zeichnen
  useEffect(() => {
    let raf = 0;
    const zeichne = () => {
      raf = requestAnimationFrame(zeichne);
      const c = canvasRef.current;
      const w = synthWellenform();
      const farbe = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2a1f4e';
      if (c && w) {
        const g = c.getContext('2d')!;
        g.clearRect(0, 0, c.width, c.height);
        g.strokeStyle = farbe;
        g.lineWidth = 2;
        g.beginPath();
        // Beim Nulldurchgang beginnen, damit das Bild steht
        let start = 0;
        for (let i = 1; i < w.length / 2; i++) if (w[i - 1] < 0 && w[i] >= 0) {
          start = i;
          break;
        }
        const n = Math.min(512, w.length - start);
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1)) * c.width;
          const y = c.height / 2 - w[start + i] * (c.height / 2) * 0.9;
          if (i === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      const s = spektrumRef.current;
      const f = synthSpektrum();
      if (s && f) {
        const g = s.getContext('2d')!;
        g.clearRect(0, 0, s.width, s.height);
        g.fillStyle = farbe;
        // Logarithmische Frequenzachse 40 Hz – 16 kHz
        const nyquist = 22050;
        for (let x = 0; x < s.width; x += 3) {
          const hz = 40 * Math.pow(400, x / s.width);
          const bin = Math.min(f.length - 1, Math.round((hz / nyquist) * f.length));
          const db = f[bin];
          const h = Math.max(0, ((db + 100) / 100) * s.height);
          g.fillRect(x, s.height - h, 2, h);
        }
      }
    };
    zeichne();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Computertastatur
  useEffect(() => {
    const unten = (ev: KeyboardEvent) => {
      if (ev.repeat || ev.metaKey || ev.ctrlKey || (ev.target as HTMLElement).closest('input, select, textarea')) return;
      const t = TASTEN[ev.key.toLowerCase()];
      if (t === undefined) return;
      an((oktave + 1) * 12 + t);
    };
    const oben = (ev: KeyboardEvent) => {
      const t = TASTEN[ev.key.toLowerCase()];
      if (t !== undefined) aus((oktave + 1) * 12 + t);
    };
    window.addEventListener('keydown', unten);
    window.addEventListener('keyup', oben);
    return () => {
      window.removeEventListener('keydown', unten);
      window.removeEventListener('keyup', oben);
      synthAllesAus();
    };
  }, [oktave]);

  function an(m: number, velocity = 0.8) {
    setGedrueckt((g) => [...g.filter((x) => x !== m), m]);
    synthAn(midiName(m), velocity).catch(() => {});
  }
  function aus(m: number) {
    setGedrueckt((g) => g.filter((x) => x !== m));
    synthAus(midiName(m));
  }

  const midiRef = useRef<MidiInput | null>(null);
  useEffect(() => () => midiRef.current?.disconnect(), []);
  async function midiVerbinden() {
    const input = new MidiInput({ onNoteOn: (m, v) => an(m, v / 127), onNoteOff: (m) => aus(m), onDevices: () => {} });
    try {
      await input.connect();
      midiRef.current = input;
      setMidiStatus('an');
    } catch {
      setMidiStatus('fehler');
    }
  }

  const set = (teil: Partial<SynthEinstellung>) => setE((alt) => ({ ...alt, ...teil, name: teil.name ?? 'Eigener Klang' }));
  const regler = (label: string, wert: number, min: number, max: number, step: number, anzeige: string, onChange: (v: number) => void, hilfe?: string) => (
    <label className="synth-regler" title={hilfe}>
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={wert} onChange={(ev) => onChange(Number(ev.target.value))} aria-label={label} />
      <span className="meta">{anzeige}</span>
    </label>
  );

  const tasten = Array.from({ length: 25 }, (_, i) => (oktave + 1) * 12 + i);

  return (
    <section className="synth-labor">
      {aufgabe && (
        <section className="aufgabe-panel" aria-label="Aufgabe">
          <div className="aufgabe-kopf">
            <strong>Aufgabe: {aufgabe.titel}</strong>
            <button className="secondary small" onClick={onAufgabeSchliessen} aria-label="Aufgabe schließen">
              ✕
            </button>
          </div>
          <p>{aufgabe.text}</p>
          <div className="json-actions">
            <button className="secondary" onClick={() => setE({ ...SYNTH_VORLAGEN[0], name: 'Eigener Klang' })}>
              Mit der Grundeinstellung beginnen
            </button>
            <button onClick={() => setGeprueft(true)}>Klang prüfen</button>
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
              <p>Geschafft! Spiel ein paar Töne und bau denselben Klang in FL Studio mit 3x Osc oder einem anderen Synthesizer nach.</p>
            </div>
          )}
        </section>
      )}
      <div className="synth-kopf">
        <label className="field">
          <span>Vorlage</span>
          <select value={SYNTH_VORLAGEN.some((v) => v.name === e.name) ? e.name : ''} onChange={(ev) => ev.target.value && setE(ladeEinstellung(ev.target.value))}>
            <option value="">Eigener Klang</option>
            {SYNTH_VORLAGEN.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary" onClick={() => synthPhrase(['C3', 'C3', 'G3', 'C4', 'A#3', 'G3', 'F3', 'G3'].map((n) => n.replace(/\d/, (o) => String(Number(o) + oktave - 3)))).catch(() => {})}>
          ▶ Phrase anhören
        </button>
        {midiSupported() && (
          <button className="secondary" onClick={midiVerbinden} disabled={midiStatus === 'an'}>
            {midiStatus === 'an' ? 'MIDI-Keyboard verbunden' : midiStatus === 'fehler' ? 'MIDI erneut versuchen' : 'MIDI-Keyboard verbinden'}
          </button>
        )}
      </div>

      <div className="synth-module">
        <fieldset>
          <legend>Oszillator</legend>
          <div className="segment" role="group" aria-label="Wellenform">
            {WELLEN.map((w) => (
              <button key={w.id} className={e.welle === w.id ? '' : 'secondary'} onClick={() => set({ welle: w.id })} aria-pressed={e.welle === w.id}>
                {w.name}
              </button>
            ))}
          </div>
          {regler('Verstimmung', e.detune, 0, 40, 1, e.detune ? `${e.detune} Cent` : 'aus', (v) => set({ detune: v }), 'Zweiter Oszillator leicht verstimmt: macht den Klang breiter (Supersaw)')}
        </fieldset>
        <fieldset>
          <legend>Filter</legend>
          <div className="segment" role="group" aria-label="Filtertyp">
            {FILTER.map((f) => (
              <button key={f.id} className={e.filter === f.id ? '' : 'secondary'} onClick={() => set({ filter: f.id })} aria-pressed={e.filter === f.id}>
                {f.name}
              </button>
            ))}
          </div>
          {regler('Cutoff', vonHz(e.cutoff), 0, 1000, 1, hzText(e.cutoff), (v) => set({ cutoff: zuHz(v) }), 'Grenzfrequenz des Filters')}
          {regler('Resonanz', e.resonanz, 0.5, 15, 0.5, e.resonanz.toFixed(1).replace('.', ','), (v) => set({ resonanz: v }), 'Hebt die Frequenzen an der Grenze an, bis der Filter pfeift')}
        </fieldset>
        <fieldset>
          <legend>Hüllkurve (ADSR)</legend>
          {regler('Attack', e.attack, 0.001, 2, 0.001, `${Math.round(e.attack * 1000)} ms`, (v) => set({ attack: v }), 'Einschwingzeit bis zur vollen Lautstärke')}
          {regler('Decay', e.decay, 0.01, 2, 0.01, `${Math.round(e.decay * 1000)} ms`, (v) => set({ decay: v }), 'Abfall nach dem Höhepunkt bis zum Sustain-Pegel')}
          {regler('Sustain', e.sustain, 0, 1, 0.01, `${Math.round(e.sustain * 100)} %`, (v) => set({ sustain: v }), 'Pegel, solange die Taste gehalten wird')}
          {regler('Release', e.release, 0.01, 4, 0.01, `${Math.round(e.release * 1000)} ms`, (v) => set({ release: v }), 'Ausklingen nach dem Loslassen')}
        </fieldset>
        <fieldset>
          <legend>LFO auf den Filter</legend>
          {regler('Tempo', e.lfoRate, 0.1, 12, 0.1, `${e.lfoRate.toFixed(1).replace('.', ',')} Hz`, (v) => set({ lfoRate: v }), 'Wie schnell der LFO schwingt')}
          {regler('Tiefe', e.lfoTiefe, 0, 1, 0.01, e.lfoTiefe ? `${Math.round(e.lfoTiefe * 100)} %` : 'aus', (v) => set({ lfoTiefe: v }), 'Wie stark der LFO die Grenzfrequenz bewegt')}
          {regler('Hall', e.hall, 0, 1, 0.01, `${Math.round(e.hall * 100)} %`, (v) => set({ hall: v }))}
          {regler('Lautstärke', e.volume, -30, 0, 1, `${e.volume} dB`, (v) => set({ volume: v }))}
        </fieldset>
      </div>

      <div className="synth-anzeigen">
        <figure>
          <canvas ref={canvasRef} width={480} height={120} aria-label="Oszilloskop: die Wellenform" />
          <figcaption className="meta">Oszilloskop: die Form der Welle</figcaption>
        </figure>
        <figure>
          <canvas ref={spektrumRef} width={480} height={120} aria-label="Spektrum: die Obertöne" />
          <figcaption className="meta">Spektrum: tiefe Frequenzen links, hohe rechts</figcaption>
        </figure>
      </div>

      <div className="synth-tastatur-kopf">
        <button className="secondary small" onClick={() => setOktave((o) => Math.max(1, o - 1))} aria-label="Oktave tiefer">
          ◀ Oktave
        </button>
        <span className="meta">C{oktave} bis C{oktave + 2} · Computertastatur: A W S E D F T G Z H U J K</span>
        <button className="secondary small" onClick={() => setOktave((o) => Math.min(6, o + 1))} aria-label="Oktave höher">
          Oktave ▶
        </button>
      </div>
      <div className="synth-tastatur" onPointerLeave={() => gedrueckt.forEach(aus)}>
        {tasten.map((m) => {
          const schwarz = [1, 3, 6, 8, 10].includes(m % 12);
          return (
            <button
              key={m}
              className={`synth-taste ${schwarz ? 'schwarz' : 'weiss'} ${gedrueckt.includes(m) ? 'is-an' : ''}`}
              aria-label={midiName(m)}
              onPointerDown={(ev) => {
                (ev.target as HTMLElement).releasePointerCapture?.(ev.pointerId);
                an(m);
              }}
              onPointerUp={() => aus(m)}
              onPointerEnter={(ev) => ev.buttons && an(m)}
              onPointerLeave={() => gedrueckt.includes(m) && aus(m)}
            />
          );
        })}
      </div>
    </section>
  );
}
