import * as Tone from 'tone';
import type { Score } from '../model/types';
import { buildSchedule } from './schedule';
import { KLANG_SAMPLES } from './klangSamples';

/** Salamander Grand Piano, jede kleine Terz ein Sample; Tone.js transponiert dazwischen. */
const SAMPLE_NOTES = ['C', 'Ds', 'Fs', 'A'];
const SAMPLE_OCTAVES = [1, 2, 3, 4, 5, 6, 7];

function sampleUrls(): Record<string, string> {
  const urls: Record<string, string> = { C8: 'C8.mp3' };
  for (const o of SAMPLE_OCTAVES) {
    for (const n of SAMPLE_NOTES) urls[n.replace('s', '#') + o] = `${n}${o}.mp3`;
  }
  return urls;
}

let sampler: Tone.Sampler | null = null;
let loading: Promise<Tone.Sampler> | null = null;

/**
 * Startet den Audio-Kontext und lädt die Klaviersamples.
 * Muss aus einem Tipp oder Klick heraus aufgerufen werden, sonst bleibt
 * Safari auf dem iPad stumm.
 */
export async function initAudio(): Promise<Tone.Sampler> {
  await Tone.start();
  if (sampler) return sampler;
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = new Tone.Sampler({
        urls: sampleUrls(),
        baseUrl: `${import.meta.env.BASE_URL}samples/piano/`,
        release: 1.2,
        onload: () => {
          sampler = s;
          resolve(s);
        },
        onerror: (e) => {
          loading = null;
          reject(e);
        },
      }).toDestination();
    });
  }
  return loading;
}

const klaenge = new Map<string, Promise<Tone.Sampler>>();

/** Lädt die Samples eines Instruments beim ersten Gebrauch (Streicher, Holz, Blech) */
export function ladeKlang(klang: string | undefined): Promise<Tone.Sampler> {
  if (!klang || !KLANG_SAMPLES[klang]) return initAudio();
  let p = klaenge.get(klang);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const urls: Record<string, string> = {};
      for (const n of KLANG_SAMPLES[klang]) urls[n] = `${n.replace('#', 's')}.mp3`;
      const s = new Tone.Sampler({
        urls,
        baseUrl: `${import.meta.env.BASE_URL}samples/instrumente/${klang}/`,
        release: 0.35,
        onload: () => resolve(s),
        onerror: (e) => {
          klaenge.delete(klang);
          reject(e);
        },
      }).toDestination();
    });
    klaenge.set(klang, p);
  }
  return p;
}

export interface PlaybackCallbacks {
  /** Wird genau zum Klangbeginn einer Note bzw. Pause aufgerufen. */
  onEvent: (id: string) => void;
  onEnd: () => void;
}

/** Spielt die Partitur ab und gibt eine Funktion zum Stoppen zurück. */
export async function play(score: Score, tempo: number, cb: PlaybackCallbacks): Promise<() => void> {
  const { events, total } = buildSchedule(score);
  await initAudio();
  const namen = [...new Set(events.map((e) => e.klang))];
  const geladen = await Promise.all(namen.map((k) => ladeKlang(k).catch(() => initAudio())));
  const instrumente = new Map(namen.map((k, i) => [k, geladen[i]]));
  const transport = Tone.getTransport();
  const draw = Tone.getDraw();
  transport.stop();
  transport.cancel();
  transport.position = 0;

  const secPerQuarter = 60 / tempo;

  for (const e of events) {
    transport.schedule((time) => {
      if (e.note && e.length > 0) {
        instrumente.get(e.klang)!.triggerAttackRelease(e.note, e.length * secPerQuarter * (e.klang ? 0.98 : 0.95), time, e.velocity ?? 0.7);
      }
      draw.schedule(() => cb.onEvent(e.id), time);
    }, e.start * secPerQuarter);
  }

  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    transport.stop();
    transport.cancel();
    instrumente.forEach((s) => s.releaseAll());
    cb.onEnd();
  };

  transport.schedule((time) => draw.schedule(stop, time), total * secPerQuarter + 0.3);
  // Kleiner Vorlauf, damit der erste Ton nicht abgeschnitten wird
  transport.start('+0.1');
  return stop;
}

/** Einzelnen Ton sofort anspielen, z. B. beim Setzen einer Note */
export async function playNote(note: string, seconds = 0.6, velocity = 0.7, klang?: string): Promise<void> {
  await initAudio();
  const s = await ladeKlang(klang).catch(() => initAudio());
  s.triggerAttackRelease(note, seconds, undefined, velocity);
}

/** Klavier bereits geladen? Dann klingt die erste Note ohne Verzögerung. */
export function audioReady(): boolean {
  return sampler !== null;
}

/** Mehrere Töne gleichzeitig (Akkord oder harmonisches Intervall) */
export async function playChord(notes: string[], seconds = 1.5): Promise<void> {
  const piano = await initAudio();
  piano.triggerAttackRelease(notes, seconds, undefined, 0.7);
}

/** Töne nacheinander, z. B. ein melodisches Intervall oder ein Diktat */
export async function playSequence(notes: string[], secondsEach = 0.7, klang?: string): Promise<void> {
  await initAudio();
  const piano = await ladeKlang(klang).catch(() => initAudio());
  const now = Tone.now() + 0.05;
  notes.forEach((n, i) => piano.triggerAttackRelease(n, secondsEach * 0.95, now + i * secondsEach, 0.7));
}
