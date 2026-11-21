import { FORTSPINNUNG, GANZTON, MEDIANTEN, NEAPOLITANER, PENTATONIK, PLANING, QUARTEN, SARABANDE, SONATINE, UEBERMAESSIG, ZWOELFTON, type StilAusschnitt } from '../data/stilbeispiele';
import { menuettMitTrio } from '../data/formbeispiele';
import { verschiebe } from '../model/instrumente';
import { germanKeyName } from '../model/pitch';
import type { KeySignature, Pitch, Score } from '../model/types';
import { parsePitch } from '../lexikon/parse';
import { satz } from '../satz/kurzform';
import { stilProfil } from '../satz/stil';
import { stilmerkmale } from '../satz/stilmerkmale';
import { BWV772 } from './analyse';
import type { Aufgabe, Stufe } from './aufgaben';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ausschnitte für „Epoche erkennen“: echte Werke und eigene Übungssätze im Stil der Epoche */
export const STIL_AUSSCHNITTE: StilAusschnitt[] = [
  { id: 'bwv772', stil: 'barock', score: BWV772, erklaerung: 'Bach, Invention C-Dur: ein kurzes Motiv in Sechzehnteln wird in beiden Stimmen imitiert und fortgesponnen. Gleichmäßige Bewegung und Imitation sind typisch für den Barock.' },
  { id: 'fortspinnung', stil: 'barock', score: FORTSPINNUNG, erklaerung: 'Ein Motiv wandert über einer Quintfallsequenz im Bass abwärts (Fortspinnung). Motorischer Achtelfluss und Sequenzen prägen den Barock.' },
  { id: 'sarabande', stil: 'barock', score: SARABANDE, erklaerung: 'Langsamer Dreiertakt mit Betonung auf der Zählzeit 2: eine Sarabande, ein Tanz der barocken Suite.' },
  { id: 'sonatine', stil: 'klassik', score: SONATINE, erklaerung: 'Eine achttaktige Periode mit Halbschluss in Takt 4, Melodie oben und Alberti-Bass unten: das klassische Ideal von Klarheit und Gleichgewicht.' },
  { id: 'menuett', stil: 'klassik', score: menuettMitTrio, erklaerung: 'Menuett mit Trio: klare Viertaktgruppen, Kadenzen an den Abschnittsenden, schlichte Begleitung. Das ist die Formsprache der Klassik.' },
  { id: 'neapolitaner', stil: 'romantik', score: NEAPOLITANER, erklaerung: 'Neapolitaner und verminderter Septakkord in Moll: leiterfremde, ausdrucksstarke Akkorde färben die Kadenz. So klingt die Romantik.' },
  { id: 'uebermaessig', stil: 'romantik', score: UEBERMAESSIG, erklaerung: 'Ein übermäßiger Sextakkord drängt mit zwei Leittönen zur Dominante: chromatische Spannung, typisch für die Romantik.' },
  { id: 'medianten', stil: 'romantik', score: MEDIANTEN, erklaerung: 'Dur-Akkorde im Terzabstand (C – As – C – E) mit einem gemeinsamen Ton: Medianten färben die Harmonik, ohne eine Kadenz zu bilden.' },
  { id: 'planing', stil: 'impressionismus', score: PLANING, erklaerung: 'Alle Stimmen verschieben denselben Klang parallel, Quinten inklusive: Parallelverschiebung (Planing) wie bei Debussy.' },
  { id: 'ganzton', stil: 'impressionismus', score: GANZTON, erklaerung: 'Nur Ganztonschritte, kein Leitton, kein Grundton: Die Ganztonleiter klingt schwebend, wie in Debussys „Voiles“.' },
  { id: 'pentatonik', stil: 'impressionismus', score: PENTATONIK, erklaerung: 'Fünf Töne ohne Halbtonschritte (g a c d e): Pentatonik, wie in Debussys „Pagodes“.' },
  { id: 'quarten', stil: 'moderne', score: QUARTEN, erklaerung: 'Klänge aus geschichteten Quarten statt Terzen haben keinen Dur- oder Mollcharakter: Quartenharmonik der Moderne.' },
  { id: 'zwoelfton', stil: 'moderne', score: ZWOELFTON, erklaerung: 'Alle zwölf Töne kommen genau einmal vor, bevor sich einer wiederholt: eine Zwölftonreihe nach Schönberg.' },
];

const EPOCHEN = ['barock', 'klassik', 'romantik', 'impressionismus', 'moderne'] as const;

/** Epoche eines Ausschnitts bestimmen (Notenbild und Klang) */
export function epocheAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  // Stufe 1 ohne die ganz kurzen Melodien, ab Stufe 2 alles
  const pool = stufe === 1 ? STIL_AUSSCHNITTE.filter((a) => !['ganzton', 'pentatonik', 'zwoelfton'].includes(a.id)) : STIL_AUSSCHNITTE;
  const a = pick(rng, pool);
  const score = a.score();
  const merkmale = stilmerkmale(score);
  const name = stilProfil(a.stil).name;
  return {
    typ: 'epoche-erkennen',
    frage: 'Aus welcher Epoche könnte dieser Ausschnitt stammen? Hör ihn dir an und schau dir die Noten an.',
    satz: { ...score, title: '' },
    optionen: EPOCHEN.map((e) => stilProfil(e).name),
    loesung: name,
    erklaerung: `${name}. ${a.erklaerung}${merkmale.length ? ` Gefundene Stilmerkmale: ${merkmale.map((m) => m.name).join(', ')}.` : ''}`,
    begriff: stilProfil(a.stil).begriff,
  };
}

interface AlterierterAkkord {
  name: string;
  begriff: string;
  /** Tonart der Vorlage (C-Dur oder a-Moll) */
  moll: boolean;
  /** Akkord und Auflösung, je Sopran, Alt, Tenor, Bass */
  akkord: [string, string, string, string];
  aufloesung: [string, string, string, string];
  erklaerung: string;
  ab: Stufe;
}

export const ALTERIERTE: AlterierterAkkord[] = [
  {
    name: 'Neapolitaner',
    begriff: 'neapolitaner',
    moll: true,
    akkord: ['Bb4', 'F4', 'D4', 'D3'],
    aufloesung: ['G#4', 'E4', 'B3', 'E3'],
    erklaerung: 'Der Dur-Akkord auf der tiefalterierten II. Stufe, mit der Terz im Bass (Sextakkord). Er vertritt die Subdominante und führt zur Dominante.',
    ab: 1,
  },
  {
    name: 'Verminderter Septakkord',
    begriff: 'verminderter-septakkord',
    moll: true,
    akkord: ['G#4', 'F4', 'D4', 'B2'],
    aufloesung: ['A4', 'E4', 'C4', 'A2'],
    erklaerung: 'Lauter kleine Terzen über dem Leitton (gis – h – d – f). Er ist eine verkürzte Dominante mit kleiner None und löst sich in die Tonika auf.',
    ab: 1,
  },
  {
    name: 'Übermäßiger Sextakkord',
    begriff: 'uebermaessiger-sextakkord',
    moll: true,
    akkord: ['D#5', 'A4', 'A3', 'F2'],
    aufloesung: ['E5', 'G#4', 'B3', 'E2'],
    erklaerung: 'Zwischen Bass (f) und Oberstimme (dis) liegt eine übermäßige Sexte. Beide Töne streben auseinander zur Oktave der Dominante e.',
    ab: 2,
  },
  {
    name: 'Zwischendominante',
    begriff: 'zwischendominante',
    moll: false,
    akkord: ['G#4', 'E4', 'B3', 'E3'],
    aufloesung: ['A4', 'E4', 'C4', 'A2'],
    erklaerung: 'E-Dur ist in C-Dur leiterfremd: Mit dem Leitton gis ist es die Dominante von a-Moll, der Tonikaparallele. Bezeichnung (D)Tp.',
    ab: 1,
  },
  {
    name: 'Dominantnonakkord',
    begriff: 'nonakkord',
    moll: false,
    akkord: ['A4', 'F4', 'B3', 'G2'],
    aufloesung: ['G4', 'E4', 'C4', 'C3'],
    erklaerung: 'Ein Dominantseptakkord mit None (g – h – f – a, die Quinte fehlt). Die None a löst sich abwärts zur Quinte g auf.',
    ab: 2,
  },
  {
    name: 'Mediante',
    begriff: 'terzverwandtschaft',
    moll: false,
    akkord: ['C5', 'Eb4', 'Ab3', 'Ab2'],
    aufloesung: ['C5', 'E4', 'G3', 'C3'],
    erklaerung: 'As-Dur liegt eine große Terz unter C-Dur und teilt mit ihm den Ton c: eine Mediante aus der gleichnamigen Molltonart (in C-Dur entlehnt aus c-Moll).',
    ab: 3,
  },
];

/** Transpositionen: diatonische Stufen, Halbtöne, Quinten der Tonart */
const TRANSPOSITIONEN: [number, number, number][] = [
  [0, 0, 0],
  [4, 7, 1],
  [3, 5, -1],
  [1, 2, 2],
  [-1, -2, -2],
];

/** Einen alterierten Akkord samt Auflösung bestimmen */
export function alteriertAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = ALTERIERTE.filter((a) => a.ab <= stufe);
  const a = pick(rng, pool);
  const [stufen, halb, quinten] = stufe === 1 ? [0, 0, 0] : pick(rng, TRANSPOSITIONEN);
  const key: KeySignature = { fifths: quinten, mode: a.moll ? 'minor' : 'major' };
  const t = (n: string): Pitch => verschiebe(parsePitch(n), stufen, halb);
  const kurz = (p: Pitch) => `${p.step}${p.alter === 1 ? '#' : p.alter === -1 ? 'b' : p.alter === 2 ? '##' : p.alter === -2 ? 'bb' : ''}${p.octave}`;
  const stimmen = a.akkord.map((n, i) => `${kurz(t(n))}:2 ${kurz(t(a.aufloesung[i]))}:2`) as [string, string, string, string];
  const score: Score = satz({ titel: '', tonart: `${quinten}${a.moll ? ' moll' : ''}`, tempo: 60, stimmen });
  const optionen = shuffle(rng, [a.name, ...shuffle(rng, ALTERIERTE.filter((x) => x.name !== a.name && x.ab <= Math.max(stufe, 2)).map((x) => x.name)).slice(0, 3)]);
  return {
    typ: 'alteriert-bestimmen',
    frage: `${germanKeyName(key)}: Welcher Akkord steht vor der Auflösung?`,
    satz: score,
    optionen,
    loesung: a.name,
    erklaerung: `${a.name}. ${a.erklaerung}${stufen ? ` Die Töne sind am Beispiel ${a.moll ? 'a-Moll' : 'C-Dur'} genannt; hier steht der Akkord in ${germanKeyName(key)}.` : ''}`,
    begriff: a.begriff,
  };
}
