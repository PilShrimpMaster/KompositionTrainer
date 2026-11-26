import { buildSchedule } from '../audio/schedule';
import { instrument, MIDI_PROGRAMM } from '../model/instrumente';
import type { Score, TimeSignature } from '../model/types';

/**
 * Standard-MIDI-Datei (Format 1) schreiben, z. B. für den Import in FL Studio,
 * Ableton, Logic oder Cubase. Zeiten in Viertelnoten.
 */
export interface MidiNote {
  start: number;
  dauer: number;
  /** MIDI-Notennummer, c′ = 60 */
  note: number;
  /** 1–127 */
  velocity: number;
}

export interface MidiSpur {
  name: string;
  /** 0–15; 9 ist der Schlagzeugkanal */
  kanal: number;
  /** General-MIDI-Programm 1–128 */
  programm?: number;
  noten: MidiNote[];
}

export const PPQ = 480;

function varLen(n: number): number[] {
  const bytes = [n & 0x7f];
  n >>= 7;
  while (n > 0) {
    bytes.unshift((n & 0x7f) | 0x80);
    n >>= 7;
  }
  return bytes;
}

const text = (s: string) => Array.from(new TextEncoder().encode(s));
const u32 = (n: number) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];

function chunk(typ: string, daten: number[]): number[] {
  return [...text(typ), ...u32(daten.length), ...daten];
}

function meta(typ: number, daten: number[]): number[] {
  return [0xff, typ, ...varLen(daten.length), ...daten];
}

/** Schreibt die Spuren als SMF Format 1 mit Tempo- und Taktart-Spur */
export function schreibeSmf(spuren: MidiSpur[], tempo: number, takt: TimeSignature = { beats: 4, beatType: 4 }, titel = ''): Uint8Array {
  const mikro = Math.round(60_000_000 / tempo);
  const kopfSpur = [
    0,
    ...meta(0x03, text(titel || 'KompositionsTrainer')),
    0,
    ...meta(0x51, [(mikro >> 16) & 0xff, (mikro >> 8) & 0xff, mikro & 0xff]),
    0,
    ...meta(0x58, [takt.beats, Math.round(Math.log2(takt.beatType)), 24, 8]),
    0,
    ...meta(0x2f, []),
  ];
  const chunks = [chunk('MTrk', kopfSpur)];
  for (const s of spuren) {
    const k = s.kanal & 0x0f;
    const ereignisse: { tick: number; aus: boolean; bytes: number[] }[] = [];
    for (const n of s.noten) {
      const an = Math.max(0, Math.round(n.start * PPQ));
      const aus = Math.max(an + 1, Math.round((n.start + n.dauer) * PPQ));
      const note = Math.min(127, Math.max(0, Math.round(n.note)));
      const vel = Math.min(127, Math.max(1, Math.round(n.velocity)));
      ereignisse.push({ tick: an, aus: false, bytes: [0x90 | k, note, vel] });
      ereignisse.push({ tick: aus, aus: true, bytes: [0x80 | k, note, 0] });
    }
    // Bei gleicher Zeit zuerst Noten beenden, dann neue anschlagen
    ereignisse.sort((a, b) => a.tick - b.tick || Number(b.aus) - Number(a.aus));
    const daten: number[] = [0, ...meta(0x03, text(s.name))];
    if (s.programm && k !== 9) daten.push(0, 0xc0 | k, (s.programm - 1) & 0x7f);
    let zuletzt = 0;
    for (const e of ereignisse) {
      daten.push(...varLen(e.tick - zuletzt), ...e.bytes);
      zuletzt = e.tick;
    }
    daten.push(0, ...meta(0x2f, []));
    chunks.push(chunk('MTrk', daten));
  }
  const kopf = chunk('MThd', [0, 1, 0, chunks.length, (PPQ >> 8) & 0xff, PPQ & 0xff]);
  return new Uint8Array([...kopf, ...chunks.flat()]);
}

const STUFE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** „C#4“, „Bb3“ → MIDI-Nummer */
export function toneNameZuMidi(name: string): number {
  const m = /^([A-G])(##|#|bb|b)?(-?\d+)$/.exec(name);
  if (!m) throw new Error(`Unbekannter Ton „${name}“`);
  const alter = m[2] === '#' ? 1 : m[2] === '##' ? 2 : m[2] === 'b' ? -1 : m[2] === 'bb' ? -2 : 0;
  return 12 * (Number(m[3]) + 1) + STUFE[m[1]] + alter;
}

/** Wandelt eine Partitur aus dem Editor in MIDI-Spuren um: eine Spur je Stimme, Akkordsymbole als eigene Spur */
export function scoreZuMidi(score: Score): MidiSpur[] {
  const { events } = buildSchedule(score);
  const spuren: MidiSpur[] = score.voices.map((v, i) => {
    const inst = instrument(v.instrument);
    return {
      name: v.name || inst?.name || `Stimme ${i + 1}`,
      kanal: i >= 9 ? i + 1 : i,
      programm: (v.instrument && MIDI_PROGRAMM[v.instrument]) || 1,
      noten: [],
    };
  });
  const akkorde: MidiSpur = { name: 'Akkorde', kanal: Math.min(15, spuren.length >= 9 ? spuren.length + 1 : spuren.length), programm: 1, noten: [] };
  for (const e of events) {
    if (!e.note || e.length <= 0) continue;
    const ziel = e.id.startsWith('akkord-') ? akkorde : spuren[Number(e.id.split('-')[0])];
    if (!ziel) continue;
    ziel.noten.push({ start: e.start, dauer: e.length, note: toneNameZuMidi(e.note), velocity: Math.round((e.velocity ?? 0.7) * 127) });
  }
  return akkorde.noten.length ? [...spuren, akkorde] : spuren;
}

/** Partitur als .mid speichern */
export function scoreAlsMidi(score: Score): Uint8Array {
  return schreibeSmf(scoreZuMidi(score), score.tempo || 80, score.time, score.title);
}
