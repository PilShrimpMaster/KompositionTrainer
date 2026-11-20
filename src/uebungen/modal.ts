import { diatonicIndex, fromDiatonic, germanName, toMidi } from '../model/pitch';
import type { Pitch, Step } from '../model/types';
import type { Aufgabe, Stufe } from './aufgaben';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

export const MODUS_NAMEN = ['Ionisch', 'Dorisch', 'Phrygisch', 'Lydisch', 'Mixolydisch', 'Äolisch'] as const;
export type ModusName = (typeof MODUS_NAMEN)[number];

/** Halbtonabstände vom Grundton */
export const MODUS_LEITER: Record<ModusName, number[]> = {
  Ionisch: [0, 2, 4, 5, 7, 9, 11, 12],
  Dorisch: [0, 2, 3, 5, 7, 9, 10, 12],
  Phrygisch: [0, 1, 3, 5, 7, 8, 10, 12],
  Lydisch: [0, 2, 4, 6, 7, 9, 11, 12],
  Mixolydisch: [0, 2, 4, 5, 7, 9, 10, 12],
  Äolisch: [0, 2, 3, 5, 7, 8, 10, 12],
};

/** Der Ton, der den Modus vom nächstverwandten Dur oder Moll unterscheidet */
export const MODUS_FARBE: Record<ModusName, string> = {
  Ionisch: 'Ionisch ist unser Dur: große Terz und Leitton (große Septime) zum Grundton.',
  Dorisch: 'Dorisch klingt wie Moll, aber mit großer Sexte. Dieser helle Ton im dunklen Umfeld macht den Klang von „So What“, „Scarborough Fair“ oder vielen Funk-Grooves aus.',
  Phrygisch: 'Phrygisch ist Moll mit kleiner Sekunde: Der Halbton direkt über dem Grundton klingt dunkel und fremd, wie im Flamenco oder in Bedrohungs-Szenen im Film.',
  Lydisch: 'Lydisch ist Dur mit übermäßiger Quarte. Der erhöhte vierte Ton klingt schwebend und staunend; Filmmusik nutzt ihn gern für Magie und Weite.',
  Mixolydisch: 'Mixolydisch ist Dur mit kleiner Septime. Ohne Leitton klingt es offen und erdig, typisch für Rock, Blues und Folk.',
  Äolisch: 'Äolisch ist natürliches Moll: kleine Terz, kleine Sexte, kleine Septime. Es klingt traurig, aber ohne den Zug des Leittons.',
};

/** Leiter eines Modus auf einem Grundton, mit richtiger Schreibweise (eine Stufe je Ton) */
export function modusLeiter(grund: Pitch, modus: ModusName): Pitch[] {
  const g = diatonicIndex(grund);
  const gm = toMidi(grund);
  return MODUS_LEITER[modus].map((h, i) => {
    const natur = fromDiatonic(g + i, 0);
    const alter = gm + h - toMidi(natur);
    return alter ? { ...natur, alter } : natur;
  });
}

const GRUNDTOENE: Pitch[] = (['C', 'D', 'F', 'G'] as Step[]).map((step) => ({ step, octave: 4 }));

export function modusAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const moegliche: ModusName[] =
    stufe === 1 ? ['Ionisch', 'Äolisch', 'Dorisch', 'Mixolydisch'] : stufe === 2 ? ['Ionisch', 'Äolisch', 'Dorisch', 'Mixolydisch', 'Lydisch'] : [...MODUS_NAMEN];
  const modus = pick(rng, moegliche);
  const grund = pick(rng, GRUNDTOENE);
  const leiter = modusLeiter(grund, modus);
  const akkord = [leiter[0], leiter[2], leiter[4]].map((p) => ({ ...p, octave: p.octave - 1 }));
  return {
    typ: 'modus-hoeren',
    frage: `Erst der Grundakkord, dann die Leiter auf ${germanName(grund)}: Welcher Modus klingt?`,
    klang: { art: 'nacheinander', toene: akkord, folge: [akkord, ...leiter.map((p) => [p])] },
    optionen: moegliche,
    loesung: modus,
    erklaerung: `${leiter.map(germanName).join('–')}. ${MODUS_FARBE[modus]}`,
    begriff: 'modaler-jazz',
  };
}
