import { satz } from '../satz/kurzform';

/** Eigene vierstimmige Beispielsätze (für die Prüf-Engine und zum Hören) */
export const CHORALSATZ = satz({
  titel: 'Choralzeilen in G-Dur',
  komponist: 'Beispielsatz',
  tonart: '1',
  takt: '4/4',
  tempo: 66,
  stimmen: [
    'B4:4 A4 G4 A4 | B4 B4 A4:2^ | B4:4 C5 D5 C5 | B4 A4 G4:2^',
    'G4:4 F#4 E4 F#4 | G4 G4 F#4:2 | G4:4 G4 G4 A4 | G4 F#4 D4:2',
    'D4:4 D4 B3 D4 | D4 D4 D4:2 | D4:4 E4 D4 E4 | D4 D4 B3:2',
    'G3:4 D3 E3 D3 | G3 B2 D3:2 | G3:4 C3 B2 A2 | D3 D3 G2:2',
  ],
  text: 'Hell er- klingt der Chor im Saal, al- le stim- men fröh- lich ein',
});

export const FEHLERSATZ = satz({
  titel: 'Übungssatz mit Fehlern',
  komponist: 'Finde die Fehler',
  tonart: '0',
  takt: '4/4',
  tempo: 66,
  stimmen: [
    'E5:4 F5 G5 A5 | G5:4 E5 D5:2 | C5:1',
    'C5:4 D5 B4 C5 | B4:4 C5 B4:2 | C5:1',
    'G3:4 A3 D4 E4 | D4:4 G4 G4:2 | E4:1',
    'C3:4 D3 G3 A3 | G3:4 C3 G2:2 | C3:1',
  ],
});
