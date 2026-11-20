import { BEISPIELE } from '../data/melodien';
import { CHORALSATZ } from '../data/saetze';
import { HAENSCHEN, melodie, menuettMitTrio } from '../data/formbeispiele';
import { kpSatz } from '../kontrapunkt/kurzform';
import type { Score } from '../model/types';
import { satz } from '../satz/kurzform';
import type { Aufgabe, Stufe } from './aufgaben';

/**
 * Analyse an Werkausschnitten: Man markiert Takte im Notenbild (Kadenzen, Sequenzen, Motive, Imitationen, Modulationen).
 * Alle Ausschnitte sind gemeinfrei oder eigene Übungssätze.
 */
export interface AnalyseFrage {
  id: string;
  /** Ab welcher Schwierigkeit die Frage vorkommt */
  ab: Stufe;
  score: () => Score;
  frage: string;
  /** Richtige Takte, ab 0 */
  takte: number[];
  erklaerung: string;
  begriff: string;
}

const beispiel = (id: string) => () => BEISPIELE.find((b) => b.id === id)!.score;

export const BWV772 = () =>
  kpSatz({
    titel: 'Bach, Invention C-Dur BWV 772, Takt 1–2',
    tempo: 66,
    oben: 'r:16 C4 D4 E4 F4 D4 E4 C4 G4:8 C5 B4 C5 | D5:16 G4 A4 B4 C5 A4 B4 G4 D5:8 G5 F5 G5',
    unten: 'r:2 r:16 C3 D3 E3 F3 D3 E3 C3 | G3:8 G2 r:4 r:16 G3 A3 B3 C4 A3 B3 G3',
  });

const BWV772_OBEN = () =>
  kpSatz({
    titel: 'Bach, Invention C-Dur BWV 772, Takt 1–4 (Oberstimme, Bass weggelassen)',
    tempo: 66,
    oben: 'r:16 C4 D4 E4 F4 D4 E4 C4 G4:8 C5 B4 C5 | D5:16 G4 A4 B4 C5 A4 B4 G4 D5:8 G5 F5 G5 | E5:16 A5 G5 F5 E5 G5 F5 A5 G5 F5 E5 D5 C5 E5 D5 F5 | E5 D5 C5 B4 A4 C5 B4 D5 C5 B4 A4 G4 F#4 A4 G4 B4',
    unten: 'r:1 | r:1 | r:1 | r:1',
  });

/** Übungssatz: von C-Dur über den Drehakkord a-Moll nach G-Dur */
export const MODULATION = () =>
  satz({
    titel: 'Übungssatz: Modulation',
    tonart: '0',
    tempo: 72,
    stimmen: [
      'G4:4 A4 B4 C5 | C5:4 A4 B4:2 | B4:4 C5 A4:2 | G4:1',
      'E4:4 F4 D4 E4 | E4:4 D4 D4:2 | E4:4 E4 F#4:2 | D4:1',
      'C4:4 C4 G3 G3 | A3:4 F#3 G3:2 | G3:4 A3 C4:2 | B3:1',
      'C3:4 F2 G2 C3 | A2:4 D3 G2:2 | E2:4 A2 D3:2 | G3:1',
    ],
  });

export const ANALYSE_FRAGEN: AnalyseFrage[] = [
  {
    id: 'ode-halbschluss',
    ab: 1,
    score: beispiel('ode-an-die-freude'),
    frage: 'Markiere den Takt, in dem die erste Hälfte mit einem Halbschluss endet.',
    takte: [3],
    erklaerung: 'Takt 4 endet auf e, der 2. Stufe in D-Dur. Sie gehört zum Dominantakkord A-Dur: Die Melodie macht ein Komma, sie ist noch nicht fertig. Takt 8 bringt dieselbe Melodie, endet aber auf d (Ganzschluss). Zusammen bilden die acht Takte eine Periode.',
    begriff: 'halbschluss',
  },
  {
    id: 'ode-ganzschluss',
    ab: 1,
    score: beispiel('ode-an-die-freude'),
    frage: 'Markiere den Takt mit dem Ganzschluss.',
    takte: [7],
    erklaerung: 'In Takt 8 landet die Melodie auf dem Grundton d. Das ist der Ganzschluss, der den Vordersatz (Takt 1–4, Halbschluss) beantwortet.',
    begriff: 'kadenz',
  },
  {
    id: 'menuett-sequenz',
    ab: 1,
    score: beispiel('menuett-g-dur'),
    frage: 'Markiere die beiden Takte, die zusammen eine Sequenz bilden.',
    takte: [4, 5],
    erklaerung: 'Takt 6 wiederholt die Figur aus Takt 5 (c–d–c–h–a) eine Stufe tiefer (h–c–h–a–g). Eine solche Wiederholung auf anderer Stufe ist eine Sequenz; sie treibt die Melodie zum Abschnittsende.',
    begriff: 'sequenz',
  },
  {
    id: 'menuett-halbschluss',
    ab: 2,
    score: beispiel('menuett-g-dur'),
    frage: 'Markiere den Takt, in dem der erste Teil offen endet (Halbschluss).',
    takte: [7],
    erklaerung: 'Der erste Teil endet in Takt 8 auf a, einem Ton des Dominantakkords D-Dur. Das klingt offen, wie ein Doppelpunkt; erst der zweite Teil führt zurück zur Tonika.',
    begriff: 'halbschluss',
  },
  {
    id: 'choral-halbschluss',
    ab: 1,
    score: () => CHORALSATZ,
    frage: 'Markiere die Choralzeile, die mit einem Halbschluss endet.',
    takte: [1],
    erklaerung: 'Die erste Zeile endet in Takt 2 auf D-Dur, der Dominante von G-Dur (Halbschluss). Die zweite Zeile schließt in Takt 4 mit D–T auf G-Dur (Ganzschluss).',
    begriff: 'halbschluss',
  },
  {
    id: 'bach-imitation',
    ab: 2,
    score: BWV772,
    frage: 'Markiere den Takt, in dem die Unterstimme das Motiv auf der Dominante imitiert (ab g).',
    takte: [1],
    erklaerung: 'In Takt 2 spielt die Unterstimme g–a–h–c–a–h–g: das Motiv aus Takt 1, jetzt auf der Dominante G. Davor, in Takt 1, hatte sie es schon eine Oktave tiefer auf c imitiert.',
    begriff: 'imitation',
  },
  {
    id: 'bach-umkehrung',
    ab: 2,
    score: BWV772_OBEN,
    frage: 'Markiere die Takte, in denen das Motiv in der Umkehrung erscheint.',
    takte: [2, 3],
    erklaerung: 'Ab Takt 3 läuft das Motiv gespiegelt: Statt c–d–e–f–d–e–c (aufwärts) hörst du a–g–f–e–g–f–a (abwärts), und zwar als Sequenz viermal hintereinander, jedes Mal eine Stufe tiefer. Das fis am Ende führt zur Dominante G-Dur.',
    begriff: 'spiegelung',
  },
  {
    id: 'modulation-leitton',
    ab: 3,
    score: MODULATION,
    frage: 'Markiere den Takt, in dem der Satz nach G-Dur moduliert: Wo erklingt der neue Leitton fis zum ersten Mal?',
    takte: [1],
    erklaerung: 'In Takt 2 ist a-Moll der Drehakkord: In C-Dur die Tonikaparallele, in G-Dur die Subdominantparallele. Danach bringt D-Dur das fis, und G-Dur wird zur neuen Tonika. Takt 3 bestätigt die neue Tonart mit D⁷–G.',
    begriff: 'modulation',
  },
  {
    id: 'ode-nachsatz',
    ab: 1,
    score: beispiel('ode-an-die-freude'),
    frage: 'Markiere den Takt, in dem der Nachsatz der Periode beginnt.',
    takte: [4],
    erklaerung: 'Takt 5 beginnt genau wie Takt 1: Hier setzt der Nachsatz ein. Er wiederholt den Anfang und biegt erst am Ende zum Ganzschluss ab.',
    begriff: 'periode',
  },
  {
    id: 'haenschen-mittelteil',
    ab: 1,
    score: () => melodie('Volkslied: Hänschen klein', HAENSCHEN),
    frage: 'Das Lied hat die Form A B A. Markiere die vier Takte des Mittelteils B.',
    takte: [8, 9, 10, 11],
    erklaerung: 'Takt 9–12 bringen neue Musik: Tonwiederholungen auf d und e statt der fallenden Terzen. Danach kehrt A wieder (Takt 13–16, wie Takt 5–8).',
    begriff: 'liedform',
  },
  {
    id: 'menuett-trio',
    ab: 2,
    score: menuettMitTrio,
    frage: 'Markiere den Takt, in dem das Trio beginnt.',
    takte: [16],
    erklaerung: 'Das Menuett schließt in Takt 16 mit dem Ganzschluss in C-Dur. In Takt 17 beginnt das Trio, hier in F-Dur (mit b). Danach wird das Menuett wiederholt.',
    begriff: 'menuett',
  },
];

/** „Takt 4“, „Takt 5 und 6“ */
export function taktText(takte: number[]): string {
  const t = [...takte].sort((a, b) => a - b).map((x) => x + 1);
  return t.length === 1 ? `Takt ${t[0]}` : `Takt ${t.slice(0, -1).join(', ')} und ${t[t.length - 1]}`;
}

export function analyseAufgabe(rng: () => number, stufe: Stufe): Aufgabe {
  const moegliche = ANALYSE_FRAGEN.filter((f) => f.ab <= stufe);
  const f = moegliche[Math.floor(rng() * moegliche.length)];
  return {
    typ: 'analyse-markieren',
    frage: f.frage,
    satz: f.score(),
    optionen: [],
    loesung: taktText(f.takte),
    erklaerung: f.erklaerung,
    begriff: f.begriff,
    markieren: f.takte,
  };
}
