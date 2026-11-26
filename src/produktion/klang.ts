import * as Tone from 'tone';
import { hoerbar, SPUREN, STEPS, type Beat, type SpurId } from './beat';
import type { FilterTyp, SynthEinstellung, Welle } from './synthVorlagen';

export { SYNTH_VORLAGEN, type FilterTyp, type SynthEinstellung, type Welle } from './synthVorlagen';

/**
 * Klangerzeugung für den Produktionsbereich, komplett mit Tone.js synthetisiert
 * (keine Samples nötig): Drums, Synthesizer und Klänge für die Höraufgaben.
 */

interface Kanalzug {
  spiele: (time: number, velocity: number) => void;
  volume: Tone.Volume;
  panner: Tone.Panner;
  send: Tone.Gain;
}

let kanaele: Record<SpurId, Kanalzug> | null = null;
let master: Tone.Volume | null = null;
let hall: Tone.Reverb | null = null;

function erzeugeKanaele(): Record<SpurId, Kanalzug> {
  if (kanaele) return kanaele;
  master = new Tone.Volume(-4).toDestination();
  const limiter = new Tone.Limiter(-1).connect(master);
  hall = new Tone.Reverb({ decay: 1.8, preDelay: 0.01, wet: 1 }).connect(limiter);

  const zug = (quelle: (ziel: Tone.ToneAudioNode) => (time: number, velocity: number) => void): Kanalzug => {
    const volume = new Tone.Volume(0).connect(limiter);
    const panner = new Tone.Panner(0).connect(volume);
    const send = new Tone.Gain(0).connect(hall!);
    volume.connect(send);
    return { spiele: quelle(panner), volume, panner, send };
  };

  kanaele = {
    kick: zug((ziel) => {
      const s = new Tone.MembraneSynth({ pitchDecay: 0.045, octaves: 6, envelope: { attack: 0.001, decay: 0.42, sustain: 0, release: 0.1 } }).connect(ziel);
      return (t, v) => s.triggerAttackRelease('C1', 0.3, t, v);
    }),
    snare: zug((ziel) => {
      const filter = new Tone.Filter(1800, 'highpass').connect(ziel);
      const rauschen = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.17, sustain: 0 } }).connect(filter);
      const koerper = new Tone.MembraneSynth({ pitchDecay: 0.02, octaves: 2, envelope: { attack: 0.001, decay: 0.1, sustain: 0 } }).connect(ziel);
      return (t, v) => {
        rauschen.triggerAttackRelease(0.17, t, v);
        koerper.triggerAttackRelease('E3', 0.1, t, v * 0.6);
      };
    }),
    clap: zug((ziel) => {
      const filter = new Tone.Filter(1400, 'bandpass').connect(ziel);
      filter.Q.value = 1.2;
      const s = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.07, sustain: 0 } }).connect(filter);
      const schwanz = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.22, sustain: 0 } }).connect(filter);
      return (t, v) => {
        // Drei kurze Impulse wie mehrere Hände, dann der Nachklang
        s.triggerAttackRelease(0.02, t, v * 0.8);
        s.triggerAttackRelease(0.02, t + 0.011, v * 0.8);
        schwanz.triggerAttackRelease(0.2, t + 0.022, v);
      };
    }),
    hihat: zug((ziel) => {
      const filter = new Tone.Filter(7000, 'highpass').connect(ziel);
      const s = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.045, sustain: 0 } }).connect(filter);
      return (t, v) => s.triggerAttackRelease(0.04, t, v * 0.7);
    }),
    openhat: zug((ziel) => {
      const filter = new Tone.Filter(6500, 'highpass').connect(ziel);
      const s = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.002, decay: 0.32, sustain: 0 } }).connect(filter);
      return (t, v) => s.triggerAttackRelease(0.3, t, v * 0.55);
    }),
    tom: zug((ziel) => {
      const s = new Tone.MembraneSynth({ pitchDecay: 0.08, octaves: 2.5, envelope: { attack: 0.001, decay: 0.32, sustain: 0 } }).connect(ziel);
      return (t, v) => s.triggerAttackRelease('A2', 0.3, t, v);
    }),
    rim: zug((ziel) => {
      const filter = new Tone.Filter(2500, 'bandpass').connect(ziel);
      const s = new Tone.MembraneSynth({ pitchDecay: 0.005, octaves: 1, envelope: { attack: 0.001, decay: 0.04, sustain: 0 } }).connect(filter);
      return (t, v) => s.triggerAttackRelease('D5', 0.04, t, v);
    }),
    perc: zug((ziel) => {
      const filter = new Tone.Filter(5000, 'bandpass').connect(ziel);
      const s = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.012, decay: 0.06, sustain: 0 } }).connect(filter);
      return (t, v) => s.triggerAttackRelease(0.06, t, v * 0.6);
    }),
  };
  return kanaele;
}

/** Mischpult-Einstellungen eines Beats auf die Kanalzüge übertragen (Lautstärke, Panorama, Hall, Stumm/Solo) */
export function mischeBeat(beat: Beat) {
  if (!kanaele) return;
  for (const s of SPUREN) {
    const k = beat.kanaele[s.id];
    const z = kanaele[s.id];
    z.volume.volume.value = k.volume;
    z.volume.mute = !hoerbar(beat, s.id);
    z.panner.pan.value = k.pan;
    z.send.gain.value = k.hall;
  }
}

/** Einen einzelnen Drum-Klang sofort spielen (beim Antippen) */
export async function spieleDrum(id: SpurId, velocity = 1) {
  await Tone.start();
  const z = erzeugeKanaele()[id];
  z.spiele(Tone.now() + 0.02, velocity);
}

let laufend: { stop: () => void } | null = null;

/** Gerade laufende Wiedergabe des Produktionsbereichs anhalten */
export function stoppeProduktion() {
  laufend?.stop();
  laufend = null;
}

/**
 * Spielt den Beat in Schleife (oder `takte`-mal) und meldet den aktuellen Schritt.
 * `holeBeat` wird bei jedem Schritt gelesen, damit Änderungen sofort klingen.
 */
export async function spieleBeat(holeBeat: () => Beat, opt: { onStep?: (step: number) => void; onEnde?: () => void; takte?: number } = {}): Promise<() => void> {
  await Tone.start();
  stoppeProduktion();
  const z = erzeugeKanaele();
  const transport = Tone.getTransport();
  const draw = Tone.getDraw();
  transport.stop();
  transport.cancel();
  transport.position = 0;
  const start = holeBeat();
  transport.bpm.value = start.bpm;
  transport.swing = start.swing;
  transport.swingSubdivision = '16n';
  mischeBeat(start);
  let schritt = 0;
  const id = transport.scheduleRepeat((time) => {
    const beat = holeBeat();
    if (transport.bpm.value !== beat.bpm) transport.bpm.value = beat.bpm;
    if (transport.swing !== beat.swing) transport.swing = beat.swing;
    mischeBeat(beat);
    const i = schritt % STEPS;
    for (const s of SPUREN) {
      const v = beat.kanaele[s.id].steps[i];
      if (v > 0 && hoerbar(beat, s.id)) z[s.id].spiele(time, v);
    }
    const anzeige = i;
    draw.schedule(() => opt.onStep?.(anzeige), time);
    schritt++;
    if (opt.takte && schritt >= opt.takte * STEPS) {
      transport.clear(id);
      transport.scheduleOnce((t) => draw.schedule(() => stop(), t), `+${(60 / beat.bpm) * 0.5}`);
    }
  }, '16n');
  let gestoppt = false;
  const stop = () => {
    if (gestoppt) return;
    gestoppt = true;
    transport.stop();
    transport.cancel();
    opt.onStep?.(-1);
    opt.onEnde?.();
    if (laufend?.stop === stop) laufend = null;
  };
  laufend = { stop };
  transport.start('+0.08');
  return stop;
}

/* ---------- Synthesizer ---------- */

interface SynthKette {
  poly: Tone.PolySynth<Tone.Synth>;
  poly2: Tone.PolySynth<Tone.Synth>;
  filter: Tone.Filter;
  lfo: Tone.LFO;
  volume: Tone.Volume;
  hallSend: Tone.Gain;
  analyser: Tone.Waveform;
  spektrum: Tone.FFT;
}

let synth: SynthKette | null = null;

function erzeugeSynth(): SynthKette {
  if (synth) return synth;
  erzeugeKanaele();
  const analyser = new Tone.Waveform(1024);
  const spektrum = new Tone.FFT(512);
  const volume = new Tone.Volume(-8).toDestination();
  volume.connect(analyser);
  volume.connect(spektrum);
  const hallSend = new Tone.Gain(0).connect(hall!);
  volume.connect(hallSend);
  const filter = new Tone.Filter(2500, 'lowpass').connect(volume);
  const poly = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 12 } as never).connect(filter);
  const poly2 = new Tone.PolySynth(Tone.Synth, { maxPolyphony: 12 } as never).connect(filter);
  const lfo = new Tone.LFO(2, 200, 3000);
  synth = { poly, poly2, filter, lfo, volume, hallSend, analyser, spektrum };
  return synth;
}

/** Einstellungen auf den Synthesizer übertragen */
export function stelleSynth(e: SynthEinstellung) {
  const s = erzeugeSynth();
  const env = { attack: e.attack, decay: e.decay, sustain: e.sustain, release: e.release };
  s.poly.set({ oscillator: { type: e.welle }, envelope: env });
  s.poly2.set({ oscillator: { type: e.welle }, envelope: env, detune: e.detune });
  s.poly2.volume.value = e.detune ? -3 : -Infinity;
  s.poly.volume.value = e.detune ? -3 : 0;
  s.filter.type = e.filter;
  s.filter.Q.value = e.resonanz;
  s.volume.volume.value = e.volume;
  s.hallSend.gain.value = e.hall;
  if (e.lfoTiefe > 0) {
    s.lfo.frequency.value = e.lfoRate;
    s.lfo.min = Math.max(40, e.cutoff * (1 - 0.9 * e.lfoTiefe));
    s.lfo.max = Math.min(18000, e.cutoff * (1 + 4 * e.lfoTiefe));
    if (s.lfo.state !== 'started') {
      s.lfo.connect(s.filter.frequency);
      s.lfo.start();
    }
  } else {
    if (s.lfo.state === 'started') {
      s.lfo.stop();
      s.lfo.disconnect();
    }
    s.filter.frequency.value = e.cutoff;
  }
}

export async function synthAn(note: string, velocity = 0.8) {
  await Tone.start();
  const s = erzeugeSynth();
  s.poly.triggerAttack(note, undefined, velocity);
  s.poly2.triggerAttack(note, undefined, velocity);
}

export function synthAus(note: string) {
  if (!synth) return;
  synth.poly.triggerRelease(note);
  synth.poly2.triggerRelease(note);
}

export function synthAllesAus() {
  synth?.poly.releaseAll();
  synth?.poly2.releaseAll();
}

/** Kurze Phrase mit dem aktuellen Synth spielen (Vorschau) */
export async function synthPhrase(noten: string[], dauer = 0.32) {
  await Tone.start();
  const s = erzeugeSynth();
  const jetzt = Tone.now() + 0.05;
  noten.forEach((n, i) => {
    s.poly.triggerAttackRelease(n, dauer * 0.9, jetzt + i * dauer, 0.8);
    s.poly2.triggerAttackRelease(n, dauer * 0.9, jetzt + i * dauer, 0.8);
  });
}

export function synthWellenform(): Float32Array | null {
  return synth ? (synth.analyser.getValue() as Float32Array) : null;
}

export function synthSpektrum(): Float32Array | null {
  return synth ? (synth.spektrum.getValue() as Float32Array) : null;
}

/* ---------- Höraufgaben ---------- */

/** Spielt eine kurze Melodie mit einer reinen Wellenform (ohne Filter) */
export async function spieleWelle(welle: Welle) {
  await Tone.start();
  stoppeProduktion();
  const s = new Tone.Synth({ oscillator: { type: welle }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.2 }, volume: welle === 'sine' || welle === 'triangle' ? -6 : -14 }).toDestination();
  const jetzt = Tone.now() + 0.05;
  ['A3', 'C#4', 'E4', 'A4'].forEach((n, i) => s.triggerAttackRelease(n, 0.45, jetzt + i * 0.5));
  setTimeout(() => s.dispose(), 3000);
}

/** Bänder für die EQ-Höraufgabe */
export const EQ_BAENDER = [
  { id: 'bass', name: 'Bässe (um 100 Hz)', hz: 100 },
  { id: 'tiefmitten', name: 'Tiefe Mitten (um 400 Hz)', hz: 400 },
  { id: 'mitten', name: 'Mitten (um 1 kHz)', hz: 1000 },
  { id: 'praesenz', name: 'Präsenz (um 3 kHz)', hz: 3000 },
  { id: 'hoehen', name: 'Höhen (um 8 kHz)', hz: 8000 },
] as const;

/**
 * Rosa Rauschen zuerst neutral, dann mit einem um 12 dB angehobenen Band
 * (oder: zuerst neutral, dann durch einen Filter). Man vergleicht und benennt den Unterschied.
 */
export async function spieleEqVergleich(art: { band?: number; filter?: FilterTyp; cutoff?: number }) {
  await Tone.start();
  stoppeProduktion();
  const ausgang = new Tone.Volume(-16).toDestination();
  const rauschen = new Tone.Noise('pink').connect(ausgang);
  const jetzt = Tone.now() + 0.05;
  rauschen.start(jetzt).stop(jetzt + 1.2);
  const rauschen2 = new Tone.Noise('pink');
  let effekt: Tone.ToneAudioNode;
  if (art.band) {
    const eq = new Tone.Filter({ type: 'peaking', frequency: art.band, Q: 1.4, gain: 12 });
    const gain = new Tone.Volume(-8);
    eq.chain(gain, ausgang);
    effekt = eq;
  } else {
    effekt = new Tone.Filter(art.cutoff ?? 800, art.filter ?? 'lowpass').connect(ausgang);
  }
  rauschen2.connect(effekt);
  rauschen2.start(jetzt + 1.6).stop(jetzt + 2.8);
  setTimeout(() => {
    rauschen.dispose();
    rauschen2.dispose();
    effekt.dispose();
    ausgang.dispose();
  }, 3600);
}

/** Klang einer Produktions-Höraufgabe abspielen */
export async function spieleHoerprobe(p: { art: 'welle'; welle: Welle } | { art: 'eq'; band: number } | { art: 'beat'; beat: Beat }) {
  if (p.art === 'welle') return spieleWelle(p.welle);
  if (p.art === 'eq') return spieleEqVergleich({ band: p.band });
  await spieleBeat(() => p.beat, { takte: 2 });
}
