import { diatonicIndex, fromDiatonic, germanNameWithOctave, spellMidi, toMidi } from './pitch';
import type { Clef, KeySignature, Pitch, Score } from './types';

/**
 * Instrumente mit Tonumfang (klingend) und Transposition.
 * Transponierende Instrumente notiert man höher, als sie klingen: Das Altsaxophon in Es
 * klingt eine große Sexte tiefer als notiert.
 */
export type Familie = 'streicher' | 'holz' | 'blech' | 'saxophon' | 'tasten';

export interface Instrument {
  id: string;
  name: string;
  /** Abkürzung am Partitursystem, z. B. „Vc.“ */
  kurz: string;
  familie: Familie;
  /** Ordner der Klangsamples; Saxophone klingen mangels freier Samples mit Klarinettenklang */
  klang: string;
  /** Klangkennung nach MusicXML 3 (instrument-sound), damit MuseScore das richtige Instrument wählt */
  sound: string;
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
    kurz: 'Asax.',
    familie: 'saxophon',
    klang: 'klarinette',
    sound: 'wind.reed.saxophone.alto',
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
    kurz: 'Tsax.',
    familie: 'saxophon',
    klang: 'klarinette',
    sound: 'wind.reed.saxophone.tenor',
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
    kurz: 'Klar.',
    familie: 'holz',
    klang: 'klarinette',
    sound: 'wind.reed.clarinet.b-flat',
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
    kurz: 'Trp.',
    familie: 'blech',
    klang: 'trompete',
    sound: 'brass.trumpet.b-flat',
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
    kurz: 'Hr.',
    familie: 'blech',
    klang: 'horn',
    sound: 'brass.french-horn',
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
    kurz: 'Fl.',
    familie: 'holz',
    klang: 'floete',
    sound: 'wind.flutes.flute',
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
    kurz: 'Vl.',
    familie: 'streicher',
    klang: 'violine',
    sound: 'strings.violin',
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
    kurz: 'Vc.',
    familie: 'streicher',
    klang: 'violoncello',
    sound: 'strings.cello',
    name: 'Violoncello',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [36, 76],
    lage: [36, 69],
    schluessel: 'bass',
    register: 'Tief und sonor als Bass, in der Tenorlage (A-Saite) einer der schönsten Melodieklänge des Orchesters.',
  },
  {
    id: 'viola',
    kurz: 'Va.',
    familie: 'streicher',
    klang: 'viola',
    sound: 'strings.viola',
    name: 'Viola',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [48, 88],
    lage: [48, 79],
    schluessel: 'alto',
    register: 'Die C-Saite ist dunkel und herb, die A-Saite hell und eindringlich; der Klang ist wärmer und verschleierter als bei der Violine. Notiert im Altschlüssel, in der Höhe im Violinschlüssel.',
  },
  {
    id: 'kontrabass',
    kurz: 'Kb.',
    familie: 'streicher',
    klang: 'kontrabass',
    sound: 'strings.contrabass',
    name: 'Kontrabass',
    stimmung: '',
    transposition: { stufen: 7, halbtoene: 12, name: 'eine Oktave tiefer' },
    umfang: [28, 67],
    lage: [28, 60],
    schluessel: 'bass',
    register: 'Das Fundament des Orchesters: klingt eine Oktave tiefer als notiert. Meist verdoppelt er das Violoncello eine Oktave tiefer; schnelle Läufe in der Tiefe klingen undeutlich.',
  },
  {
    id: 'oboe',
    kurz: 'Ob.',
    familie: 'holz',
    klang: 'oboe',
    sound: 'wind.reed.oboe',
    name: 'Oboe',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [58, 91],
    lage: [62, 86],
    schluessel: 'treble',
    register: 'Näselnd, klagend und sehr gut zu hören, auch im vollen Orchester; ideal für ausdrucksvolle Soli. Die tiefsten Töne sind laut und grob, die höchsten dünn.',
  },
  {
    id: 'fagott',
    kurz: 'Fg.',
    familie: 'holz',
    klang: 'fagott',
    sound: 'wind.reed.bassoon',
    name: 'Fagott',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [34, 75],
    lage: [36, 67],
    schluessel: 'bass',
    register: 'Der Bass der Holzbläser: unten sonor, in der Mitte weich und oft humorvoll, oben gepresst und klagend (Strawinskys „Sacre“ beginnt dort).',
  },
  {
    id: 'posaune',
    kurz: 'Pos.',
    familie: 'blech',
    klang: 'posaune',
    sound: 'brass.trombone',
    name: 'Posaune',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [40, 72],
    lage: [43, 67],
    schluessel: 'bass',
    register: 'Feierlich und weich im Piano, mächtig im Forte; im Choral der Posaunen klingt ein ganzes Gewölbe. Schnelle Bindungen über weite Zugwege sind schwer.',
  },
  {
    id: 'tuba',
    kurz: 'Tb.',
    familie: 'blech',
    klang: 'tuba',
    sound: 'brass.tuba',
    name: 'Tuba',
    stimmung: '',
    transposition: { stufen: 0, halbtoene: 0, name: 'wie notiert' },
    umfang: [28, 65],
    lage: [31, 58],
    schluessel: 'bass',
    register: 'Der Bass des Blechs: rund und tragend, braucht viel Luft. Lange Pausen zum Atmen einplanen.',
  },
  {
    id: 'baritonsax',
    kurz: 'Bsax.',
    familie: 'saxophon',
    klang: 'fagott',
    sound: 'wind.reed.saxophone.baritone',
    name: 'Baritonsaxophon',
    stimmung: 'in Es',
    transposition: { stufen: 12, halbtoene: 21, name: 'eine Oktave und eine große Sexte tiefer' },
    umfang: [37, 69],
    lage: [38, 62],
    schluessel: 'treble',
    register: 'Das Fundament im Saxophonsatz der Big Band: unten knurrend und kräftig, in der Mitte überraschend warm.',
  },
];
export const instrument = (id: string | undefined) => (id ? INSTRUMENTE.find((i) => i.id === id) : undefined);

/** Partitur-Reihenfolge: Holz, Blech, Saxophone, Tasten, Streicher; innerhalb von oben nach unten */
const REIHENFOLGE = ['floete', 'oboe', 'klarinette', 'fagott', 'horn', 'trompete', 'posaune', 'tuba', 'altsax', 'tenorsax', 'baritonsax', 'violine', 'viola', 'violoncello', 'kontrabass'];
export const partiturRang = (id: string) => REIHENFOLGE.indexOf(id);

export interface Ensemble {
  id: string;
  name: string;
  instrumente: string[];
}

/** Vorgefertigte Besetzungen für den Editor */
export const ENSEMBLES: Ensemble[] = [
  { id: 'streichquartett', name: 'Streichquartett', instrumente: ['violine', 'violine', 'viola', 'violoncello'] },
  { id: 'streichtrio', name: 'Streichtrio', instrumente: ['violine', 'viola', 'violoncello'] },
  { id: 'holztrio', name: 'Holzbläsertrio', instrumente: ['oboe', 'klarinette', 'fagott'] },
  { id: 'blaeserquintett', name: 'Bläserquintett', instrumente: ['floete', 'oboe', 'klarinette', 'horn', 'fagott'] },
  { id: 'blechquartett', name: 'Blechbläserquartett', instrumente: ['trompete', 'trompete', 'horn', 'posaune'] },
  { id: 'saxsatz', name: 'Saxophonsatz', instrumente: ['altsax', 'altsax', 'tenorsax', 'baritonsax'] },
  { id: 'duo', name: 'Altsaxophon und Violoncello', instrumente: ['altsax', 'violoncello'] },
];

/** Stimmnamen einer Besetzung: doppelte Instrumente werden nummeriert („Violine 1“, „Violine 2“) */
export function stimmNamen(ids: string[]): { name: string; kurz: string }[] {
  return ids.map((id, k) => {
    const i = instrument(id)!;
    const gleiche = ids.filter((x) => x === id).length;
    if (gleiche < 2) return { name: i.name, kurz: i.kurz };
    const nr = ids.slice(0, k + 1).filter((x) => x === id).length;
    return { name: `${i.name} ${nr}`, kurz: `${i.kurz} ${nr}` };
  });
}

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

/**
 * Partitur in transponierter Notation: Jede Stimme eines transponierenden Instruments
 * wird so geschrieben, wie der Spieler sie liest, mit eigenen Vorzeichen.
 * Die Noten bleiben in derselben Reihenfolge, damit Kennungen und Markierungen gültig bleiben.
 */
export function transponiereScore(score: Score, transponiert = true): Score {
  return {
    ...score,
    voices: score.voices.map((v) => {
      const t = anzeigeTransposition(v.instrument, transponiert);
      if (!t) return v;
      const i = instrument(v.instrument)!;
      const { stufen, halbtoene } = t;
      return {
        ...v,
        ...(halbtoene % 12 ? { key: notierteTonart(score.key, i) } : {}),
        measures: v.measures.map((m) => ({ notes: m.notes.map((n) => (n.pitch ? { ...n, pitch: verschiebe(n.pitch, stufen, halbtoene) } : n)) })),
      };
    }),
  };
}

/**
 * Wie weit eine Stimme in der Anzeige verschoben wird. Oktavtransponierende Instrumente
 * (Kontrabass) stehen auch in der klingenden Partitur eine Oktave höher, wie üblich.
 */
export function anzeigeTransposition(id: string | undefined, transponiert: boolean): { stufen: number; halbtoene: number } | null {
  const i = instrument(id);
  if (!i) return null;
  const { stufen, halbtoene } = i.transposition;
  if (!stufen && !halbtoene) return null;
  if (transponiert) return { stufen, halbtoene };
  const oktaven = Math.trunc(halbtoene / 12);
  return oktaven && halbtoene % 12 === 0 ? { stufen: 7 * oktaven, halbtoene: 12 * oktaven } : null;
}

/** General-MIDI-Programm (1–128), damit Notenprogramme ohne instrument-sound den Klang finden */
export const MIDI_PROGRAMM: Record<string, number> = {
  violine: 41, viola: 42, violoncello: 43, kontrabass: 44, floete: 74, oboe: 69, klarinette: 72, fagott: 71,
  horn: 61, trompete: 57, posaune: 58, tuba: 59, altsax: 66, tenorsax: 67, baritonsax: 68,
};

/** Transposition für MusicXML: klingend = notiert + diatonic/chromatic + Oktaven */
export function musicXmlTransposition(i: Instrument): { diatonic: number; chromatic: number; octave: number } | null {
  const { stufen, halbtoene } = i.transposition;
  if (!stufen && !halbtoene) return null;
  const octave = Math.floor(halbtoene / 12);
  return { diatonic: -(stufen - 7 * octave), chromatic: -(halbtoene - 12 * octave), octave: -octave };
}

const NAMEN_ERKENNUNG: [RegExp, string][] = [
  [/bariton.*sax|bari(tone)? sax/i, 'baritonsax'],
  [/tenor.*sax/i, 'tenorsax'],
  [/alt.*sax|alto sax/i, 'altsax'],
  [/kontrabass|contrabass|double bass|^kb\.?$|^cb\.?$/i, 'kontrabass'],
  [/violoncell|cello|^vc\.?$/i, 'violoncello'],
  [/viola|bratsche|^va\.?$/i, 'viola'],
  [/violin|geige|^vl\.?|^vn\.?/i, 'violine'],
  [/flöte|flute|^fl\.?$/i, 'floete'],
  [/oboe|^ob\.?$/i, 'oboe'],
  [/klarinette|clarinet|^kl(ar)?\.?$|^cl\.?$/i, 'klarinette'],
  [/fagott|bassoon|^fg\.?$|^bsn\.?$/i, 'fagott'],
  [/horn|^hr\.?$|^hn\.?$/i, 'horn'],
  [/trompete|trumpet|^tr?pt?\.?$/i, 'trompete'],
  [/posaune|trombone|^pos\.?$|^tbn\.?$/i, 'posaune'],
  [/tuba|^tb\.?$/i, 'tuba'],
];

/** Erkennt ein Instrument aus MusicXML: zuerst an der Klangkennung, sonst am Namen */
export function erkenneInstrument(sound: string | undefined, name: string | undefined): string | undefined {
  if (sound) {
    const genau = INSTRUMENTE.find((i) => i.sound === sound);
    if (genau) return genau.id;
    if (sound.startsWith('wind.reed.saxophone.alto')) return 'altsax';
    if (sound.startsWith('wind.reed.saxophone.tenor')) return 'tenorsax';
    if (sound.startsWith('wind.reed.saxophone.baritone')) return 'baritonsax';
    if (sound.startsWith('wind.reed.clarinet')) return 'klarinette';
    if (sound.startsWith('brass.trumpet')) return 'trompete';
    if (sound.startsWith('brass.trombone')) return 'posaune';
    if (sound.startsWith('brass.french-horn')) return 'horn';
  }
  if (!name) return undefined;
  return NAMEN_ERKENNUNG.find(([re]) => re.test(name.trim()))?.[1];
}
