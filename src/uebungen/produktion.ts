import { VORLAGEN, vorlage } from '../produktion/beat';
import type { Aufgabe, Stufe } from './aufgaben';

/** Höraufgaben zur Musikproduktion: Wellenformen, EQ-Bereiche, Grooves und Tempo */
type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const WELLEN = [
  { id: 'sine', name: 'Sinus', text: 'Ein Sinus hat nur den Grundton, keine Obertöne: weich und rund wie eine Flöte. Im Bass ist er der klassische Sub-Bass und die Basis der 808.' },
  { id: 'triangle', name: 'Dreieck', text: 'Ein Dreieck hat nur ungerade Obertöne, die schnell leiser werden: weich, aber etwas heller als ein Sinus, gut für sanfte Leads.' },
  { id: 'sawtooth', name: 'Sägezahn', text: 'Ein Sägezahn enthält alle Obertöne: hell, scharf und schnarrend. Er ist der Ausgangspunkt für Leads, Pads, Streicher und Supersaws.' },
  { id: 'square', name: 'Rechteck', text: 'Ein Rechteck hat nur ungerade Obertöne in voller Stärke: hohl und nasal wie eine Klarinette, typisch für Chiptune und Retro-Sounds.' },
] as const;

export function wellenformAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = stufe === 1 ? WELLEN.filter((w) => w.id !== 'triangle') : WELLEN;
  const w = pick(rng, pool);
  return {
    typ: 'wellenform-hoeren',
    frage: 'Welche Wellenform hörst du?',
    produktion: { art: 'welle', welle: w.id },
    optionen: shuffle(rng, pool.map((x) => x.name)),
    loesung: w.name,
    erklaerung: w.text,
    begriff: 'wellenform',
  };
}

export const BAENDER = [
  { id: 'bass', name: 'Bässe (um 100 Hz)', hz: 100, text: 'Um 100 Hz sitzen Kick und Bass. Zu viel davon macht den Mix dröhnend, zu wenig dünn.' },
  { id: 'tiefmitten', name: 'Tiefe Mitten (um 400 Hz)', hz: 400, text: 'Um 300 bis 500 Hz klingt es schnell „mulmig“ oder pappig. Hier wird im Mix oft etwas abgesenkt.' },
  { id: 'mitten', name: 'Mitten (um 1 kHz)', hz: 1000, text: 'Um 1 kHz liegt der Kern vieler Instrumente und der Stimme. Angehoben klingt es nasal, wie durch ein Telefon.' },
  { id: 'praesenz', name: 'Präsenz (um 3 kHz)', hz: 3000, text: 'Um 2 bis 5 kHz ist das Ohr am empfindlichsten. Ein wenig mehr bringt Stimmen und Snare nach vorn, zu viel wird schnell aggressiv.' },
  { id: 'hoehen', name: 'Höhen (um 8 kHz)', hz: 8000, text: 'Ab etwa 8 kHz liegen Luft und Glanz: Becken, Hi-Hats, das Zischen der S-Laute.' },
] as const;

export function eqAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = stufe === 1 ? BAENDER.filter((b) => ['bass', 'mitten', 'hoehen'].includes(b.id)) : stufe === 2 ? BAENDER.filter((b) => b.id !== 'tiefmitten') : BAENDER;
  const b = pick(rng, pool);
  return {
    typ: 'eq-hoeren',
    frage: 'Zuerst klingt das Rauschen neutral, dann ist ein Frequenzbereich um 12 dB angehoben. Welcher?',
    produktion: { art: 'eq', band: b.hz },
    optionen: shuffle(rng, pool.map((x) => x.name)),
    loesung: b.name,
    erklaerung: b.text,
    begriff: 'equalizer',
  };
}

const GROOVE_POOL: Record<Stufe, string[]> = {
  1: ['house', 'hiphop', 'rock', 'reggaeton'],
  2: ['house', 'hiphop', 'rock', 'reggaeton', 'trap', 'funk'],
  3: ['house', 'techno', 'hiphop', 'rock', 'reggaeton', 'trap', 'funk', 'dnb'],
};

export function grooveAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = GROOVE_POOL[stufe];
  const id = pick(rng, pool);
  const v = VORLAGEN.find((x) => x.id === id)!;
  const ablenker = shuffle(
    rng,
    pool.filter((x) => x !== id),
  ).slice(0, 3);
  return {
    typ: 'groove-erkennen',
    frage: 'Welches Genre hat dieses Drum-Pattern?',
    produktion: { art: 'beat', beat: vorlage(id) },
    optionen: shuffle(rng, [id, ...ablenker]).map((x) => VORLAGEN.find((y) => y.id === x)!.name),
    loesung: v.name,
    erklaerung: v.beschreibung,
    begriff: 'drum-pattern',
  };
}

export const TEMPI = [
  { name: 'Langsam (70–90 BPM)', von: 70, bis: 90 },
  { name: 'Mittel (95–115 BPM)', von: 95, bis: 115 },
  { name: 'Zügig (120–135 BPM)', von: 120, bis: 135 },
  { name: 'Schnell (140–160 BPM)', von: 140, bis: 160 },
  { name: 'Sehr schnell (165–180 BPM)', von: 165, bis: 180 },
] as const;

export function tempoAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = stufe === 1 ? [TEMPI[0], TEMPI[2], TEMPI[4]] : TEMPI;
  const t = pick(rng, pool);
  const bpm = t.von + Math.round(rng() * (t.bis - t.von));
  const beat = { ...vorlage(pick(rng, ['house', 'rock', 'hiphop', 'reggaeton'])), bpm };
  return {
    typ: 'tempo-schaetzen',
    frage: 'Wie schnell ist dieser Beat? Zähl die Viertel mit (die Kick oder die Hi-Hat helfen).',
    produktion: { art: 'beat', beat },
    optionen: pool.map((x) => x.name),
    loesung: t.name,
    erklaerung: `Der Beat lief mit ${bpm} BPM. Faustregeln: Hip-Hop 85–95, Reggaeton 90–100, House 120–128, Techno 125–140, Trap 130–150 (gefühlt halb so schnell), Drum & Bass 170–176.`,
    begriff: 'tempo',
  };
}
