import { diatonicIndex, keyAlter, toMidi } from '../model/pitch';
import type { Pitch, Score } from '../model/types';
import { findeMotive, stimmToene, type MotivTon } from '../kontrapunkt/motive';
import type { Akkord } from './akkorde';
import { analysiere } from './analyse';
import { klaenge } from './klaenge';
import { klavierHarmonien } from './klavier';
import type { Stil } from './stil';

export type MerkmalId =
  | 'neapolitaner'
  | 'uebermaessig'
  | 'zwischendominante'
  | 'mediante'
  | 'verminderter-septakkord'
  | 'nonakkord'
  | 'chromatik'
  | 'sequenz'
  | 'orgelpunkt'
  | 'parallelverschiebung'
  | 'ganzton'
  | 'pentatonik'
  | 'quarten'
  | 'cluster'
  | 'zwoelfton';

export interface Merkmal {
  id: MerkmalId;
  name: string;
  /** Ein Satz, was gefunden wurde */
  text: string;
  /** Takte ab 1 */
  takte: number[];
  /** Noten zum Hervorheben */
  ids: string[];
  /** Lexikon-Eintrag */
  begriff: string;
  /** Epochen, für die das Merkmal typisch ist */
  epochen: Stil[];
}

interface Def {
  name: string;
  begriff: string;
  epochen: Stil[];
}

export const MERKMALE: Record<MerkmalId, Def> = {
  neapolitaner: { name: 'Neapolitaner', begriff: 'neapolitaner', epochen: ['barock', 'klassik', 'romantik'] },
  uebermaessig: { name: 'Übermäßiger Sextakkord', begriff: 'uebermaessiger-sextakkord', epochen: ['klassik', 'romantik'] },
  zwischendominante: { name: 'Zwischendominanten', begriff: 'zwischendominante', epochen: ['barock', 'klassik', 'romantik'] },
  mediante: { name: 'Medianten aus Moll', begriff: 'terzverwandtschaft', epochen: ['romantik'] },
  'verminderter-septakkord': { name: 'Verminderter Septakkord', begriff: 'verminderter-septakkord', epochen: ['barock', 'klassik', 'romantik'] },
  nonakkord: { name: 'Nonakkorde', begriff: 'nonakkord', epochen: ['romantik', 'impressionismus'] },
  chromatik: { name: 'Chromatik', begriff: 'chromatik', epochen: ['romantik'] },
  sequenz: { name: 'Sequenzen', begriff: 'sequenz', epochen: ['barock'] },
  orgelpunkt: { name: 'Orgelpunkt', begriff: 'orgelpunkt', epochen: ['barock', 'romantik', 'impressionismus'] },
  parallelverschiebung: { name: 'Parallelverschiebung', begriff: 'parallelverschiebung', epochen: ['impressionismus'] },
  ganzton: { name: 'Ganztonleiter', begriff: 'ganztonleiter', epochen: ['impressionismus'] },
  pentatonik: { name: 'Pentatonik', begriff: 'pentatonik', epochen: ['impressionismus'] },
  quarten: { name: 'Quartenklänge', begriff: 'quartenharmonik', epochen: ['impressionismus', 'moderne'] },
  cluster: { name: 'Cluster', begriff: 'cluster', epochen: ['moderne'] },
  zwoelfton: { name: 'Zwölftonreihe', begriff: 'zwoelftonmusik', epochen: ['moderne'] },
};

const pc = (p: Pitch) => ((toMidi(p) % 12) + 12) % 12;
const PENTA = [0, 2, 4, 7, 9];

interface Stelle {
  takt: number;
  ids: string[];
}

/** Akkorde mit Takt: im Klaviersatz die Harmonien je Schwerpunkt, sonst die vollen Zusammenklänge */
function akkordStellen(score: Score): { takt: number; akkord: Akkord }[] {
  const klavier = score.voices.length === 2 && score.voices[1].name === 'Begleitung';
  if (klavier) return klavierHarmonien(score).flatMap((h) => (h.akkord && h.kurz !== '?' ? [{ takt: h.takt + 1, akkord: h.akkord }] : []));
  if (score.voices.length < 3) return [];
  return analysiere(score).map((s) => ({ takt: s.takt + 1, akkord: s.akkord }));
}

function toeneJeStimme(score: Score): MotivTon[][] {
  return score.voices.map((_, v) => stimmToene(score, v).filter((t): t is MotivTon => !!t));
}

/** Längste Folge von Tönen, deren Tonklassen in eine Ganztonleiter passen */
function ganztonLaeufe(toene: MotivTon[]): Stelle[] {
  const out: Stelle[] = [];
  let lauf: MotivTon[] = [];
  const fertig = () => {
    const pcs = new Set(lauf.map((t) => pc(t.p)));
    // Mindestens vier verschiedene Töne und ein Tritonus oder eine große Terz im Ganztonraum
    if (lauf.length >= 6 && pcs.size >= 4) out.push({ takt: lauf[0].takt + 1, ids: lauf.map((t) => t.id) });
    lauf = [];
  };
  for (const t of toene) {
    if (lauf.length && pc(t.p) % 2 !== pc(lauf[0].p) % 2) fertig();
    lauf.push(t);
  }
  fertig();
  return out;
}

function istPentatonisch(pcs: Set<number>): boolean {
  if (pcs.size < 4 || pcs.size > 5) return false;
  for (let r = 0; r < 12; r++) if ([...pcs].every((x) => PENTA.includes((x - r + 12) % 12))) return true;
  return false;
}

/** Findet stilprägende Merkmale eines Stücks */
export function stilmerkmale(score: Score): Merkmal[] {
  const gefunden = new Map<MerkmalId, Stelle[]>();
  const add = (id: MerkmalId, s: Stelle) => gefunden.set(id, [...(gefunden.get(id) ?? []), s]);
  const stimmen = toeneJeStimme(score);
  const alleToene = stimmen.flat();
  if (alleToene.length === 0) return [];

  // Alterierte Akkorde, verminderte Septakkorde, Nonakkorde
  for (const { takt, akkord } of akkordStellen(score)) {
    const s = { takt, ids: [] };
    if (akkord.alteriert) add(akkord.alteriert, s);
    if (akkord.sept === 'verminderter Septakkord') add('verminderter-septakkord', s);
    if (akkord.none) add('nonakkord', s);
  }

  // Chromatik: Halbtonschritte mit leiterfremden Tönen in einer Stimme
  for (const st of stimmen) {
    for (let i = 1; i < st.length; i++) {
      const [a, b] = [st[i - 1].p, st[i].p];
      const halb = Math.abs(toMidi(b) - toMidi(a)) === 1;
      const fremd = (p: Pitch) => (p.alter ?? 0) !== keyAlter(p.step, score.key.fifths);
      if (halb && (fremd(a) || fremd(b)) && (a.step === b.step || fremd(a) !== fremd(b))) add('chromatik', { takt: st[i].takt + 1, ids: [st[i - 1].id, st[i].id] });
    }
  }
  if ((gefunden.get('chromatik')?.length ?? 0) < 3) gefunden.delete('chromatik');

  // Ganzton und Pentatonik in einzelnen Stimmen, Zwölftonreihe
  for (const st of stimmen) {
    for (const s of ganztonLaeufe(st)) add('ganzton', s);
    if (st.length >= 8 && istPentatonisch(new Set(st.map((t) => pc(t.p))))) add('pentatonik', { takt: st[0].takt + 1, ids: st.map((t) => t.id) });
    if (st.length >= 12 && new Set(st.slice(0, 12).map((t) => pc(t.p))).size === 12) add('zwoelfton', { takt: st[0].takt + 1, ids: st.slice(0, 12).map((t) => t.id) });
  }

  // Zusammenklänge: Quarten, Cluster, Parallelverschiebung
  const k = klaenge(score).map((x) => ({ ...x, voll: x.toene.filter((t): t is Pitch => !!t).sort((a, b) => toMidi(a) - toMidi(b)) }));
  for (const x of k) {
    const midis = [...new Set(x.voll.map(toMidi))].sort((a, b) => a - b);
    const ids = x.ids.filter((i): i is string => !!i);
    if (midis.length >= 3) {
      const abst = midis.slice(1).map((m, i) => m - midis[i]);
      if (abst.every((d) => d === 5)) add('quarten', { takt: x.takt + 1, ids });
      const sekunden = abst.filter((d) => d <= 2).length;
      if (sekunden >= 2 && abst.slice(1).some((d, i) => d <= 2 && abst[i] <= 2)) add('cluster', { takt: x.takt + 1, ids });
    }
  }
  // Mindestens drei gleich gebaute Klänge, die sich gemeinsam bewegen (Mixtur, Planing)
  let lauf = 0;
  for (let i = 1; i < k.length; i++) {
    const [a, b] = [k[i - 1], k[i]];
    const gleichGebaut =
      a.voll.length >= 3 &&
      a.voll.length === b.voll.length &&
      a.toene.every((t, v) => !!t === !!b.toene[v]) &&
      // gleiche Lage der Stimmen in Stufen: reale und diatonische Mixturen
      a.voll.every((t, j) => diatonicIndex(t) - diatonicIndex(a.voll[0]) === diatonicIndex(b.voll[j]) - diatonicIndex(b.voll[0])) &&
      toMidi(a.voll[0]) !== toMidi(b.voll[0]);
    lauf = gleichGebaut ? lauf + 1 : 0;
    if (lauf === 2) add('parallelverschiebung', { takt: k[i - 2].takt + 1, ids: [...k[i - 2].ids, ...a.ids, ...b.ids].filter((x): x is string => !!x) });
  }

  // Orgelpunkt: Der Bass hält oder wiederholt denselben Ton über mindestens zwei Takte
  const bass = stimmen[stimmen.length - 1];
  if (bass && stimmen.length > 1) {
    const taktLaenge = (score.time.beats * 4) / score.time.beatType;
    let i = 0;
    while (i < bass.length) {
      let j = i;
      while (j + 1 < bass.length && pc(bass[j + 1].p) === pc(bass[i].p) && Math.abs(bass[j + 1].start - (bass[j].start + bass[j].dauer)) < 1e-6) j++;
      const dauer = bass[j].start + bass[j].dauer - bass[i].start;
      if (dauer >= 2 * taktLaenge - 1e-6) add('orgelpunkt', { takt: bass[i].takt + 1, ids: bass.slice(i, j + 1).map((t) => t.id) });
      i = j + 1;
    }
  }

  // Sequenzen der Oberstimme
  if (stimmen[0]?.length >= 6) {
    for (const f of findeMotive(score)) if (f.bezug === 'Sequenz') add('sequenz', { takt: f.takt, ids: f.ids });
  }

  const reihenfolge = Object.keys(MERKMALE) as MerkmalId[];
  return reihenfolge.flatMap((id) => {
    const stellen = gefunden.get(id);
    if (!stellen?.length) return [];
    const d = MERKMALE[id];
    const takte = [...new Set(stellen.map((s) => s.takt))].sort((a, b) => a - b);
    const wo = takte.length === 1 ? `Takt ${takte[0]}` : `Takt ${takte.slice(0, 5).join(', ')}${takte.length > 5 ? ' …' : ''}`;
    return [{ id, name: d.name, text: `${d.name}: ${wo}`, takte, ids: [...new Set(stellen.flatMap((s) => s.ids))], begriff: d.begriff, epochen: d.epochen }];
  });
}

/** Welche Epoche passt am besten zu den gefundenen Merkmalen? */
export function stilTendenz(merkmale: Merkmal[]): { stil: Stil; punkte: number }[] {
  const punkte = new Map<Stil, number>();
  for (const m of merkmale) for (const e of m.epochen) punkte.set(e, (punkte.get(e) ?? 0) + 1 / m.epochen.length);
  return [...punkte.entries()].map(([stil, p]) => ({ stil, punkte: p })).sort((a, b) => b.punkte - a.punkte);
}

export const hatMerkmal = (score: Score, id: string) => stilmerkmale(score).some((m) => m.id === id);
