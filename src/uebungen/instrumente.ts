import { instrument, klingend, notiert, notierteTonart, type Instrument } from '../model/instrumente';
import { fromDiatonic, germanKeyName, germanNameWithOctave, toMidi } from '../model/pitch';
import type { Pitch } from '../model/types';
import type { Aufgabe, Stufe } from './aufgaben';

type Rng = () => number;
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

const titel = (i: Instrument) => `${i.name === 'Klarinette' || i.name === 'Trompete' ? 'die' : i.name === 'Horn' ? 'das' : 'das'} ${i.name} ${i.stimmung}`.trim();

/** Transponieren: klingend → notiert, notiert → klingend, Vorzeichen der Stimme */
export function transpositionAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const ids = stufe === 1 ? ['altsax', 'klarinette'] : stufe === 2 ? ['altsax', 'klarinette', 'horn', 'trompete'] : ['altsax', 'tenorsax', 'klarinette', 'horn', 'trompete'];
  const i = instrument(pick(rng, ids))!;
  const art = pick(rng, stufe === 1 ? ['notiert', 'klingend'] : ['notiert', 'klingend', 'tonart']);
  const erklaerung = `${i.name} ${i.stimmung} klingt ${i.transposition.name} als notiert. Notiert wird also um dieses Intervall höher; die Vorzeichen wandern entsprechend im Quintenzirkel.`;

  if (art === 'tonart') {
    const key = { fifths: pick(rng, [-3, -2, -1, 0, 1, 2]), mode: 'major' as const };
    const loesung = germanKeyName(notierteTonart(key, i));
    const falsch = [germanKeyName(key), germanKeyName(notierteTonart(key, { ...i, transposition: { ...i.transposition, halbtoene: -i.transposition.halbtoene } })), germanKeyName({ ...key, fifths: key.fifths + (key.fifths > 0 ? -1 : 1) * 2 })];
    const optionen = [...new Set([loesung, ...falsch])].slice(0, 4).sort(() => rng() - 0.5);
    return {
      typ: 'transponieren',
      frage: `Das Stück steht klingend in ${germanKeyName(key)}. Welche Tonart steht in der Stimme für ${titel(i)}?`,
      optionen,
      loesung,
      erklaerung,
      begriff: 'transponierende-instrumente',
    };
  }

  // Ein Ton in der guten Lage
  let ton: Pitch;
  do {
    ton = fromDiatonic(28 + Math.floor(rng() * 14), pick(rng, [0, 0, -1, 1, -2, 2]));
  } while (toMidi(ton) < i.lage[0] || toMidi(ton) > i.lage[1]);
  const gegeben = art === 'notiert' ? ton : notiert(ton, i);
  const richtig = art === 'notiert' ? notiert(ton, i) : ton;
  const kandidaten = [
    richtig,
    gegeben,
    art === 'notiert' ? klingend(ton, i) : notiert(gegeben, i),
    // häufiger Fehler: Intervall um eine Stufe verwechselt
    { ...fromDiatonic(28 + (art === 'notiert' ? 1 : -1) * i.transposition.stufen + (toMidi(ton) >= 0 ? Math.round((toMidi(ton) - 60) / 1.7) : 0), 0), alter: 0 },
    art === 'notiert' ? notiert(ton, { ...i, transposition: { ...i.transposition, stufen: i.transposition.stufen + 1, halbtoene: i.transposition.halbtoene + 2 } }) : klingend(gegeben, { ...i, transposition: { ...i.transposition, stufen: i.transposition.stufen - 1, halbtoene: i.transposition.halbtoene - 1 } }),
  ];
  const namen = [...new Set(kandidaten.map(germanNameWithOctave))].slice(0, 4);
  const optionen = namen.sort(() => rng() - 0.5);
  const loesung = germanNameWithOctave(richtig);
  return {
    typ: 'transponieren',
    frage:
      art === 'notiert'
        ? `Klingen soll ${germanNameWithOctave(ton)}. Welcher Ton steht dafür in der Stimme für ${titel(i)}?`
        : `In der Stimme für ${titel(i)} steht ${germanNameWithOctave(gegeben)}. Welcher Ton klingt?`,
    noten: { clef: 'treble', groups: [[gegeben]] },
    optionen,
    loesung,
    erklaerung: `${germanNameWithOctave(gegeben)} ${art === 'notiert' ? 'klingend' : 'notiert'} → ${loesung}. ${erklaerung}`,
    begriff: 'transponierende-instrumente',
  };
}
