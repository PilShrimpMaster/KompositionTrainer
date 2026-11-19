/**
 * Das eigene JSON-Notenmodell des KompositionsTrainers.
 *
 * Darstellung (VexFlow), Wiedergabe (Tone.js) und später die Prüf-Engine
 * arbeiten alle auf denselben Daten. Tonhöhen werden intern wie in MusicXML
 * gespeichert (Stammton C–B + Alteration), damit der spätere MusicXML-Import
 * und -Export verlustfrei bleibt. Die Oberfläche zeigt deutsche Namen (H, B, Cis …).
 */

/** Stammtöne in internationaler Schreibweise; „B“ ist hier der deutsche Ton H. */
export type Step = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export interface Pitch {
  step: Step;
  /** -2 = Doppel-b, -1 = b, 0 = ohne, 1 = Kreuz, 2 = Doppelkreuz */
  alter?: number;
  /** Wissenschaftliche Oktavzählung: c' (eingestrichenes c) = Oktave 4 */
  octave: number;
}

export type DurationType = 'whole' | 'half' | 'quarter' | 'eighth' | '16th';

export interface Duration {
  type: DurationType;
  /** Anzahl Punkte (0–2) */
  dots?: number;
}

export interface NoteEvent {
  /** Fehlt pitch, ist das Ereignis eine Pause. */
  pitch?: Pitch;
  duration: Duration;
  /** Bindebogen zur nächsten Note gleicher Tonhöhe */
  tie?: boolean;
  /** Anschlagstärke 1–127 (z. B. vom MIDI-Keyboard); fehlt sie, gilt mittlere Lautstärke */
  velocity?: number;
}

export interface Measure {
  notes: NoteEvent[];
}

export type Clef = 'treble' | 'bass';

export interface TimeSignature {
  beats: number;
  beatType: number;
}

export interface KeySignature {
  /** Anzahl Vorzeichen: positiv = Kreuze, negativ = Bs (wie MusicXML) */
  fifths: number;
  mode: 'major' | 'minor';
}

export interface Voice {
  id: string;
  name: string;
  clef: Clef;
  measures: Measure[];
}

export interface Score {
  /** Version des Formats, damit spätere Änderungen migriert werden können */
  format: 'kt-score';
  version: 1;
  title: string;
  composer?: string;
  /** Viertelnoten pro Minute */
  tempo: number;
  time: TimeSignature;
  key: KeySignature;
  voices: Voice[];
}
