import { diatonicIndex, fromDiatonic, germanNameWithOctave, spellMidi, toMidi } from './pitch';
import type { Clef, KeySignature, Pitch } from './types';

/**
 * Instrumente mit Tonumfang (klingend) und Transposition.
 * Transponierende Instrumente notiert man höher, als sie klingen: Das Altsaxophon in Es
 * klingt eine große Sexte tiefer als notiert.
 */
export interface Instrument {
  id: string;
  name: string;
  /** „in Es“, „in B“, „in F“ oder leer */
  stimmung: string;
  /** Klingend = notiert minus dieses Intervall (diatonische Stufen und Halbtöne) */
  transposition: { stufen: number; halbtoene: number; name: string };
  /** Klingender Umfang als MIDI-Nummern */
  umfang: [number, number];
  /** Klingende gute Lage, in der das Instrument sicher und schön klingt */
  lage: [number, number];
  schluessel: Clef;
  /** Kurze Charakteristik der Register */
  register: string;
}

export const INSTRUMENTE: Instrument[] = [
  {
    id: 'altsax',
    name: 'Altsaxophon',
    stimmung: 'in Es',
    transposition: { stufen: 5, halbtoene: 9, name: 'eine große Sexte tiefer' },
    umfang: [49, 81],
    lage: [53, 76],
    schluessel: 'treble',
    register: 'Unten voll und rau, in der Mitte warm und gesanglich, oben hell und durchdringend; die höchsten Töne (über dem notierten d‴) sind schwer zu kontrollieren.',
  },
  {
    id: 'tenorsax',
    name: 'Tenorsaxophon',
    stimmung: 'in B',
    transposition: { stufen: 8, halbtoene: 14, name: 'eine große None tiefer' },
    umfang: [44, 76],
    lage: [48, 70],
    schluessel: 'treble',
    register: 'Dunkler und kräftiger als das Altsaxophon, der klassische Jazz-Solist; unten sehr voll, oben gesanglich.',
  },
  {
    id: 'klarinette',
    name: 'Klarinette',
    stimmung: 'in B',
    transposition: { stufen: 1, halbtoene: 2, name: 'eine große Sekunde tiefer' },
    umfang: [50, 94],
    lage: [55, 84],
    schluessel: 'treble',
    register: 'Das tiefe Chalumeau-Register ist dunkel und hohl, das Clarin-Register darüber hell und klar; dazwischen liegen die etwas matten „Kehltöne“ um das notierte a′–b′.',
  },
  {
    id: 'trompete',
    name: 'Trompete',
    stimmung: 'in B',
    transposition: { stufen: 1, halbtoene: 2, name: 'eine große Sekunde tiefer' },
    umfang: [52, 82],
    lage: [58, 79],
    schluessel: 'treble',
    register: 'Strahlend und kraftvoll in der Mitte und Höhe; lange hohe Passagen ermüden den Ansatz.',
  },
  {
    id: 'horn',
    name: 'Horn',
    stimmung: 'in F',
    transposition: { stufen: 4, halbtoene: 7, name: 'eine Quinte tiefer' },
    umfang: [35, 77],
    lage: [50, 72],
    schluessel: 'treble',
    register: 'Weich und rund, verbindet Holz und Blech; in der Mitte am schönsten, ganz oben strahlend, aber riskant.',
  },
  {
    id: 'floete',
    name: 'Querflöte',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [60, 96],
    lage: [62, 91],
    schluessel: 'treble',
    register: 'Unten leise und hauchig, in der Mitte weich, oben hell und leicht.',
  },
  {
    id: 'violine',
    name: 'Violine',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [55, 100],
    lage: [55, 88],
    schluessel: 'treble',
    register: 'Die G-Saite ist dunkel und warm, die E-Saite strahlend; sehr beweglich in allen Lagen.',
  },
  {
    id: 'violoncello',
    name: 'Violoncello',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [36, 76],
    lage: [36, 69],
    schluessel: 'bass',
    register: 'Tief und sonor als Bass, in der Tenorlage (A-Saite) einer der schönsten Melodieklänge des Orchesters.',
  },
];

export const instrument = (id: string) => INSTRUMENTE.find((i) => i.id === id);

/** Verschiebt einen Ton um diatonische Stufen und Halbtöne, mit richtiger Schreibweise */
export function verschiebe(p: Pitch, stufen: number, halbtoene: number): Pitch {
  const natur = fromDiatonic(diatonicIndex(p) + stufen, 0);
  const alter = toMidi(p) + halbtoene - toMidi(natur);
  return alter ? { ...natur, alter } : natur;
}

/** Notierter Ton für einen klingenden */
export const notiert = (klingend: Pitch, i: Instrument) => verschiebe(klingend, i.transposition.stufen, i.transposition.halbtoene);
/** Klingender Ton für einen notierten */
export const klingend = (notiertTon: Pitch, i: Instrument) => verschiebe(notiertTon, -i.transposition.stufen, -i.transposition.halbtoene);

/** Vorzeichen der notierten Stimme: so viele Quinten weiter, wie das Instrument transponiert */
export function notierteTonart(key: KeySignature, i: Instrument): KeySignature {
  const quinten = ((i.transposition.halbtoene * 7) % 12 + 12) % 12;
  const delta = quinten > 6 ? quinten - 12 : quinten;
  let fifths = key.fifths + delta;
  if (fifths > 7) fifths -= 12;
  if (fifths < -7) fifths += 12;
  return { ...key, fifths };
}

/** Prüft, ob Töne (klingend) im Umfang und in der guten Lage liegen */
export function lagePruefen(toene: Pitch[], i: Instrument) {
  const midi = toene.map(toMidi);
  const ausserhalb = toene.filter((_, k) => midi[k] < i.umfang[0] || midi[k] > i.umfang[1]);
  const inLage = midi.filter((m) => m >= i.lage[0] && m <= i.lage[1]).length;
  return { ausserhalb, anteilLage: toene.length ? inLage / toene.length : 1 };
}

const name = (m: number) => germanNameWithOctave(spellMidi(m, -1));
export const umfangText = (i: Instrument) => `${name(i.umfang[0])} bis ${name(i.umfang[1])}`;
export const lageText = (i: Instrument) => `${name(i.lage[0])} bis ${name(i.lage[1])}`;
