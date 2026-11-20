import { measureLength } from '../model/duration';
import { diatonicIndex, fromDiatonic, germanName, germanNameWithOctave, toMidi } from '../model/pitch';
import { grundton } from '../model/tonart';
import type { Pitch, Score } from '../model/types';
import type { KpRegel } from '../kontrapunkt/fux';
import { stimmToene, type MotivTon } from '../kontrapunkt/motive';
import { erkenneAkkord, leitton, type Akkord } from './akkorde';
import { funktionMitBass } from './analyse';
import { zusammenfassen, type Befund, type BefundArt } from './regeln';

/**
 * Klaviersatz: Melodie (Stimme 0) mit Begleitung (Stimme 1, z. B. Bass, Alberti-Bass, gebrochene Akkorde).
 * Anders als im Chorsatz klingt der Akkord nicht in jedem Moment vollständig: Er entsteht aus allen Tönen eines Abschnitts.
 * Deshalb wird die Harmonie je Schwerpunkt-Abschnitt bestimmt (ganzer Takt, im 4/4- und 6/8-Takt der halbe).
 */
export const KLAVIER_REGELN: KpRegel[] = [
  { id: 'kl-parallelen', titel: 'Parallelen zwischen Melodie und Bass', begriff: 'quintparallele' },
  { id: 'kl-fremdton', titel: 'Fremde Töne in der Melodie', begriff: 'vorhalt' },
  { id: 'kl-harmonie', titel: 'Harmonie unklar', begriff: 'dreiklang' },
  { id: 'kl-quartsext', titel: 'Quartsextakkord', begriff: 'quartsextakkord' },
  { id: 'kl-schluss', titel: 'Schluss', begriff: 'kadenz' },
  { id: 'kl-kreuzung', titel: 'Begleitung über der Melodie', begriff: 'stimmkreuzung' },
];

export const klavierRegel = (id: string) => KLAVIER_REGELN.find((r) => r.id === id);

export interface Harmonie {
  /** Takt ab 0 */
  takt: number;
  start: number;
  ende: number;
  akkord: Akkord | null;
  /** Anteil der Klangdauer, die zum Akkord gehört (0–1) */
  deckung: number;
  /** Akkordtöne als Tonklassen (für die Prüfung der Melodie) */
  toene: Pitch[];
  /** z. B. „T“, „D₃“, „?“ */
  kurz: string;
  /** Die Terz fehlt im Notentext und wurde leitereigen ergänzt (z. B. bei Melodie und Bass allein) */
  ergaenzt?: boolean;
}

interface Ton extends MotivTon {
  stimme: number;
  ende: number;
}

const pc = (p: Pitch) => ((toMidi(p) % 12) + 12) % 12;
const abstand = (p: Pitch, root: Pitch) => (((diatonicIndex(p) - diatonicIndex(root)) % 7) + 7) % 7;
const stufen = (a: Pitch, b: Pitch) => diatonicIndex(a) - diatonicIndex(b);
const halb = (a: Pitch, b: Pitch) => toMidi(a) - toMidi(b);

/** Länge eines Schwerpunkt-Abschnitts und eines Schlags in Viertelnoten */
export function raster(time: Score['time']) {
  const takt = measureLength(time);
  const zusammengesetzt = time.beatType === 8 && time.beats % 3 === 0 && time.beats > 3;
  const schlag = zusammengesetzt ? 1.5 : 4 / time.beatType;
  const geteilt = time.beats === 4 || time.beats === 12 || (zusammengesetzt && time.beats === 6);
  return { takt, schlag, abschnitt: geteilt ? takt / 2 : takt };
}

function toeneVon(score: Score, v: number): Ton[] {
  return stimmToene(score, v)
    .filter((t): t is MotivTon => !!t)
    .map((t) => ({ ...t, stimme: v, ende: t.start + t.dauer }));
}

/** Bester Akkord für die Töne in [a, b): Gewicht nach Dauer, Taktschwerpunkt und Bass */
function besterAkkord(alle: Ton[], a: number, b: number, score: Score) {
  const drin = alle.filter((t) => t.start < b - 1e-9 && t.ende > a + 1e-9);
  if (drin.length === 0) return null;
  // Die Begleitung trägt die Harmonie, die Melodie darf Durchgänge und Vorhalte haben
  const gewicht = (t: Ton) => (Math.min(t.ende, b) - Math.max(t.start, a)) * (t.stimme === 1 ? 1.5 : 1) * (Math.abs(t.start - a) < 1e-9 ? (t.stimme === 1 ? 1.5 : 1.2) : 1);
  const summe = drin.reduce((s, t) => s + gewicht(t), 0);
  const bassTon = drin.filter((t) => t.stimme === 1).sort((x, y) => (Math.abs(x.start - a) < 1e-9 ? -1 : 0) - (Math.abs(y.start - a) < 1e-9 ? -1 : 0) || toMidi(x.p) - toMidi(y.p))[0];

  const tonika = diatonicIndex({ step: grundton(score.key).step, octave: 0 });
  const stufeVon = (p: Pitch) => ((((diatonicIndex(p) - tonika) % 7) + 7) % 7) + 1;
  let best: { root: Pitch; punkte: number; deckung: number; mitSept: boolean } | null = null;
  const wurzeln = [...new Map(drin.map((t) => [diatonicIndex(t.p) % 7, t.p])).values()];
  for (const root of wurzeln) {
    const w = [0, 0, 0, 0, 0, 0, 0];
    // Ein Ton gehört nur dann zum Akkord, wenn er auch chromatisch passt (gleiche Stufe, gleiche Tonklasse wie die übrigen)
    for (const t of drin) w[abstand(t.p, root)] += gewicht(t);
    const mitSept = w[6] >= 0.1 * summe && w[0] > 0 && drin.some((t) => t.stimme === 1 && abstand(t.p, root) === 6);
    const dreiklang = w[0] + w[2] + w[4];
    const deckung = (dreiklang + (mitSept ? w[6] : 0)) / summe;
    const stufe = stufeVon(root);
    // Ohne Terz ist der Akkord nur schwach belegt; Septakkorde sind außer auf der V. Stufe seltener; Hauptstufen sind wahrscheinlicher
    let punkte = deckung - (w[0] ? 0 : 0.2) - (w[2] ? 0 : 0.05) - (mitSept ? (stufe === 5 ? 0.03 : 0.2) : 0) + ([1, 4, 5].includes(stufe) ? 0.03 : 0);
    if (bassTon) {
      const r = abstand(bassTon.p, root);
      punkte += r === 0 ? 0.12 : r === 2 ? 0.05 : r === 4 ? 0.01 : 0;
    }
    if (!best || punkte > best.punkte + 1e-9) best = { root, punkte, deckung, mitSept };
  }
  if (!best) return null;
  const { root, deckung, mitSept } = best;
  const rollen = mitSept ? [0, 2, 4, 6] : [0, 2, 4];
  // Akkordtöne nach Gewicht: je Stufe die häufigste Schreibweise
  const jeRolle = new Map<number, Map<number, { p: Pitch; w: number }>>();
  for (const t of drin) {
    const r = abstand(t.p, root);
    if (!rollen.includes(r)) continue;
    const m = jeRolle.get(r) ?? new Map();
    const e = m.get(pc(t.p)) ?? { p: t.p, w: 0 };
    e.w += gewicht(t);
    m.set(pc(t.p), e);
    jeRolle.set(r, m);
  }
  const toene = [...jeRolle.values()].map((m) => [...m.values()].sort((x, y) => y.w - x.w)[0].p);
  // Fehlt die Terz, wird die leitereigene ergänzt (in Moll auf der V. Stufe der Leitton)
  const ergaenzt = !jeRolle.has(2);
  if (ergaenzt) {
    let terz = fromDiatonic(diatonicIndex(root) + 2, score.key.fifths);
    const l = leitton(score.key);
    if (score.key.mode === 'minor' && stufeVon(root) === 5 && terz.step === l.step) terz = { ...terz, alter: (terz.alter ?? 0) + (((l.pc - pc(terz)) % 12) + 12) % 12 };
    toene.push(terz);
  }
  const bass = bassTon && rollen.includes(abstand(bassTon.p, root)) ? bassTon.p : null;
  const fuerErkennung = bass ? [{ ...bass, octave: bass.octave - 2 }, ...toene] : toene;
  const akkord = fuerErkennung.length >= 2 ? erkenneAkkord(fuerErkennung, score.key) : null;
  return { akkord, deckung, toene, ergaenzt };
}

/**
 * Die Harmonien eines Klaviersatzes, je Schwerpunkt-Abschnitt.
 * Passt ein Akkord schlecht, wird der Abschnitt in Schläge geteilt (z. B. S und D in einem 3/4-Takt).
 */
export function klavierHarmonien(score: Score): Harmonie[] {
  if (score.voices.length < 2) return [];
  const alle = [...toeneVon(score, 0), ...toeneVon(score, 1)];
  if (alle.length === 0) return [];
  const { takt, schlag, abschnitt } = raster(score.time);
  const ende = Math.max(...alle.map((t) => t.ende));
  const out: Harmonie[] = [];
  const harmonie = (a: number, b: number): Harmonie | null => {
    const r = besterAkkord(alle, a, b, score);
    if (!r) return null;
    const unklar = !r.akkord || r.deckung < 0.6;
    return {
      takt: Math.floor(a / takt + 1e-9),
      start: a,
      ende: b,
      akkord: r.akkord,
      deckung: r.deckung,
      toene: r.toene,
      kurz: unklar || !r.akkord ? '?' : funktionMitBass(r.akkord),
      ...(r.ergaenzt ? { ergaenzt: true } : {}),
    };
  };
  for (let a = 0; a < ende - 1e-9; a += abschnitt) {
    const b = Math.min(a + abschnitt, ende);
    const ganz = harmonie(a, b);
    if (!ganz) continue;
    const schlaege = Math.round((b - a) / schlag);
    if (ganz.deckung < 0.8 && schlaege > 1) {
      const teile: Harmonie[] = [];
      for (let i = 0; i < schlaege; i++) {
        const h = harmonie(a + i * schlag, a + (i + 1) * schlag);
        if (!h) continue;
        const vorige = teile[teile.length - 1];
        if (vorige && vorige.akkord?.name === h.akkord?.name && vorige.kurz === h.kurz) vorige.ende = h.ende;
        else teile.push(h);
      }
      const mittel = teile.reduce((s, h) => s + h.deckung * (h.ende - h.start), 0) / (b - a);
      // Teilen nur, wenn jeder Teil klar einen vollständigen Akkord ergibt
      const klar = teile.every((h) => h.deckung >= 0.9 && (!h.ergaenzt || ganz.ergaenzt));
      if (teile.length > 1 && klar && mittel > ganz.deckung + 0.15) {
        out.push(...teile);
        continue;
      }
    }
    out.push(ganz);
  }
  // Gleiche Harmonie innerhalb eines Taktes zusammenfassen
  return out.reduce<Harmonie[]>((acc, h) => {
    const v = acc[acc.length - 1];
    if (v && v.takt === h.takt && v.kurz === h.kurz && v.akkord?.name === h.akkord?.name) v.ende = h.ende;
    else acc.push(h);
    return acc;
  }, []);
}

/** Gehört der Ton zum Akkord der Harmonie? */
function akkordton(p: Pitch, h: Harmonie): boolean {
  if (!h.akkord) return true;
  return h.toene.some((t) => pc(t) === pc(p)) || (h.toene.every((t) => abstand(t, h.akkord!.grundton) !== abstand(p, h.akkord!.grundton)) && [0, 2, 4].includes(abstand(p, h.akkord.grundton)));
}

const istQuinte = (o: Pitch, u: Pitch) => halb(o, u) > 0 && halb(o, u) % 12 === 7 && stufen(o, u) % 7 === 4;
const istOktave = (o: Pitch, u: Pitch) => halb(o, u) >= 0 && halb(o, u) % 12 === 0 && stufen(o, u) % 7 === 0;

export function pruefeKlaviersatz(score: Score, opts: { hinweise?: boolean } = {}): Befund[] {
  if (score.voices.length !== 2) return [];
  const mel = toeneVon(score, 0);
  const beg = toeneVon(score, 1);
  if (mel.length < 2 || beg.length < 1) return [];
  const { schlag, abschnitt } = raster(score.time);
  const harmonien = klavierHarmonien(score);
  const out: Befund[] = [];
  const add = (regel: string, art: BefundArt, text: string, ids: string[], takt: number) => out.push({ regel, art, text, ids: [...new Set(ids)], takt: takt + 1 });
  const klingt = (ts: Ton[], z: number) => ts.find((t) => t.start <= z + 1e-9 && t.ende > z + 1e-9);
  const harmonieBei = (z: number) => harmonien.find((h) => h.start <= z + 1e-9 && h.ende > z + 1e-9);
  const auf = (z: number, r: number) => Math.abs(z / r - Math.round(z / r)) < 1e-6;

  // Parallelen zwischen Melodie und Bass: an aufeinanderfolgenden Schwerpunkten (Akzentparallelen)
  // und bei Note gegen Note, wenn beide Stimmen gleichzeitig weitergehen
  const punkte: { m: Ton; b: Ton; z: number }[] = [];
  const dauer = Math.max(...[...mel, ...beg].map((t) => t.ende));
  for (let z = 0; z < dauer - 1e-9; z += abschnitt) {
    const m = klingt(mel, z);
    const b = klingt(beg, z);
    if (m && b) punkte.push({ m, b, z });
  }
  const gemeldet = new Set<string>();
  const parallele = (x: { m: Ton; b: Ton }, y: { m: Ton; b: Ton }, akzent: boolean) => {
    if (x.m.id === y.m.id || x.b.id === y.b.id) return;
    const art = istQuinte(x.m.p, x.b.p) && istQuinte(y.m.p, y.b.p) ? 'Quint' : istOktave(x.m.p, x.b.p) && istOktave(y.m.p, y.b.p) ? 'Oktav' : null;
    if (!art || toMidi(x.m.p) === toMidi(y.m.p)) return;
    const schluessel = [x.m.id, y.m.id, x.b.id, y.b.id].join();
    if (gemeldet.has(schluessel)) return;
    gemeldet.add(schluessel);
    add(
      'kl-parallelen',
      'fehler',
      `${art}parallele zwischen Melodie und Bass${akzent ? ' auf den Schwerpunkten' : ''}: ${germanName(x.m.p)}/${germanName(x.b.p)} → ${germanName(y.m.p)}/${germanName(y.b.p)}. Führe Melodie und Bass in Gegenbewegung.`,
      [x.m.id, y.m.id, x.b.id, y.b.id],
      y.m.takt,
    );
  };
  for (let i = 1; i < punkte.length; i++) parallele(punkte[i - 1], punkte[i], true);
  const zeiten = [...new Set([...mel, ...beg].map((t) => t.start))].sort((a, b) => a - b);
  let vorher: { m: Ton; b: Ton } | null = null;
  for (const z of zeiten) {
    const m = mel.find((t) => Math.abs(t.start - z) < 1e-9);
    const b = beg.find((t) => Math.abs(t.start - z) < 1e-9);
    const jetzt = m && b && m.dauer >= schlag - 1e-9 && b.dauer >= schlag - 1e-9 ? { m, b } : null;
    if (vorher && jetzt && klingt(mel, z) === m && klingt(beg, z) === b) parallele(vorher, jetzt, false);
    if (m || b) vorher = jetzt;
  }

  // Begleitung über der Melodie
  for (const m of mel) {
    const b = beg.find((t) => t.start < m.ende - 1e-9 && t.ende > m.start + 1e-9 && toMidi(t.p) > toMidi(m.p));
    if (b) add('kl-kreuzung', 'hinweis', 'Die Begleitung liegt über der Melodie. Halte sie tiefer, damit die Melodie oben klar hörbar bleibt.', [m.id, b.id], m.takt);
  }

  // Schluss: Tonika mit Grundton im Bass, möglichst nach der Dominante
  const letzte = harmonien[harmonien.length - 1];
  // Bass des Schlussakkords: der tiefste Begleitton im letzten Abschnitt
  const imLetzten = harmonien.length ? beg.filter((t) => t.ende > harmonien[harmonien.length - 1].start + 1e-9) : [];
  const letzterBass = imLetzten.length ? imLetzten.reduce((a, b) => (toMidi(b.p) < toMidi(a.p) ? b : a)) : beg[beg.length - 1];
  const letzteMel = mel[mel.length - 1];
  if (letzte?.akkord) {
    const tonika = letzte.akkord.stufe === 1 && (letzte.akkord.art === 'Dur' || letzte.akkord.art === 'Moll');
    const davor = harmonien[harmonien.length - 2]?.akkord;
    const eigeneDominante = !!davor && (((toMidi(davor.grundton) - toMidi(letzte.akkord.grundton)) % 12) + 12) % 12 === 7 && davor.art === 'Dur';
    const anderer = !tonika && eigeneDominante && (letzte.akkord.art === 'Dur' || letzte.akkord.art === 'Moll') && letzte.akkord.umkehrung === 0;
    if (anderer) {
      if (opts.hinweise !== false)
        add('kl-schluss', 'hinweis', `Der Satz schließt in ${letzte.akkord.name}, nicht in der Grundtonart. Für ein Trio ist das in Ordnung, weil danach das Menuett wiederholt wird; sonst gehört der Schluss auf die Tonika.`, [letzteMel.id, letzterBass.id], letzte.takt);
    } else if (!tonika) add('kl-schluss', 'fehler', `Der Satz endet auf ${letzte.akkord.name}, nicht auf der Tonika.`, [letzteMel.id, letzterBass.id], letzte.takt);
    else if (abstand(letzterBass.p, letzte.akkord.grundton) !== 0) add('kl-schluss', 'fehler', 'Im Schlussakkord gehört der Grundton in den Bass.', [letzterBass.id], letzte.takt);
    else {
      if (davor && davor.stufe !== 5 && davor.stufe !== 7 && opts.hinweise !== false)
        add('kl-schluss', 'hinweis', 'Vor dem Schlussakkord steht keine Dominante. Ein Ganzschluss (D–T) schließt deutlicher.', [letzteMel.id, letzterBass.id], letzte.takt);
    }
  }

  if (opts.hinweise !== false) {
    // Unklare Harmonie
    for (const h of harmonien) {
      if (h.kurz !== '?') continue;
      const ids = [...mel, ...beg].filter((t) => t.start < h.ende - 1e-9 && t.ende > h.start + 1e-9).map((t) => t.id);
      add('kl-harmonie', 'hinweis', 'Hier ergibt sich kein klarer Akkord. Lass die Begleitung die Akkordtöne deutlich spielen (Grundton im Bass, dazu Terz und Quinte).', ids, h.takt);
    }

    // Quartsextakkord nur als Kadenzquartsext (vor der Dominante mit gleichem Bass)
    harmonien.forEach((h, i) => {
      if (h.akkord?.umkehrung !== 2) return;
      const n = harmonien[i + 1]?.akkord;
      const bass = klingt(beg, h.start);
      if (n && n.stufe === 5 && n.umkehrung === 0) return;
      add('kl-quartsext', 'hinweis', `${h.akkord.name} steht mit der Quinte im Bass. Ein Quartsextakkord wirkt unruhig; benutze ihn als Kadenzquartsext vor der Dominante.`, bass ? [bass.id] : [], h.takt);
    });

    // Fremde Töne in der Melodie auf den Zählzeiten: auf dem Schwerpunkt als Vorhalt (schrittweise aufgelöst), sonst im Schritt erreicht oder verlassen
    mel.forEach((m, i) => {
      if (!auf(m.start, schlag)) return;
      const h = harmonieBei(m.start);
      if (!h?.akkord || h.kurz === '?' || akkordton(m.p, h)) return;
      const vor = mel[i - 1];
      const nach = mel[i + 1];
      const schrittNach = !!nach && Math.abs(stufen(nach.p, m.p)) === 1;
      const schrittVor = !!vor && Math.abs(stufen(m.p, vor.p)) === 1 && vor.ende >= m.start - 1e-9;
      const schwer = Math.abs(m.start - h.start) < 1e-9;
      if (schwer && !schrittNach)
        add('kl-fremdton', 'hinweis', `${germanNameWithOctave(m.p)} gehört nicht zu ${h.akkord.name} und steht auf dem Schwerpunkt. Löse ihn schrittweise in einen Akkordton auf (Vorhalt) oder wähle einen Akkordton.`, [m.id], m.takt);
      else if (!schwer && !schrittNach && !schrittVor)
        add('kl-fremdton', 'hinweis', `${germanNameWithOctave(m.p)} gehört nicht zu ${h.akkord.name} und wird weder im Schritt erreicht noch verlassen.`, [m.id], m.takt);
    });
  }

  return out.sort((a, b) => a.takt - b.takt || (a.art === b.art ? 0 : a.art === 'fehler' ? -1 : 1)).reduce<Befund[]>(zusammenfassen, []);
}
