import { instrument, lageText, umfangText, type Instrument } from '../model/instrumente';
import { diatonicIndex, fromDiatonic, germanName, germanNameWithOctave, spellMidi, toMidi } from '../model/pitch';
import type { Clef, Pitch, Step } from '../model/types';
import type { Aufgabe, Stufe } from './aufgaben';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const artikel = (i: Instrument) => (/(cello|fagott|horn|saxophon)$/i.test(i.name) ? 'das' : /^(Kontrabass)$/.test(i.name) ? 'der' : 'die');
const familieBegriff: Record<Instrument['familie'], string> = {
  streicher: 'streicher',
  holz: 'holzblaeser',
  blech: 'blechblaeser',
  saxophon: 'saxophon',
  tasten: 'klavier',
};
/** Lexikoneintrag zum Instrument: eigener Eintrag, sonst der der Familie */
const begriffFuer = (i: Instrument) => (i.familie === 'saxophon' || i.familie === 'tasten' ? familieBegriff[i.familie] : i.id);

/** Altschlüssel lesen: c′ liegt auf der Mittellinie */
export function altschluesselAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  // Stufe 1: im System (f bis g′), Stufe 2: mit einer Hilfslinie (d bis b′), Stufe 3: weiter und mit Vorzeichen
  const [lo, hi] =
    stufe === 1
      ? [diatonicIndex({ step: 'F', octave: 3 }), diatonicIndex({ step: 'G', octave: 4 })]
      : stufe === 2
        ? [diatonicIndex({ step: 'D', octave: 3 }), diatonicIndex({ step: 'B', octave: 4 })]
        : [diatonicIndex({ step: 'C', octave: 3 }), diatonicIndex({ step: 'E', octave: 5 })];
  let ton = fromDiatonic(int(rng, lo, hi), 0);
  if (stufe === 3 && rng() < 0.5) ton = { ...ton, alter: rng() < 0.5 ? 1 : -1 };
  const loesung = stufe === 3 ? germanNameWithOctave(ton) : germanName(ton);
  let optionen: string[];
  if (stufe === 3) {
    // Typische Verwechslungen: wie im Violin- oder Bassschlüssel gelesen, eine Oktave daneben
    const kandidaten = [
      ton,
      { ...ton, octave: ton.octave + 1 },
      { ...ton, octave: ton.octave - 1 },
      fromDiatonic(diatonicIndex(ton) + 1, 0),
      fromDiatonic(diatonicIndex(ton) - 1, 0),
    ].map((p) => germanNameWithOctave(p));
    optionen = shuffle(rng, [...new Set(kandidaten)]).filter((o) => o !== loesung).slice(0, 3);
    optionen = shuffle(rng, [loesung, ...optionen]);
  } else {
    optionen = STEPS.map((s) => germanName({ step: s, octave: 4 }));
  }
  return {
    typ: 'altschluessel-lesen',
    frage: 'Wie heißt diese Note im Altschlüssel (Bratschenschlüssel)?',
    noten: { clef: 'alto', groups: [[ton]] },
    klang: { art: 'nacheinander', toene: [ton], instrument: 'viola' },
    optionen,
    loesung,
    erklaerung: `Das ist ${germanNameWithOctave(ton)}. Merkhilfe: Der Altschlüssel zeigt mit seiner Mitte auf die Mittellinie, dort liegt c′. Die Linien darunter sind a und f, darüber e′ und g′.`,
    begriff: 'altschluessel',
  };
}

const HOER_POOL: Record<Stufe, string[]> = {
  1: ['violine', 'violoncello', 'floete', 'trompete'],
  2: ['violine', 'violoncello', 'floete', 'oboe', 'klarinette', 'fagott', 'horn', 'trompete'],
  3: ['violine', 'viola', 'violoncello', 'kontrabass', 'floete', 'oboe', 'klarinette', 'fagott', 'horn', 'trompete', 'posaune', 'tuba'],
};

/** Ein Instrument am Klang erkennen: ein kurzer gebrochener Dreiklang in seiner guten Lage */
export function instrumentHoerenAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = HOER_POOL[stufe];
  const i = instrument(pick(rng, pool))!;
  // Grundton so, dass die Oktave darüber noch in der guten Lage liegt
  const grund = int(rng, i.lage[0], Math.max(i.lage[0], i.lage[1] - 12));
  const toene = [0, 4, 7, 12, 7, 4, 0].map((d) => spellMidi(grund + d, 0));
  // Ablenker: auf Stufe 3 bevorzugt aus derselben Familie
  const gleich = pool.filter((id) => id !== i.id && instrument(id)!.familie === i.familie);
  const rest = pool.filter((id) => id !== i.id && !gleich.includes(id));
  const ablenker = stufe === 3 ? [...shuffle(rng, gleich), ...shuffle(rng, rest)] : shuffle(rng, [...gleich, ...rest]);
  const optionen = shuffle(rng, [i.id, ...ablenker.slice(0, 3)]).map((id) => instrument(id)!.name);
  return {
    typ: 'instrument-hoeren',
    frage: 'Welches Instrument spielt?',
    klang: { art: 'nacheinander', toene, instrument: i.id },
    optionen,
    loesung: i.name,
    erklaerung: `Das war ${artikel(i)} ${i.name}, in der guten Lage. ${i.register}`,
    begriff: begriffFuer(i),
  };
}

export const LAGE_ANTWORTEN = ['Gute Lage', 'Spielbar, aber Randlage', 'Nicht spielbar'] as const;

/** Liegt ein (klingender) Ton für ein Instrument gut, am Rand oder außerhalb des Umfangs? */
export function lageAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const ids = stufe === 1 ? ['violine', 'violoncello', 'floete', 'trompete'] : stufe === 2 ? ['violine', 'viola', 'violoncello', 'floete', 'oboe', 'klarinette', 'fagott', 'trompete', 'horn'] : ['violine', 'viola', 'violoncello', 'kontrabass', 'floete', 'oboe', 'klarinette', 'fagott', 'horn', 'trompete', 'posaune', 'tuba', 'altsax'];
  const i = instrument(pick(rng, ids))!;
  const art = int(rng, 0, 2);
  let midi: number;
  if (art === 0) midi = int(rng, i.lage[0] + 1, i.lage[1] - 1);
  else if (art === 1) {
    const unten = i.lage[0] > i.umfang[0];
    const oben = i.umfang[1] > i.lage[1];
    midi = (oben && (!unten || rng() < 0.6)) ? int(rng, i.lage[1] + 1, i.umfang[1]) : int(rng, i.umfang[0], i.lage[0] - 1);
  } else midi = rng() < 0.5 ? i.umfang[0] - int(rng, 1, stufe === 3 ? 3 : 6) : i.umfang[1] + int(rng, 1, stufe === 3 ? 3 : 6);
  const ton: Pitch = spellMidi(midi, 0);
  const m = toMidi(ton);
  const loesung = m < i.umfang[0] || m > i.umfang[1] ? LAGE_ANTWORTEN[2] : m < i.lage[0] || m > i.lage[1] ? LAGE_ANTWORTEN[1] : LAGE_ANTWORTEN[0];
  const clef: Clef = m >= 60 ? 'treble' : m >= 50 && i.schluessel === 'alto' ? 'alto' : 'bass';
  const name = `${i.name}${i.stimmung ? ` ${i.stimmung}` : ''}`;
  return {
    typ: 'lage-einschaetzen',
    frage: `Dieser Ton soll klingend auf ${artikel(i) === 'der' ? 'dem' : artikel(i) === 'die' ? 'der' : 'dem'} ${name} erklingen. Wie liegt er?`,
    noten: { clef, groups: [[ton]] },
    ...(loesung !== LAGE_ANTWORTEN[2] ? { klang: { art: 'nacheinander' as const, toene: [ton], instrument: i.id } } : {}),
    optionen: [...LAGE_ANTWORTEN],
    loesung,
    erklaerung: `${germanNameWithOctave(ton)} ${loesung === LAGE_ANTWORTEN[0] ? 'liegt in der guten Lage' : loesung === LAGE_ANTWORTEN[1] ? 'ist spielbar, liegt aber außerhalb der guten Lage' : 'liegt außerhalb des Umfangs'}. ${i.name}: Umfang klingend ${umfangText(i)}, gute Lage ${lageText(i)}.`,
    begriff: begriffFuer(i),
  };
}
