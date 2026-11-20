import { measureLength } from '../model/duration';
import { diatonicIndex, keyAlter, toMidi } from '../model/pitch';
import type { Pitch, Score, Step } from '../model/types';
import { klaenge } from '../satz/klaenge';
import { zusammenfassen, type Befund, type BefundArt } from '../satz/regeln';
import { intervall, intervallName } from '../uebungen/theorie';
import { konsonant, vollkommen, type KpRegel } from './fux';
import { stimmToene, type MotivTon } from './motive';

/**
 * Freier zweistimmiger Kontrapunkt im Stil Bachs (Invention).
 * Anders als im strengen Satz sind alle Notenwerte frei. Entscheidend ist die Behandlung der Dissonanzen
 * auf den Zählzeiten: Vorhalt (vorbereitet, abwärts aufgelöst) oder Durchgang/Wechselnote (im Schritt).
 */
export const FREI_REGELN: KpRegel[] = [
  { id: 'fr-dissonanz', titel: 'Dissonanzen auf den Zählzeiten', begriff: 'konsonanz-dissonanz' },
  { id: 'fr-figuration', titel: 'Dissonanzen zwischen den Zählzeiten', begriff: 'durchgang' },
  { id: 'fr-vorhalt', titel: 'Vorhalte', begriff: 'vorhalt' },
  { id: 'fr-parallelen', titel: 'Parallelen', begriff: 'quintparallele' },
  { id: 'fr-schluss', titel: 'Schluss', begriff: 'kadenz' },
  { id: 'fr-kreuzung', titel: 'Stimmkreuzung', begriff: 'stimmkreuzung' },
  { id: 'fr-melodik', titel: 'Melodik', begriff: 'sprung' },
];

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const stufen = (a: Pitch, b: Pitch) => diatonicIndex(a) - diatonicIndex(b);
const halb = (a: Pitch, b: Pitch) => toMidi(a) - toMidi(b);
const gleich = (a: Pitch, b: Pitch) => toMidi(a) === toMidi(b);
const gross = (s: string) => s[0].toUpperCase() + s.slice(1);
const idsVon = (...xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/** Grundton der Tonart als Stufe */
function tonika(fifths: number, mode: 'major' | 'minor'): { step: Step; alter: number } {
  const dur = ((fifths * 4) % 7 + 7) % 7; // C=0, G=4, D=1 …
  const step = STEPS[mode === 'minor' ? (dur + 5) % 7 : dur];
  return { step, alter: keyAlter(step, fifths) };
}

export function pruefeFreienSatz(score: Score, opts: { hinweise?: boolean } = {}): Befund[] {
  if (score.voices.length !== 2) return [];
  const takt = measureLength(score.time);
  // Zählzeit = Schlageinheit; in zusammengesetzten Takten (6/8, 9/8, 12/8) die punktierte Viertel
  const zusammengesetzt = score.time.beatType === 8 && score.time.beats % 3 === 0 && score.time.beats > 3;
  const schlag = zusammengesetzt ? 1.5 : 4 / score.time.beatType;
  // Schwer: Taktanfang und bei vier Schlägen auch die Taktmitte
  const schwerAbstand = score.time.beats === 4 || score.time.beats === 12 ? takt / 2 : takt;
  const auf = (zeit: number, raster: number) => Math.abs(zeit / raster - Math.round(zeit / raster)) < 1e-6;

  const stimmen = [0, 1].map((v) => stimmToene(score, v).filter((t): t is MotivTon => !!t));
  const finde = (v: number, id: string | null) => (id ? stimmen[v].findIndex((t) => t.id === id) : -1);
  const ks = klaenge(score);
  const beide = ks.filter((k) => k.toene[0] && k.toene[1]);
  const out: Befund[] = [];
  const add = (regel: string, art: BefundArt, text: string, ids: string[], t: number) => out.push({ regel, art, text, ids, takt: t + 1 });
  if (stimmen[0].length < 2 || stimmen[1].length < 2) return [];

  /** Wird der Ton in Stimme v schrittweise erreicht und verlassen? */
  const figur = (v: number, i: number) => {
    const t = stimmen[v][i];
    const vor = stimmen[v][i - 1];
    const nach = stimmen[v][i + 1];
    const rein = vor ? stufen(t.p, vor.p) : 99;
    const raus = nach ? stufen(nach.p, t.p) : 99;
    const nachNach = stimmen[v][i + 2];
    return {
      vor,
      nach,
      durchgang: Math.abs(rein) === 1 && Math.abs(raus) === 1 && Math.sign(rein) === Math.sign(raus),
      wechsel: Math.abs(rein) === 1 && Math.abs(raus) === 1 && Math.sign(rein) !== Math.sign(raus),
      cambiata: rein === -1 && raus === -2 && !!nachNach && stufen(nachNach.p, nach!.p) === 1,
      schrittRein: Math.abs(rein) === 1,
      schrittRaus: Math.abs(raus) === 1,
    };
  };

  /* Dissonanzen */
  for (const k of beide) {
    const [o, u] = [k.toene[0]!, k.toene[1]!];
    if (konsonant(o, u)) continue;
    const name = intervallName(intervall(o, u));
    const ids = idsVon(k.ids[0], k.ids[1]);
    const schwer = auf(k.zeit, schwerAbstand);
    const aufSchlag = auf(k.zeit, schlag);
    const neu = [0, 1].filter((v) => k.neu[v]);
    const gehalten = [0, 1].filter((v) => !k.neu[v]);

    // Vorhalt: eine Stimme liegt aus dem Vorigen herüber, die andere schlägt neu an
    if (gehalten.length === 1) {
      const h = gehalten[0];
      const i = finde(h, k.ids[h]);
      const nach = stimmen[h][i + 1];
      const andere = 1 - h;
      const fa = figur(andere, finde(andere, k.ids[andere]));
      if (fa.durchgang || fa.wechsel) continue; // die neue Stimme läuft durch, die liegende ist der Bezugston
      if (aufSchlag) {
        if (nach && stufen(nach.p, stimmen[h][i].p) === -1) continue; // richtiger Vorhalt
        add(
          'fr-vorhalt',
          'fehler',
          nach && stufen(nach.p, stimmen[h][i].p) === 1
            ? `Vorhalt (${name}) löst sich aufwärts auf. Ein Vorhalt geht einen Schritt abwärts, nur der Leitton darf nach oben.`
            : `${gross(name)} durch einen liegenden Ton, der sich nicht im Schritt abwärts auflöst. Ein Vorhalt braucht eine Auflösung eine Stufe tiefer.`,
          idsVon(...ids, nach?.id),
          k.takt,
        );
        continue;
      }
    }

    const figuren = neu.map((v) => ({ v, f: figur(v, finde(v, k.ids[v])) }));
    const imSchritt = figuren.some(({ f }) => f.durchgang || f.wechsel || f.cambiata);
    if (schwer && imSchritt) {
      const f = figuren.find(({ f }) => f.durchgang || f.wechsel || f.cambiata)!;
      if (!f.f.durchgang) add('fr-dissonanz', 'hinweis', `${gross(name)} auf der schweren Zählzeit als Wechselnote. Erlaubt, klingt aber hart; besser als Durchgang oder Vorhalt.`, ids, k.takt);
      continue;
    }
    if (imSchritt) continue;
    if (aufSchlag) {
      add('fr-dissonanz', 'fehler', `${gross(name)} auf der Zählzeit, weder vorbereitet (Vorhalt) noch im Schritt erreicht und verlassen (Durchgang, Wechselnote).`, idsVon(...ids, ...figuren.flatMap(({ f }) => [f.vor?.id, f.nach?.id])), k.takt);
      continue;
    }
    // Zwischen den Zählzeiten genügt ein Schritt auf einer Seite (Figuration, Vorausnahme)
    if (figuren.some(({ f }) => f.schrittRein || f.schrittRaus)) continue;
    add('fr-figuration', 'hinweis', `${gross(name)} zwischen den Zählzeiten wird angesprungen und mit einem Sprung verlassen. Bach führt auch kurze Dissonanzen meist auf einer Seite im Schritt.`, ids, k.takt);
  }

  /* Parallelen zwischen aufeinanderfolgenden Klängen */
  for (let i = 1; i < beide.length; i++) {
    const [a, b] = [beide[i - 1], beide[i]];
    const [ao, au, bo, bu] = [a.toene[0]!, a.toene[1]!, b.toene[0]!, b.toene[1]!];
    if (gleich(ao, bo) || gleich(au, bu)) continue;
    if (!vollkommen(ao, au) || !vollkommen(bo, bu)) continue;
    const ia = intervall(ao, au).nummer;
    const ib = intervall(bo, bu).nummer;
    if (ia !== ib) continue;
    const art = ib === 5 ? 'Quint' : ib === 8 ? 'Oktav' : 'Einklang';
    const wichtig = auf(a.zeit, schlag) || auf(b.zeit, schlag);
    add('fr-parallelen', wichtig ? 'fehler' : 'hinweis', `${art}parallele: Beide Stimmen bewegen sich im gleichen vollkommenen Intervall weiter.`, idsVon(a.ids[0], a.ids[1], b.ids[0], b.ids[1]), b.takt);
  }
  // Akzentparallelen auf zwei aufeinanderfolgenden schweren Zeiten mit höchstens einem Klang dazwischen
  const schwere = beide.filter((k) => auf(k.zeit, schwerAbstand));
  for (let i = 1; i < schwere.length; i++) {
    const [a, b] = [schwere[i - 1], schwere[i]];
    if (Math.abs(b.zeit - a.zeit - schwerAbstand) > 1e-6) continue;
    const zwischen = beide.filter((k) => k.zeit > a.zeit && k.zeit < b.zeit).length;
    const [ao, au, bo, bu] = [a.toene[0]!, a.toene[1]!, b.toene[0]!, b.toene[1]!];
    if (zwischen <= 1 && vollkommen(ao, au) && vollkommen(bo, bu) && !gleich(ao, bo) && intervall(ao, au).nummer === intervall(bo, bu).nummer && intervall(bo, bu).nummer === 5) {
      add('fr-parallelen', 'hinweis', 'Akzentparallele: Quinten auf zwei schweren Zeiten nacheinander, mit kaum etwas dazwischen.', idsVon(a.ids[0], a.ids[1], b.ids[0], b.ids[1]), b.takt);
    }
  }

  /* Kreuzung */
  beide.forEach((k) => {
    if (halb(k.toene[0]!, k.toene[1]!) < 0) add('fr-kreuzung', 'hinweis', 'Die Stimmen kreuzen sich. Bei Bach kommt das selten und nur kurz vor; die Stimmen bleiben so besser hörbar.', idsVon(k.ids[0], k.ids[1]), k.takt);
  });

  /* Melodik */
  stimmen.forEach((ts) => {
    for (let i = 1; i < ts.length; i++) {
      const [a, b] = [ts[i - 1], ts[i]];
      const iv = intervall(a.p, b.p);
      if (Math.abs(halb(b.p, a.p)) > 12) add('fr-melodik', 'hinweis', 'Sprung größer als eine Oktave: schwer zu singen und zu hören.', idsVon(a.id, b.id), b.takt);
      else if (iv.qualitaet.includes('übermäßig')) add('fr-melodik', 'hinweis', `${gross(intervallName(iv))} als Sprung: klingt fremd, besser vermeiden.`, idsVon(a.id, b.id), b.takt);
    }
  });

  /* Schluss: Oktave oder Einklang auf dem Grundton */
  const letzter = beide[beide.length - 1];
  const enden = stimmen.map((ts) => ts[ts.length - 1]);
  const zusammen = !!letzter && enden.every((t) => letzter.ids.includes(t.id));
  if (zusammen) {
    const [o, u] = [letzter.toene[0]!, letzter.toene[1]!];
    const g = tonika(score.key.fifths, score.key.mode);
    const iv = intervall(o, u);
    const aufGrundton = u.step === g.step && (u.alter ?? 0) === g.alter;
    if (!aufGrundton) add('fr-schluss', 'hinweis', 'Der Schluss steht nicht auf dem Grundton der Tonart. Eine Invention endet in der Haupttonart.', idsVon(...letzter.ids), letzter.takt);
    else if (!(iv.qualitaet === 'rein' && (iv.nummer === 1 || iv.nummer === 8))) add('fr-schluss', 'hinweis', `Der Schlussklang (${intervallName(iv)}) ist weder Oktave noch Einklang. Zweistimmig klingt der Schluss in Oktave oder Einklang am ruhigsten.`, idsVon(...letzter.ids), letzter.takt);
  }

  const gesehen = new Set<string>();
  return out
    .filter((b) => opts.hinweise !== false || b.art === 'fehler')
    .filter((b) => {
      const key = `${b.regel}|${b.text}|${b.ids.join(',')}`;
      if (gesehen.has(key)) return false;
      gesehen.add(key);
      return true;
    })
    .sort((a, b) => a.takt - b.takt || (a.art === b.art ? 0 : a.art === 'fehler' ? -1 : 1))
    .reduce<Befund[]>(zusammenfassen, []);
}
