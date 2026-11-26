/** Einstellungen und Vorlagen des Synth-Labors (ohne Tone.js, damit Lektionen sie auch in Tests lesen können) */
export type Welle = 'sine' | 'triangle' | 'sawtooth' | 'square';
export type FilterTyp = 'lowpass' | 'highpass' | 'bandpass';

export interface SynthEinstellung {
  name: string;
  welle: Welle;
  /** Zweiter Oszillator leicht verstimmt (Cent), 0 = aus */
  detune: number;
  filter: FilterTyp;
  /** Grenzfrequenz in Hz */
  cutoff: number;
  /** Resonanz (Q) */
  resonanz: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  /** LFO auf die Grenzfrequenz: Geschwindigkeit in Hz und Tiefe 0–1 */
  lfoRate: number;
  lfoTiefe: number;
  /** Hall-Anteil 0–1 */
  hall: number;
  /** Lautstärke in dB */
  volume: number;
}

export const SYNTH_VORLAGEN: SynthEinstellung[] = [
  { name: 'Grundeinstellung', welle: 'sawtooth', detune: 0, filter: 'lowpass', cutoff: 2500, resonanz: 1, attack: 0.01, decay: 0.2, sustain: 0.7, release: 0.4, lfoRate: 2, lfoTiefe: 0, hall: 0.1, volume: -8 },
  { name: 'Sub-Bass', welle: 'sine', detune: 0, filter: 'lowpass', cutoff: 400, resonanz: 0.7, attack: 0.005, decay: 0.3, sustain: 0.9, release: 0.15, lfoRate: 1, lfoTiefe: 0, hall: 0, volume: -4 },
  { name: 'Saw-Lead', welle: 'sawtooth', detune: 12, filter: 'lowpass', cutoff: 3500, resonanz: 3, attack: 0.01, decay: 0.15, sustain: 0.8, release: 0.25, lfoRate: 5, lfoTiefe: 0, hall: 0.2, volume: -12 },
  { name: 'Pad', welle: 'sawtooth', detune: 18, filter: 'lowpass', cutoff: 1200, resonanz: 1, attack: 1.2, decay: 0.8, sustain: 0.8, release: 2.5, lfoRate: 0.3, lfoTiefe: 0.35, hall: 0.6, volume: -14 },
  { name: 'Pluck', welle: 'square', detune: 0, filter: 'lowpass', cutoff: 1800, resonanz: 4, attack: 0.002, decay: 0.25, sustain: 0, release: 0.3, lfoRate: 1, lfoTiefe: 0, hall: 0.3, volume: -10 },
  { name: 'Wobble-Bass', welle: 'sawtooth', detune: 8, filter: 'lowpass', cutoff: 600, resonanz: 8, attack: 0.01, decay: 0.2, sustain: 1, release: 0.2, lfoRate: 4, lfoTiefe: 0.8, hall: 0, volume: -10 },
  { name: 'Flöte (Sinus)', welle: 'sine', detune: 0, filter: 'lowpass', cutoff: 6000, resonanz: 0.7, attack: 0.08, decay: 0.2, sustain: 0.8, release: 0.4, lfoRate: 5, lfoTiefe: 0, hall: 0.35, volume: -8 },
];

const WELLEN_NAMEN: Record<Welle, string> = { sine: 'Sinus', triangle: 'Dreieck', sawtooth: 'Sägezahn', square: 'Rechteck' };
const FILTER_NAMEN: Record<FilterTyp, string> = { lowpass: 'Tiefpass', highpass: 'Hochpass', bandpass: 'Bandpass' };

/** Kurzform „welle sine; cutoff 400; attack 0.01 …“ auf der Grundeinstellung */
export function synthAusKurzform(s: string): SynthEinstellung {
  const e: SynthEinstellung = { ...SYNTH_VORLAGEN[0], name: 'Eigener Klang' };
  for (const teil of s.split(';')) {
    const [k, v] = teil.trim().split(/\s+/);
    if (!k) continue;
    if (k === 'welle') e.welle = v as Welle;
    else if (k === 'filter') e.filter = v as FilterTyp;
    else if (k in e) (e as unknown as Record<string, number>)[k] = Number(v);
    else throw new Error(`Unbekannter Synth-Parameter „${k}“`);
  }
  return e;
}

const PARAMETER: Record<string, { name: string; einheit: (v: number) => string }> = {
  cutoff: { name: 'Cutoff', einheit: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1).replace('.', ',')} kHz` : `${v} Hz`) },
  resonanz: { name: 'Resonanz', einheit: (v) => String(v).replace('.', ',') },
  attack: { name: 'Attack', einheit: (v) => `${Math.round(v * 1000)} ms` },
  decay: { name: 'Decay', einheit: (v) => `${Math.round(v * 1000)} ms` },
  sustain: { name: 'Sustain', einheit: (v) => `${Math.round(v * 100)} %` },
  release: { name: 'Release', einheit: (v) => `${Math.round(v * 1000)} ms` },
  detune: { name: 'Verstimmung', einheit: (v) => `${v} Cent` },
  lfoTiefe: { name: 'LFO-Tiefe', einheit: (v) => `${Math.round(v * 100)} %` },
  lfoRate: { name: 'LFO-Tempo', einheit: (v) => `${String(v).replace('.', ',')} Hz` },
  hall: { name: 'Hall', einheit: (v) => `${Math.round(v * 100)} %` },
};

/**
 * Prüft eine Synth-Einstellung, z. B. „welle sine“, „filter lowpass“,
 * „cutoff-max 600“, „attack-min 0.5“, „sustain-max 0.1“, „lfo“.
 */
export function pruefeSynth(e: SynthEinstellung, kriterien: string[]): { text: string; ok: boolean; hinweis?: string }[] {
  return kriterien.map((k) => {
    const [name, arg] = k.trim().split(/\s+/);
    if (name === 'welle') return { text: `Wellenform ${WELLEN_NAMEN[arg as Welle] ?? arg}`, ok: e.welle === arg, hinweis: `Gewählt: ${WELLEN_NAMEN[e.welle]}.` };
    if (name === 'filter') return { text: `Filter: ${FILTER_NAMEN[arg as FilterTyp] ?? arg}`, ok: e.filter === arg, hinweis: `Gewählt: ${FILTER_NAMEN[e.filter]}.` };
    if (name === 'lfo') return { text: 'LFO bewegt den Filter', ok: e.lfoTiefe >= 0.2, hinweis: 'Dreh die LFO-Tiefe auf mindestens 20 %.' };
    const m = /^(\w+)-(min|max)$/.exec(name);
    const p = m && PARAMETER[m[1]];
    if (!m || !p) return { text: `Unbekanntes Kriterium „${k}“`, ok: false };
    const soll = Number(arg);
    const ist = (e as unknown as Record<string, number>)[m[1]];
    const ok = m[2] === 'min' ? ist >= soll - 1e-9 : ist <= soll + 1e-9;
    return { text: `${p.name} ${m[2] === 'min' ? 'mindestens' : 'höchstens'} ${p.einheit(soll)}`, ok, hinweis: `Eingestellt: ${p.einheit(ist)}.` };
  });
}
