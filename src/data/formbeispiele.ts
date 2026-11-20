import { rebar } from '../editor/rebar';
import { emptyDoc } from '../editor/state';
import { kpSatz } from '../kontrapunkt/kurzform';
import { parseNotenfolge } from '../lernpfad/kompakt';
import type { Score } from '../model/types';

/** Übungssatz für Klavier: Menuett in C-Dur (16 Takte) */
export const MENUETT = 'E5:4 C5 G4 | F5:4 D5 B4 | C5:4 E5 G5 | A5:2 F5:4 | G5:4 E5 C5 | F5:4 D5 B4 | E5:4 C5 A4 | G4:2. | G5:4 F5 E5 | F5:4 E5 D5 | E5:4 D5 C5 | D5:2. | E5:4 C5 G4 | F5:4 D5 B4 | B4:4 D5 G5 | C5:2.';
export const MENUETT_BASS = 'C3:2. | G2:2. | C3:2. | F2:2. | C3:2. | G2:2. | A2:2. | G2:2. | C3:2. | D3:2. | C3:2. | G2:2. | C3:2. | G2:2. | G2:2. | C3:2.';
/** Trio in F-Dur (16 Takte) */
export const TRIO = 'A4:4 F4 C4 | Bb4:4 G4 E4 | F4:4 A4 C5 | D5:2 Bb4:4 | C5:4 A4 F4 | Bb4:4 G4 E4 | A4:4 F4 D4 | C4:2. | C5:4 Bb4 A4 | Bb4:4 A4 G4 | A4:4 G4 F4 | G4:2. | A4:4 F4 C4 | Bb4:4 G4 E4 | E4:4 G4 C5 | F4:2.';
export const TRIO_BASS = 'F3:2. | C3:2. | F3:2. | Bb2:2. | F3:2. | C3:2. | D3:2. | C3:2. | F3:2. | G3:2. | F3:2. | C3:2. | F3:2. | C3:2. | C3:2. | F3:2.';

export const menuettMitTrio = (): Score =>
  kpSatz({ titel: 'Übungssatz: Menuett mit Trio', takt: '3/4', tempo: 116, oben: `${MENUETT} | ${TRIO}`, unten: `${MENUETT_BASS} | ${TRIO_BASS}`, namen: ['Melodie', 'Begleitung'], schluessel: ['treble', 'bass'] });

/** Volkslied „Hänschen klein“: A (8 Takte), B (4 Takte), A′ (4 Takte) */
export const HAENSCHEN = 'G4:4 E4 E4:2 | F4:4 D4 D4:2 | C4:4 D4 E4 F4 | G4 G4 G4:2 | G4:4 E4 E4:2 | F4:4 D4 D4:2 | C4:4 E4 G4 G4 | C4:1 | D4:4 D4 D4 D4 | D4 E4 F4:2 | E4:4 E4 E4 E4 | E4 F4 G4:2 | G4:4 E4 E4:2 | F4:4 D4 D4:2 | C4:4 E4 G4 G4 | C4:1';

/** Einstimmige Melodie aus der Kurzform */
export function melodie(titel: string, noten: string, takt = { beats: 4, beatType: 4 }, fifths = 0): Score {
  return rebar({ ...emptyDoc(), title: titel, time: takt, key: { fifths, mode: 'major' }, events: parseNotenfolge(noten) }).score;
}
