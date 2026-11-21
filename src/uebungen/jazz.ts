import { akkordBeschreibung, akkordToene, parseAkkordsymbol, type AkkordSymbol } from '../jazz/akkordsymbol';
import { optionston, voicings } from '../jazz/analyse';
import { germanKeyName, germanName, spellMidi } from '../model/pitch';
import type { KeySignature, Pitch } from '../model/types';
import { BEKANNT, mengeText, primform, reihenform } from '../neuemusik/pcset';
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
const sym = (s: string): AkkordSymbol => parseAkkordsymbol(s)!;
const name = (p: Pitch) => germanName(p).toLowerCase();

const GRUNDTOENE = ['C', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'A', 'Bb'];
const ZUSAETZE: Record<Stufe, string[]> = {
  1: ['', 'm', '7', 'maj7', 'm7', 'm7b5'],
  2: ['7', 'maj7', 'm7', 'm7b5', 'dim7', '6', 'm6', '7sus4', 'dim'],
  3: ['maj7', 'm7', '7', 'm7b5', 'dim7', '7b9', '7#9', '7#11', 'maj9', 'm9', '13', '+'],
};

/** Welches Akkordsymbol gehört zu diesem Klang? */
export function akkordsymbolAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const zusaetze = ZUSAETZE[stufe];
  const grund = pick(rng, GRUNDTOENE);
  const z = pick(rng, zusaetze);
  const richtig = `${grund}${z}`;
  const andere = shuffle(rng, zusaetze.filter((x) => x !== z)).slice(0, 3).map((x) => `${grund}${x}`);
  const a = sym(richtig);
  const toene = akkordToene(a, 4);
  return {
    typ: 'akkordsymbol-lesen',
    frage: 'Welches Akkordsymbol passt zu diesem Klang? (Englische Tonbuchstaben: B ist H, Bb ist B.)',
    noten: { clef: 'treble', groups: [toene] },
    klang: { art: 'zusammen', toene },
    optionen: shuffle(rng, [richtig, ...andere]),
    loesung: richtig,
    erklaerung: `${akkordBeschreibung(a)}.`,
    begriff: 'akkordsymbole',
  };
}

const DUR_TONARTEN: KeySignature[] = [-3, -2, -1, 0, 1, 2, 3].map((fifths) => ({ fifths, mode: 'major' as const }));
const MOLL_TONARTEN: KeySignature[] = [-2, -1, 0, 1, 2].map((fifths) => ({ fifths, mode: 'minor' as const }));
const DUR_PC = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/** Grundton-Name (international) einer Tonklasse in der Tonart */
function wurzel(pc: number, fifths: number): string {
  const p = spellMidi(60 + pc, fifths);
  return `${p.step}${p.alter === 1 ? '#' : p.alter === -1 ? 'b' : ''}`;
}

/** Welche Akkordfolge ist die II–V–I in dieser Tonart? */
export function zweiFuenfEinsAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const moll = stufe >= 2 && rng() < 0.4;
  const key = pick(rng, moll ? MOLL_TONARTEN : DUR_TONARTEN);
  const ton = moll ? (DUR_PC[((key.fifths % 12) + 12) % 12] + 9) % 12 : DUR_PC[((key.fifths % 12) + 12) % 12];
  const f = key.fifths;
  const ii = wurzel(ton + 2, f);
  const v = wurzel(ton + 7, f);
  const i = wurzel(ton, f);
  const richtig = moll ? `${ii}m7b5 – ${v}7 – ${i}m6` : `${ii}m7 – ${v}7 – ${i}maj7`;
  const falsch = moll
    ? [`${ii}m7 – ${v}m7 – ${i}m6`, `${wurzel(ton + 5, f)}m7 – ${wurzel(ton + 10, f)}7 – ${wurzel(ton + 3, f)}maj7`, `${ii}m7b5 – ${v}7 – ${wurzel(ton + 3, f)}maj7`]
    : [`${ii}7 – ${v}m7 – ${i}maj7`, `${wurzel(ton + 5, f)}maj7 – ${v}7 – ${i}maj7`, `${wurzel(ton + 9, f)}m7 – ${ii}7 – ${v}maj7`];
  const folge = richtig.split(' – ').map((s) => voicings(sym(s)).drop2);
  return {
    typ: 'zwei-fuenf-eins',
    frage: `Welche Folge ist die II–V–I in ${germanKeyName(key)}?`,
    klang: { art: 'zusammen', toene: folge[0], folge },
    optionen: shuffle(rng, [richtig, ...falsch]),
    loesung: richtig,
    erklaerung: moll
      ? `In Moll ist die II halbvermindert (IIø7), die V ein Dominantseptakkord mit Leitton, die I ein Mollakkord (oft m6 oder m(maj7)): ${richtig}.`
      : `II ist ein Mollseptakkord (IIm7), V ein Dominantseptakkord (V7), I ein großer Septakkord (Imaj7). Die Grundtöne fallen in Quinten: ${richtig}.`,
    begriff: 'zwei-fuenf-eins',
  };
}

/** Welcher Akkord ersetzt diese Dominante als Tritonus-Substitution? */
export function tritonusAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const ziel = pick(rng, [0, 2, 3, 5, 7, 8, 10]);
  const f = pick(rng, [-3, -2, -1, 0, 1]);
  const dom = `${wurzel(ziel + 7, f)}7`;
  const sub = `${wurzel(ziel + 1, -5)}7`;
  const zielSym = `${wurzel(ziel, f)}maj7`;
  const falsch = [`${wurzel(ziel + 2, f)}7`, `${wurzel(ziel + 8, -4)}7`, stufe >= 2 ? `${wurzel(ziel + 1, -5)}m7` : `${wurzel(ziel + 6, f)}7`];
  const d = sym(dom);
  const s = sym(sub);
  const dt = akkordToene(d, 4);
  const gemeinsam = [dt[1], dt[3]].map(name);
  return {
    typ: 'tritonus-substitution',
    frage: `${dom} löst sich nach ${zielSym} auf. Welcher Akkord kann ${dom} als Tritonus-Substitution ersetzen?`,
    klang: { art: 'zusammen', toene: voicings(d).shell, folge: [voicings(s).shell, voicings(sym(zielSym)).shell] },
    optionen: shuffle(rng, [sub, ...falsch.filter((x) => x !== sub)]).slice(0, 4),
    loesung: sub,
    erklaerung: `${sub} liegt einen Tritonus von ${dom} entfernt und teilt mit ihm Terz und Septime (${gemeinsam.join(' und ')}, vertauscht). Sein Grundton führt im Halbtonschritt abwärts nach ${zielSym}.`,
    begriff: 'tritonus-substitution',
  };
}

const OPTIONEN = ['Akkordton', 'Tension (Optionston)', 'Avoid Note', 'Leiterfremd'] as const;

/** Wie passt ein Melodieton zum Akkord? */
export function optionstonAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const akkorde = stufe === 1 ? ['Cmaj7', 'Dm7', 'G7', 'Fmaj7', 'Am7'] : ['Cmaj7', 'Dm7', 'G7', 'Fmaj7', 'Am7', 'Bm7b5', 'Ebmaj7', 'Bb7', 'E7', 'C7'];
  for (;;) {
    const a = sym(pick(rng, akkorde));
    const pc = Math.floor(rng() * 12);
    const ton = spellMidi(72 + pc, a.grund.alter < 0 ? -3 : 0);
    const o = optionston(ton, a);
    // Leiterfremde Töne seltener fragen
    if (o.art === 'fremd' && rng() < 0.6) continue;
    const loesung = o.art === 'akkordton' ? OPTIONEN[0] : o.art === 'tension' ? OPTIONEN[1] : o.art === 'avoid' ? OPTIONEN[2] : OPTIONEN[3];
    const toene = akkordToene(a, 3);
    const erkl: Record<string, string> = {
      akkordton: `${germanName(ton)} ist ${o.name} von ${a.text}, also ein Akkordton.`,
      tension: `${germanName(ton)} ist über ${a.text} die ${o.name}: ein Optionston, der den Akkord färbt, ohne ihn zu verändern.`,
      avoid: `${germanName(ton)} ist über ${a.text} eine Avoid Note (${o.name}): Sie liegt einen Halbton über einem Akkordton und reibt sich, wenn sie lang klingt. Als kurzer Durchgang geht sie.`,
      fremd: `${germanName(ton)} gehört über ${a.text} weder zum Akkord noch zu seinen üblichen Optionstönen (${o.name}).`,
    };
    return {
      typ: 'optionston-bestimmen',
      frage: `Über ${a.text} klingt die Melodienote ${germanName(ton)}. Was ist sie?`,
      noten: { clef: 'treble', groups: [[...toene, ton]] },
      klang: { art: 'zusammen', toene: [...toene, ton] },
      optionen: [...OPTIONEN],
      loesung,
      erklaerung: erkl[o.art],
      begriff: 'optionstoene',
    };
  }
}

const TRICHORDE = [[0, 1, 2], [0, 1, 3], [0, 1, 4], [0, 1, 5], [0, 1, 6], [0, 2, 4], [0, 2, 5], [0, 2, 6], [0, 2, 7], [0, 3, 6], [0, 3, 7], [0, 4, 8]];
const TETRACHORDE = [[0, 1, 2, 3], [0, 1, 4, 5], [0, 1, 6, 7], [0, 2, 5, 8], [0, 3, 6, 9], [0, 3, 5, 8], [0, 1, 5, 8], [0, 2, 5, 7], [0, 1, 3, 7], [0, 2, 4, 6]];

/** Primform eines Klangs bestimmen */
export function pcsetAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const pool = stufe === 1 ? TRICHORDE : stufe === 2 ? [...TRICHORDE, ...TETRACHORDE.slice(0, 5)] : [...TRICHORDE, ...TETRACHORDE];
  const menge = pick(rng, pool);
  const umgekehrt = rng() < 0.5 ? menge.map((x) => (12 - x) % 12) : menge;
  const t = Math.floor(rng() * 12);
  const pcs = shuffle(rng, umgekehrt.map((x) => (x + t) % 12));
  // Töne in wechselnden Oktaven, damit man die Tonklassen ordnen muss
  const toene = pcs.map((pc) => spellMidi(60 + pc + (rng() < 0.3 ? 12 : 0), 0));
  const richtig = mengeText(primform(pcs));
  const andere = shuffle(rng, pool.filter((m) => m.length === menge.length && mengeText(m) !== richtig)).slice(0, 3).map(mengeText);
  const bekannt = BEKANNT[richtig];
  return {
    typ: 'pcset-bestimmen',
    frage: 'Welche Primform hat diese Tonmenge? Ordne die Tonklassen eng, wähle die kompakteste Form und setze den ersten Ton auf 0.',
    noten: { clef: 'treble', groups: toene.map((p) => [p]) },
    klang: { art: 'nacheinander', toene },
    optionen: shuffle(rng, [richtig, ...andere]),
    loesung: richtig,
    erklaerung: `Die Töne ${toene.map(name).join(', ')} sind die Tonklassen ${pcs.map(String).join(', ')} (c = 0). Eng geordnet und auf 0 gesetzt ergibt sich die Primform ${richtig}${bekannt ? `: ${bekannt}` : ''}. Umkehrung und Transposition zählen als dieselbe Menge.`,
    begriff: 'pitch-class-set',
  };
}

const REIHEN = [
  [4, 5, 0, 11, 10, 3, 2, 1, 7, 6, 9, 8],
  [0, 11, 7, 8, 3, 1, 2, 10, 6, 5, 4, 9],
  [7, 10, 2, 6, 9, 0, 4, 8, 11, 1, 3, 5],
  [3, 7, 10, 2, 1, 5, 8, 0, 11, 6, 9, 4],
];
const FORMEN = { P: 'Grundgestalt', I: 'Umkehrung', R: 'Krebs', RI: 'Krebsumkehrung' } as const;

/** Welche Reihenform ist das? */
export function reihenformAufgabe(rng: Rng, stufe: Stufe): Aufgabe {
  const reihe = pick(rng, REIHEN);
  const formen = (stufe === 1 ? ['I', 'R'] : ['P', 'I', 'R', 'RI']) as (keyof typeof FORMEN)[];
  const form = pick(rng, formen);
  const t = stufe === 3 ? Math.floor(rng() * 12) : reihe[0];
  let neu = reihenform(reihe, form, t);
  if (form === 'P' && neu.every((x, i) => x === reihe[i])) neu = reihenform(reihe, 'P', (reihe[0] + 7) % 12);
  const ton = (pc: number) => spellMidi(60 + pc, 0);
  return {
    typ: 'reihenform-bestimmen',
    frage: `Oben die Zwölftonreihe, unten eine Ableitung. Welche Form ist das${stufe === 3 ? ' (auch transponiert)' : ''}?`,
    noten: { clef: 'treble', groups: [...reihe.map((pc) => [ton(pc)]), ...neu.map((pc) => [ton(pc)])] },
    klang: { art: 'nacheinander', toene: neu.map(ton) },
    optionen: (stufe === 1 ? ['Umkehrung', 'Krebs', 'Krebsumkehrung'] : Object.values(FORMEN)) as string[],
    loesung: FORMEN[form],
    erklaerung: {
      P: 'Grundgestalt: dieselben Intervalle in derselben Richtung, nur auf einem anderen Ton begonnen.',
      I: 'Umkehrung: jedes Intervall geht in die Gegenrichtung (aus einer Sekunde aufwärts wird eine Sekunde abwärts).',
      R: 'Krebs: die Reihe rückwärts, vom letzten zum ersten Ton.',
      RI: 'Krebsumkehrung: die Umkehrung rückwärts gelesen.',
    }[form],
    begriff: 'zwoelftonmusik',
  };
}
