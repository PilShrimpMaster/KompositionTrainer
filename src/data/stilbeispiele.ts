import { rebar } from '../editor/rebar';
import { kpSatz } from '../kontrapunkt/kurzform';
import { parseNotenfolge, parseTonart } from '../lernpfad/kompakt';
import type { Score } from '../model/types';
import { satz } from '../satz/kurzform';
import type { Stil } from '../satz/stil';

/**
 * Eigene Übungssätze im Stil der Epochen (Stufe 6). Dieselben Noten stehen in den Lektionen;
 * die Tests prüfen, dass sie im jeweiligen Stilprofil fehlerfrei sind und ihre Merkmale zeigen.
 */
const klavier = (titel: string, tonart: string, takt: string, oben: string, unten: string, stil: Stil, tempo = 80): Score => ({
  ...kpSatz({ titel, tonart, takt, tempo, oben, unten, namen: ['Melodie', 'Begleitung'], schluessel: ['treble', 'bass'] }),
  stil,
});
const vierstimmig = (titel: string, tonart: string, stimmen: [string, string, string, string], stil: Stil, tempo = 66, takt = '4/4'): Score => ({
  ...satz({ titel, tonart, takt, tempo, stimmen }),
  stil,
});
const melodie = (titel: string, tonart: string, noten: string, tempo = 72): Score =>
  rebar({ title: titel, tempo, time: { beats: 4, beatType: 4 }, key: parseTonart(tonart), clef: 'treble', events: parseNotenfolge(noten) }).score;

export const FORTSPINNUNG = () =>
  klavier(
    'Übungssatz: Fortspinnung mit Quintfallsequenz',
    '0',
    '4/4',
    'E4:8 G4 C5 G4 B4 D5 G5 D5 | A4:8 C5 F5 C5 D4 F4 B4 F4 | G4:8 B4 E5 B4 C4 E4 A4 E4 | F4:8 A4 D5 A4 D5 B4 G4 B4 | C5:1',
    'C3:2 G2:2 | F2:2 B2:2 | E2:2 A2:2 | D2:2 G2:2 | C2:1',
    'barock',
    76,
  );

export const SARABANDE = () =>
  klavier(
    'Übungssatz: Sarabande in d-Moll',
    '-1 moll',
    '3/4',
    'D5:4 F5:4. E5:8 | D5:4 C#5:4. D5:8 | Bb4:4 G4:4. A4:8 | A4:2. | F5:4 A5:4. G5:8 | D5:4 F5:4. E5:8 | E5:4 C#5:4. E5:8 | D5:2.',
    'D3:2. | A2:2. | G2:2. | A2:2. | D3:2. | Bb2:2. | A2:2. | D2:2.',
    'barock',
    60,
  );

export const SONATINE = () =>
  klavier(
    'Übungssatz: Sonatinen-Thema mit Alberti-Bass',
    '0',
    '4/4',
    'C5:4 E5:8 C5:8 G4:4 G4:4 | A4:8 B4 C5 D5 E5:2 | F5:4 D5:4 B4:4 G4:4 | C5:4 A4:4 B4:2 | C5:4 E5:8 C5:8 G4:4 G4:4 | A4:8 B4 C5 D5 E5:2 | F5:8 E5 D5 C5 B4:4 D5:4 | C5:1',
    'C3:8 G3 E3 G3 C3 G3 E3 G3 | F2:8 C3 A2 C3 C3 G3 E3 G3 | G2:8 D3 B2 D3 G2 D3 B2 D3 | A2:8 E3 C3 E3 G2 D3 B2 D3 | C3:8 G3 E3 G3 C3 G3 E3 G3 | F2:8 C3 A2 C3 C3 G3 E3 G3 | F2:8 C3 A2 C3 G2 D3 B2 D3 | C3:8 G3 E3 G3 C3:2',
    'klassik',
    108,
  );

export const NEAPOLITANER = () =>
  vierstimmig(
    'Übungssatz: Neapolitaner und verminderter Septakkord in a-Moll',
    '0 moll',
    ['A4:4 Bb4 G#4 A4 | A4 G#4 A4:2', 'E4:4 F4 E4 E4 | F4 F4 E4:2', 'C4:4 D4 B3 C4 | D4 D4 C4:2', 'A2:4 D3 E3 A2 | D3 B2 A2:2'],
    'romantik',
    60,
  );

export const UEBERMAESSIG = () =>
  vierstimmig(
    'Übungssatz: Übermäßiger Sextakkord vor der Dominante',
    '0 moll',
    ['E5:2 D#5:2 | E5:1 | E5:1', 'C5:2 A4:2 | G#4:1 | A4:1', 'A3:2 A3:2 | B3:1 | C4:1', 'A2:2 F2:2 | E2:1 | A2:1'],
    'romantik',
    56,
  );

export const MEDIANTEN = () =>
  vierstimmig(
    'Übungssatz: Medianten C – As – C – E – C',
    '0',
    ['C5:4 C5 C5 B4 | C5:1', 'E4:4 Eb4 E4 E4 | E4:1', 'G3:4 Ab3 G3 G#3 | G3:1', 'C3:4 Ab2 C3 E3 | C3:1'],
    'romantik',
    56,
  );

export const PLANING = () =>
  vierstimmig(
    'Übungssatz: Parallelverschiebung',
    '0 moll',
    ['E4:4 F4 A4 B4 | C5:2 B4:2 | E4:1', 'C4:4 D4 F4 G4 | A4:2 G4:2 | C4:1', 'A3:4 B3 D4 E4 | F4:2 E4:2 | A3:1', 'A2:4 B2 D3 E3 | F3:2 E3:2 | A2:1'],
    'impressionismus',
    54,
  );

export const GANZTON = () => melodie('Übungsmelodie: Ganztonleiter', '0', 'C5:4 D5 E5 F#5 | G#5:2 A#5:2 | G#5:4 F#5 E5 D5 | C5:1', 60);

export const PENTATONIK = () => melodie('Übungsmelodie: Pentatonik', '0', 'G4:8 A4 C5 D5 E5:4 D5:4 | C5:8 A4 G4 A4 C5:2 | D5:8 E5 G5 E5 D5:4 C5:8 A4 | G4:1', 72);

export const QUARTEN = () =>
  vierstimmig('Übungssatz: Quartenklänge', '0', ['F4:2 G4:2 | Eb4:2 F4:2', 'C4:2 D4:2 | Bb3:2 C4:2', 'G3:2 A3:2 | F3:2 G3:2', 'D3:2 E3:2 | C3:2 D3:2'], 'moderne', 60);

export const ZWOELFTON = () => melodie('Übungsmelodie: Zwölftonreihe', '0', 'E4:4 F4 C5 B4 | Bb4 Eb5 D4 C#4 | G4 F#4 A4 Ab4', 60);

export interface StilAusschnitt {
  id: string;
  stil: Exclude<Stil, 'streng'>;
  score: () => Score;
  /** Woran man die Epoche erkennt */
  erklaerung: string;
}
