import type { Pruefpunkt } from '../lernpfad/pruefung';
import type { MidiSpur } from '../midi/smf';

/**
 * Beat-Baukasten: ein Step-Sequencer wie das Channel Rack in FL Studio.
 * Ein Pattern hat 16 Schritte (Sechzehntel eines 4/4-Takts); jeder Schritt speichert
 * die Anschlagstärke 0 (aus) bis 1.
 */
export type SpurId = 'kick' | 'snare' | 'clap' | 'hihat' | 'openhat' | 'tom' | 'rim' | 'perc';

export interface SpurInfo {
  id: SpurId;
  name: string;
  /** General-MIDI-Schlagzeugnote (Kanal 10) */
  gm: number;
  /** Lexikon-Begriff */
  begriff?: string;
}

export const SPUREN: SpurInfo[] = [
  { id: 'kick', name: 'Kick', gm: 36 },
  { id: 'snare', name: 'Snare', gm: 38 },
  { id: 'clap', name: 'Clap', gm: 39 },
  { id: 'hihat', name: 'Hi-Hat', gm: 42 },
  { id: 'openhat', name: 'Open Hat', gm: 46 },
  { id: 'tom', name: 'Tom', gm: 45 },
  { id: 'rim', name: 'Rimshot', gm: 37 },
  { id: 'perc', name: 'Shaker', gm: 70 },
];

export const STEPS = 16;

export interface Kanal {
  /** Anschlagstärke je Schritt, 0 = aus */
  steps: number[];
  /** Lautstärke in dB (−30 bis +6) */
  volume: number;
  /** Panorama −1 (links) bis 1 (rechts) */
  pan: number;
  /** Anteil, der in den Hall geht (0–1) */
  hall: number;
  stumm: boolean;
  solo: boolean;
}

export interface Beat {
  name: string;
  bpm: number;
  /** Swing 0–1 auf den Sechzehnteln (1 = triolisch) */
  swing: number;
  kanaele: Record<SpurId, Kanal>;
}

export const LAUT = 1;
export const MITTEL = 0.65;
export const LEISE = 0.35;

export function leererKanal(): Kanal {
  return { steps: Array(STEPS).fill(0), volume: 0, pan: 0, hall: 0, stumm: false, solo: false };
}

export function leererBeat(name = 'Mein Beat', bpm = 120): Beat {
  return { name, bpm, swing: 0, kanaele: Object.fromEntries(SPUREN.map((s) => [s.id, leererKanal()])) as Record<SpurId, Kanal> };
}

/**
 * Kurzschrift für ein Pattern: „x“ laut, „o“ mittel, „-“ leise (Ghost Note), „.“ aus.
 * Leerzeichen und „|“ dürfen zur Gliederung stehen: „x... x... x... x...“.
 */
export function parseSteps(s: string): number[] {
  const zeichen = s.replace(/[\s|]/g, '');
  if (zeichen.length !== STEPS) throw new Error(`Pattern „${s}“ hat ${zeichen.length} statt ${STEPS} Schritte`);
  return [...zeichen].map((c) => {
    if (c === 'x' || c === 'X') return LAUT;
    if (c === 'o') return MITTEL;
    if (c === '-') return LEISE;
    if (c === '.') return 0;
    throw new Error(`Unbekanntes Zeichen „${c}“ im Pattern`);
  });
}

export function stepsText(steps: number[]): string {
  return steps
    .map((v) => (v <= 0 ? '.' : v >= 0.85 ? 'x' : v >= 0.5 ? 'o' : '-'))
    .join('')
    .replace(/(.{4})(?=.)/g, '$1 ');
}

const SPUR_IDS = new Set<string>(SPUREN.map((s) => s.id));

/**
 * Beat aus Kopfzeilen lesen: „bpm: 124“, „swing: 30“ (Prozent), „name: …“ und je Spur
 * eine Zeile „kick: x... x... x... x...“. Fehlende Spuren bleiben leer.
 */
export function parseBeat(felder: Record<string, string>): Beat {
  const beat = leererBeat(felder.name ?? felder.titel ?? 'Beat', felder.bpm ? Number(felder.bpm) : 120);
  if (!Number.isFinite(beat.bpm) || beat.bpm < 40 || beat.bpm > 220) throw new Error(`Tempo „${felder.bpm}“ ungültig`);
  if (felder.swing) beat.swing = Math.min(1, Math.max(0, Number(felder.swing) / 100));
  for (const [k, v] of Object.entries(felder)) {
    if (!SPUR_IDS.has(k)) continue;
    beat.kanaele[k as SpurId].steps = parseSteps(v);
  }
  // Mischpult: „pan: hihat -0.4, perc 0.5“ und „hall: clap 0.25“
  for (const feld of ['pan', 'hall'] as const) {
    if (!felder[feld]) continue;
    for (const teil of felder[feld].split(',')) {
      const [id, wert] = teil.trim().split(/\s+/);
      if (!SPUR_IDS.has(id) || !Number.isFinite(Number(wert))) throw new Error(`${feld}: „${teil.trim()}“ ungültig`);
      beat.kanaele[id as SpurId][feld] = Number(wert);
    }
  }
  return beat;
}

/** Kurzform für Tests und Musterlösungen: „bpm 124; swing 20; kick: x... x... x... x...; clap: …“ */
export function beatAusKurzform(s: string): Beat {
  const felder: Record<string, string> = {};
  for (const teil of s.split(';')) {
    const t = teil.trim();
    if (!t) continue;
    const m = /^(\w+)\s*:?\s*(.*)$/.exec(t);
    if (m) felder[m[1]] = m[2];
  }
  return parseBeat(felder);
}

/** Klingt die Spur? (Solo schlägt Stumm) */
export function hoerbar(beat: Beat, id: SpurId): boolean {
  const solo = SPUREN.some((s) => beat.kanaele[s.id].solo);
  const k = beat.kanaele[id];
  return solo ? k.solo : !k.stumm;
}

/** Verschiebung eines Schritts durch Swing, in Viertelnoten: nur jede zweite Sechzehntel, höchstens bis zur Triole */
export function swingVersatz(step: number, swing: number): number {
  return step % 2 === 1 ? swing * (1 / 12) : 0;
}

/** Beat als Schlagzeugspur auf Kanal 10 für den MIDI-Export */
export function beatZuMidi(beat: Beat, wiederholungen = 4): MidiSpur {
  const noten: MidiSpur['noten'] = [];
  for (let w = 0; w < wiederholungen; w++)
    for (const s of SPUREN) {
      if (!hoerbar(beat, s.id)) continue;
      const k = beat.kanaele[s.id];
      const faktor = Math.pow(10, k.volume / 20);
      k.steps.forEach((v, i) => {
        if (v > 0) noten.push({ start: w * 4 + i / 4 + swingVersatz(i, beat.swing), dauer: 0.25, note: s.gm, velocity: Math.round(Math.min(1, v * faktor) * 127) });
      });
    }
  noten.sort((a, b) => a.start - b.start);
  return { name: beat.name || 'Drums', kanal: 9, noten };
}

/** Genre-Vorlagen: typische Grundmuster, die man hören, laden und verändern kann */
export interface Vorlage {
  id: string;
  name: string;
  beschreibung: string;
  kurzform: string;
}

export const VORLAGEN: Vorlage[] = [
  {
    id: 'house',
    name: 'House',
    beschreibung: 'Four-on-the-floor: Kick auf jeder Viertel, Clap auf 2 und 4, offene Hi-Hat auf den Offbeats. 120–128 BPM.',
    kurzform: 'bpm 124; kick: x... x... x... x...; clap: .... x... .... x...; hihat: o.o. o.o. o.o. o.o.; openhat: ..x. ..x. ..x. ..x.',
  },
  {
    id: 'techno',
    name: 'Techno',
    beschreibung: 'Harte, gerade Kick auf jeder Viertel, treibende Sechzehntel-Hats mit Betonung, kaum Clap. 125–140 BPM.',
    kurzform: 'bpm 132; kick: x... x... x... x...; hihat: -.x- -.x- -.x- -.x-; rim: .... ..o. .... o...; openhat: ..o. ..o. ..o. ..o.',
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop (Boom Bap)',
    beschreibung: 'Kick und Snare im Wechsel, Snare auf 2 und 4, Achtel-Hats mit Swing. 85–95 BPM.',
    kurzform: 'bpm 90; swing 35; kick: x... ...x ..x. .... ; snare: .... x... .... x..-; hihat: x.o. x.o. x.o. x.o.',
  },
  {
    id: 'trap',
    name: 'Trap',
    beschreibung: 'Halbes Tempo: Clap/Snare nur auf Zählzeit 3, schnelle Hi-Hats, sparsame Kicks (oft mit 808-Bass). 130–150 BPM, gefühlt 65–75.',
    kurzform: 'bpm 140; kick: x... .... ..x. ..x.; clap: .... .... x... ....; hihat: xoxo xoxo xxxx x-x-; openhat: .... ...x .... ....',
  },
  {
    id: 'rock',
    name: 'Rock',
    beschreibung: 'Achtel auf der Hi-Hat, Kick auf 1 und 3, Snare (Backbeat) auf 2 und 4. 100–140 BPM.',
    kurzform: 'bpm 112; kick: x... .... x.x. ....; snare: .... x... .... x...; hihat: x.o. x.o. x.o. x.o.',
  },
  {
    id: 'reggaeton',
    name: 'Reggaeton (Dembow)',
    beschreibung: 'Kick auf jeder Viertel, die Snare im Rhythmus 3+3+2 (Dembow). 88–100 BPM.',
    kurzform: 'bpm 95; kick: x... x... x... x...; snare: ...x ..x. ...x ..x.; hihat: x.x. x.x. x.x. x.x.',
  },
  {
    id: 'dnb',
    name: 'Drum & Bass',
    beschreibung: 'Sehr schnell, gebrochene Kick, Snare auf 2 und 4 des halben Tempos. 170–176 BPM.',
    kurzform: 'bpm 174; kick: x... .... ..x. ....; snare: .... x... .... x...; hihat: x.x. x.x. x.x. x.xo; perc: ..o. ..o. ..o. ..o.',
  },
  {
    id: 'funk',
    name: 'Funk',
    beschreibung: 'Sechzehntel-Hats mit Betonung, Ghost Notes auf der Snare, synkopierte Kick. 95–115 BPM.',
    kurzform: 'bpm 104; kick: x..x ..x. ..x. .x..; snare: ..-. x..- .-.. x.-.; hihat: x-o- x-o- x-o- x-o-',
  },
];

export function vorlage(id: string): Beat {
  const v = VORLAGEN.find((x) => x.id === id);
  if (!v) throw new Error(`Unbekannte Vorlage „${id}“`);
  return { ...beatAusKurzform(v.kurzform), name: v.name };
}

/**
 * Prüft einen Beat gegen Kriterien, z. B.
 * „spur kick 1 5 9 13“ (diese Schritte sind gesetzt), „genau snare 5 13“ (nur diese),
 * „leer snare 1 9“ (diese Schritte sind frei), „mindestens hihat 8“, „bpm 120 128“,
 * „swing 20“ (mindestens 20 %), „dynamik hihat“ (verschiedene Anschlagstärken), „spuren 4“, „ghost snare“.
 */
export function pruefeBeat(beat: Beat, kriterien: string[]): Pruefpunkt[] {
  return kriterien.map((k) => {
    const [name, ...args] = k.trim().split(/\s+/);
    const spur = SPUREN.find((s) => s.id === args[0]);
    const kanal = spur ? beat.kanaele[spur.id] : undefined;
    const gesetzt = kanal ? kanal.steps.flatMap((v, i) => (v > 0 ? [i + 1] : [])) : [];
    const zahlen = args.slice(1).map(Number);
    const liste = (xs: number[]) => xs.join(', ');
    const braucheSpur = (): Pruefpunkt => ({ text: `Unbekannte Spur „${args[0]}“`, ok: false });
    switch (name) {
      case 'spur': {
        if (!spur) return braucheSpur();
        const fehlt = zahlen.filter((n) => !gesetzt.includes(n));
        return {
          text: `${spur.name} auf Schritt ${liste(zahlen)}`,
          ok: fehlt.length === 0,
          hinweis: fehlt.length ? `Es fehlt noch Schritt ${liste(fehlt)}.` : undefined,
        };
      }
      case 'genau': {
        if (!spur) return braucheSpur();
        const fehlt = zahlen.filter((n) => !gesetzt.includes(n));
        const zuviel = gesetzt.filter((n) => !zahlen.includes(n));
        return {
          text: `${spur.name} genau auf Schritt ${liste(zahlen)}`,
          ok: !fehlt.length && !zuviel.length,
          hinweis: fehlt.length ? `Es fehlt Schritt ${liste(fehlt)}.` : zuviel.length ? `Zu viel: Schritt ${liste(zuviel)}.` : undefined,
        };
      }
      case 'leer': {
        if (!spur) return braucheSpur();
        const belegt = zahlen.filter((n) => gesetzt.includes(n));
        return { text: `${spur.name} frei auf Schritt ${liste(zahlen)}`, ok: !belegt.length, hinweis: belegt.length ? `Belegt: Schritt ${liste(belegt)}.` : undefined };
      }
      case 'mindestens': {
        if (!spur) return braucheSpur();
        return { text: `${spur.name}: mindestens ${zahlen[0]} Schläge`, ok: gesetzt.length >= zahlen[0], hinweis: `Bisher ${gesetzt.length}.` };
      }
      case 'hoechstens': {
        if (!spur) return braucheSpur();
        return { text: `${spur.name}: höchstens ${zahlen[0]} Schläge`, ok: gesetzt.length <= zahlen[0], hinweis: `Bisher ${gesetzt.length}. Weniger ist hier mehr.` };
      }
      case 'dynamik': {
        if (!spur || !kanal) return braucheSpur();
        const stufen = new Set(kanal.steps.filter((v) => v > 0).map((v) => Math.round(v * 20)));
        return {
          text: `${spur.name} mit unterschiedlicher Anschlagstärke (Velocity)`,
          ok: stufen.size >= 2,
          hinweis: 'Schalte auf „Velocity“ und tippe Schritte mehrmals an: laut, mittel, leise.',
        };
      }
      case 'ghost': {
        if (!spur || !kanal) return braucheSpur();
        const n = kanal.steps.filter((v) => v > 0 && v < 0.5).length;
        return { text: `${spur.name} mit Ghost Notes (leise Zwischenschläge)`, ok: n >= 1, hinweis: 'Setze im Velocity-Modus einen leisen Schlag (dritte Stufe) zwischen die Hauptschläge.' };
      }
      case 'bpm': {
        const [von, bis] = [Number(args[0]), Number(args[1] ?? args[0])];
        return { text: `Tempo ${von === bis ? von : `${von}–${bis}`} BPM`, ok: beat.bpm >= von && beat.bpm <= bis, hinweis: `Bisher ${beat.bpm} BPM.` };
      }
      case 'swing': {
        const min = Number(args[0] ?? 10);
        const ist = Math.round(beat.swing * 100);
        return { text: `Swing mindestens ${min} %`, ok: ist >= min, hinweis: `Bisher ${ist} %.` };
      }
      case 'spuren': {
        const n = Number(args[0]);
        const ist = SPUREN.filter((s) => beat.kanaele[s.id].steps.some((v) => v > 0)).length;
        return { text: `Mindestens ${n} Spuren im Einsatz`, ok: ist >= n, hinweis: `Bisher ${ist}.` };
      }
      case 'panorama': {
        const n = Number(args[0] ?? 1);
        const ist = SPUREN.filter((s) => beat.kanaele[s.id].steps.some((v) => v > 0) && Math.abs(beat.kanaele[s.id].pan) >= 0.15).length;
        return { text: `Mindestens ${n} ${n === 1 ? 'Spur' : 'Spuren'} im Panorama verteilt`, ok: ist >= n, hinweis: 'Dreh den Pan-Regler einer Spur nach links oder rechts.' };
      }
      case 'hall': {
        if (!spur || !kanal) return braucheSpur();
        return { text: `${spur.name} mit Hall`, ok: kanal.hall >= 0.1, hinweis: 'Schieb den Hall-Regler der Spur nach oben.' };
      }
      default:
        return { text: `Unbekanntes Kriterium „${k}“`, ok: false };
    }
  });
}

const SPEICHER = 'kt-beats-v1';

export function gespeicherteBeats(): Beat[] {
  try {
    const roh = JSON.parse(localStorage.getItem(SPEICHER) ?? '[]') as Beat[];
    return Array.isArray(roh) ? roh.filter((b) => b && b.kanaele && typeof b.bpm === 'number').map(ergaenze) : [];
  } catch {
    return [];
  }
}

/** Ältere Speicherstände um neue Spuren ergänzen */
function ergaenze(b: Beat): Beat {
  const kanaele = { ...b.kanaele };
  for (const s of SPUREN) if (!kanaele[s.id]) kanaele[s.id] = leererKanal();
  return { ...b, kanaele };
}

export function speichereBeat(beat: Beat): Beat[] {
  const alle = gespeicherteBeats().filter((b) => b.name !== beat.name);
  const neu = [beat, ...alle].slice(0, 30);
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(neu));
  } catch {
    /* Speicher voll oder gesperrt */
  }
  return neu;
}

export function loescheBeat(name: string): Beat[] {
  const neu = gespeicherteBeats().filter((b) => b.name !== name);
  try {
    localStorage.setItem(SPEICHER, JSON.stringify(neu));
  } catch {
    /* ignorieren */
  }
  return neu;
}
