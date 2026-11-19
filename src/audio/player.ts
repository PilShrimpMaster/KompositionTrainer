import * as Tone from 'tone';
import type { Score } from '../model/types';
import { buildSchedule } from './schedule';

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

export interface PlaybackCallbacks {
  /** Wird genau zum Klangbeginn einer Note bzw. Pause aufgerufen. */
  onEvent: (id: string) => void;
  onEnd: () => void;
}

/** Spielt die Partitur ab und gibt eine Funktion zum Stoppen zurück. */
export async function play(score: Score, tempo: number, cb: PlaybackCallbacks): Promise<() => void> {
  const piano = await initAudio();
  const transport = Tone.getTransport();
  const draw = Tone.getDraw();
  transport.stop();
  transport.cancel();
  transport.position = 0;

  const secPerQuarter = 60 / tempo;
  const { events, total } = buildSchedule(score);

  for (const e of events) {
    transport.schedule((time) => {
      if (e.note && e.length > 0) {
        piano.triggerAttackRelease(e.note, e.length * secPerQuarter * 0.95, time, e.velocity ?? 0.7);
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
    piano.releaseAll();
    cb.onEnd();
  };

  transport.schedule((time) => draw.schedule(stop, time), total * secPerQuarter + 0.3);
  // Kleiner Vorlauf, damit der erste Ton nicht abgeschnitten wird
  transport.start('+0.1');
  return stop;
}

/** Einzelnen Ton sofort anspielen, z. B. beim Setzen einer Note */
export async function playNote(note: string, seconds = 0.6, velocity = 0.7): Promise<void> {
  const piano = await initAudio();
  piano.triggerAttackRelease(note, seconds, undefined, velocity);
}

/** Klavier bereits geladen? Dann klingt die erste Note ohne Verzögerung. */
export function audioReady(): boolean {
  return sampler !== null;
}
