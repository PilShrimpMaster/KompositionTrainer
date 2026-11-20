import { diatonicIndex, germanName, toMidi } from '../model/pitch';
import type { Pitch, Score } from '../model/types';
import { grundton } from '../model/tonart';
import { stimmToene, type MotivTon } from '../kontrapunkt/motive';
import type { Akkord } from './akkorde';
import { analysiere } from './analyse';
import { klavierHarmonien } from './klavier';

/**
 * Formenlehre: Phrasen, Kadenzen und kleine Formen (Periode, Satz, Liedform, Menuett mit Trio).
 * Grundlage ist die Melodie (oberste Stimme); hat der Satz Begleitung oder vier Stimmen, bestimmen die Akkorde die Kadenzen.
 */

export type KadenzArt = 'ganz' | 'halb' | 'offen';

export interface Kadenz {
  /** Takt ab 1, an dessen Ende die Phrase schließt */
  takt: number;
  art: KadenzArt;
  /** Ton oder Akkord, auf dem die Phrase endet */
  ziel: string;
  /** Kadenz in einer anderen Tonart (Ausweichung oder Modulation) */
  fremd?: string;
}

export type Aehnlichkeit = 'gleich' | 'versetzt' | 'aehnlich' | 'verschieden';

export interface FormTeil {
  /** Buchstabe wie a, a′, b */
  name: string;
  von: number;
  bis: number;
}

export interface FormAnalyse {
  takte: number;
  /** Kadenzen an jedem vierten Takt (und am Ende) */
  kadenzen: Kadenz[];
  /** Zweitaktgruppen mit Buchstaben */
  glieder: FormTeil[];
  /** Erkannte Form, z. B. „Periode“ */
  form: string | null;
  /** Erklärung in ganzen Sätzen */
  text: string[];
}

interface TaktInhalt {
  toene: MotivTon[];
  /** Rhythmus als Einsatzzeiten im Takt mit Dauer, Pausen eingeschlossen */
  rhythmus: string;
}

const STUFEN_NAME = ['Grundton', '2. Stufe', '3. Stufe', '4. Stufe', '5. Stufe', '6. Stufe', '7. Stufe'];

export function melodieTakte(score: Score): TaktInhalt[] {
  const voice = score.voices[0];
  if (!voice) return [];
  const toene = stimmToene(score, 0).filter((t): t is MotivTon => !!t);
  return voice.measures.map((m, mi) => {
    const imTakt = toene.filter((t) => t.takt === mi);
    const r = m.notes.map((n) => `${n.pitch ? '' : 'r'}${n.duration.type}${'.'.repeat(n.duration.dots ?? 0)}${n.tie ? '~' : ''}`);
    return { toene: imTakt, rhythmus: r.join(' ') };
  });
}

const stufeImTon = (p: Pitch, tonika: { step: Pitch['step'] }) => ((((diatonicIndex(p) - diatonicIndex({ step: tonika.step, octave: 0 })) % 7) + 7) % 7) + 1;

/** Wie ähnlich sind zwei gleich lange Taktgruppen? Der letzte Takt darf abweichen (andere Kadenz). */
export function vergleiche(takte: TaktInhalt[], a: number, b: number, laenge: number): Aehnlichkeit {
  const teil = (s: number, n: number) => takte.slice(s, s + n);
  const A = teil(a, laenge);
  const B = teil(b, laenge);
  if (A.length < laenge || B.length < laenge) return 'verschieden';
  const tA = A.flatMap((t) => t.toene);
  const tB = B.flatMap((t) => t.toene);
  if (tA.length < 2 || tB.length < 2) return 'verschieden';
  const gleicheHoehen = tA.length === tB.length && tA.every((t, i) => toMidi(t.p) === toMidi(tB[i].p)) && A.every((t, i) => t.rhythmus === B[i].rhythmus);
  if (gleicheHoehen) return 'gleich';
  const schritte = (ts: MotivTon[]) => ts.slice(1).map((t, i) => diatonicIndex(t.p) - diatonicIndex(ts[i].p));
  const rhythmusGleich = A.every((t, i) => t.rhythmus === B[i].rhythmus);
  if (rhythmusGleich && tA.length === tB.length && schritte(tA).every((s, i) => s === schritte(tB)[i])) return 'versetzt';
  // Ähnlich: erster Takt (bzw. alle bis auf den letzten) im Rhythmus gleich und die meisten Schritte gleich
  const vorn = Math.max(1, laenge - 1);
  const rVorn = A.slice(0, vorn).every((t, i) => t.rhythmus === B[i].rhythmus);
  const vA = schritte(A.slice(0, vorn).flatMap((t) => t.toene));
  const vB = schritte(B.slice(0, vorn).flatMap((t) => t.toene));
  const n = Math.min(vA.length, vB.length);
  const treffer = vA.slice(0, n).filter((s, i) => s === vB[i] || Math.sign(s) === Math.sign(vB[i])).length;
  if (rVorn && n > 0 && treffer / Math.max(vA.length, vB.length) >= 0.7) return 'aehnlich';
  return 'verschieden';
}

type Harm = { takt: number; akkord: Akkord };

function harmonienVon(score: Score): Harm[] | null {
  if (score.voices.length === 4) return analysiere(score).map((s) => ({ takt: s.takt, akkord: s.akkord }));
  if (score.voices.length === 2 && score.voices[1].measures.some((m) => m.notes.some((n) => n.pitch)))
    return klavierHarmonien(score)
      .filter((h) => h.akkord && h.kurz !== '?')
      .map((h) => ({ takt: h.takt, akkord: h.akkord! }));
  return null;
}

const PC: Record<Pitch['step'], number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pc = (p: { step: Pitch['step']; alter?: number }) => (((PC[p.step] + (p.alter ?? 0)) % 12) + 12) % 12;

/** Kadenz am Ende von Takt t (ab 1) */
export function kadenzAm(score: Score, t: number, harm = harmonienVon(score), takte = melodieTakte(score)): Kadenz | null {
  const g = grundton(score.key);
  const ende = takte[t - 1]?.toene;
  const letzterTon = ende?.[ende.length - 1] ?? [...takte.slice(0, t)].reverse().find((x) => x.toene.length)?.toene.slice(-1)[0];
  if (!letzterTon) return null;
  if (harm && harm.length) {
    const bis = harm.filter((h) => h.takt <= t - 1);
    const letzter = bis[bis.length - 1];
    if (letzter && letzter.takt >= t - 2) {
      const a = letzter.akkord;
      const vorher = bis[bis.length - 2]?.akkord;
      const hauptklang = a.art === 'Dur' || a.art === 'Moll';
      // Ganzschluss: Dur/Moll in Grundstellung, davor sein Dominantakkord (Grundton eine Quinte höher)
      const dominanteDavor = !!vorher && (pc(vorher.grundton) - pc(a.grundton) + 12) % 12 === 7 && (vorher.art === 'Dur' || vorher.sept === 'Dominantseptakkord');
      if (a.stufe === 1 && hauptklang && a.umkehrung === 0) return { takt: t, art: dominanteDavor ? 'ganz' : 'offen', ziel: a.name };
      // Nach der eigenen Dominante wirkt ein anderer Akkord als neue Tonika (Ausweichung oder Modulation)
      if (hauptklang && a.umkehrung === 0 && dominanteDavor && !a.sept) return { takt: t, art: 'ganz', ziel: a.name, fremd: a.name };
      if (a.stufe === 5 && a.art === 'Dur' && !a.sept) return { takt: t, art: 'halb', ziel: a.name };
      return { takt: t, art: 'offen', ziel: a.name };
    }
  }
  // Nur Melodie: der Schlusston der Phrase entscheidet
  const s = stufeImTon(letzterTon.p, g);
  const tonikaPc = pc(g);
  const schlussTonika = s === 1 && pc(letzterTon.p) === tonikaPc;
  const art: KadenzArt = schlussTonika ? 'ganz' : s === 2 || s === 5 || s === 7 ? 'halb' : 'offen';
  return { takt: t, art, ziel: `${germanName(letzterTon.p)} (${STUFEN_NAME[s - 1]})` };
}

const ART_TEXT: Record<KadenzArt, string> = { ganz: 'Ganzschluss', halb: 'Halbschluss', offen: 'offenes Ende' };
export const kadenzText = (k: Kadenz) => `Takt ${k.takt}: ${k.fremd ? `Ganzschluss in ${k.fremd}` : ART_TEXT[k.art]} (auf ${k.ziel})`;

/** Analysiert die Form eines Stücks oder Themas */
export function analysiereForm(score: Score): FormAnalyse {
  const takte = melodieTakte(score);
  // Leere Takte am Ende zählen nicht
  while (takte.length && takte[takte.length - 1].toene.length === 0) takte.pop();
  const n = takte.length;
  const harm = harmonienVon(score);
  const kad = (t: number) => kadenzAm(score, t, harm, takte);
  const kadenzen: Kadenz[] = [];
  for (let t = 4; t <= n; t += 4) kadenzen.push(kad(t)!);
  if (n % 4 && n > 0) kadenzen.push(kad(n)!);

  // Zweitaktglieder benennen: gleiche oder ähnliche Glieder bekommen denselben Buchstaben
  const glieder: FormTeil[] = [];
  const muster: { start: number; name: string; varianten: number }[] = [];
  for (let s = 0; s + 2 <= n; s += 2) {
    const passt = muster.find((m) => vergleiche(takte, m.start, s, 2) !== 'verschieden');
    if (passt) {
      const a = vergleiche(takte, passt.start, s, 2);
      if (a === 'gleich') glieder.push({ name: passt.name, von: s + 1, bis: s + 2 });
      else glieder.push({ name: `${passt.name}${'′'.repeat(++passt.varianten > 2 ? 2 : passt.varianten)}`, von: s + 1, bis: s + 2 });
    } else {
      const name = String.fromCharCode(97 + muster.length);
      muster.push({ start: s, name, varianten: 0 });
      glieder.push({ name, von: s + 1, bis: s + 2 });
    }
  }

  const text: string[] = [];
  let form: string | null = null;
  const k = (t: number) => kadenzen.find((x) => x.takt === t);
  const geschlossen = (x?: Kadenz) => x?.art === 'ganz';
  const offenOderHalb = (x?: Kadenz) => !!x && (x.art === 'halb' || !!x.fremd);

  const menuett = menuettTrio(score, takte, kad);
  const lied = liedform(takte);
  if (menuett.ok) {
    form = 'Menuett mit Trio';
    text.push(...menuett.text);
  } else if (lied) {
    form = lied.name;
    text.push(lied.text);
  } else if (n >= 8) {
    const L = n >= 16 && n % 16 === 0 ? 8 : 4;
    const periode = offenOderHalb(k(L)) && geschlossen(k(2 * L)) && vergleiche(takte, 0, L, L / 2) !== 'verschieden';
    const satz = L === 4 && vergleiche(takte, 0, 2, 2) !== 'verschieden' && vergleiche(takte, 0, 4, 2) === 'verschieden' && !!k(8) && k(8)!.art !== 'offen';
    if (periode) {
      form = L === 8 ? 'Große Periode (16 Takte)' : 'Periode';
      text.push(
        `Vordersatz (Takt 1–${L}) endet offen mit ${k(L)!.fremd ? `einer Kadenz in ${k(L)!.fremd}` : 'einem Halbschluss'}, der Nachsatz (Takt ${L + 1}–${2 * L}) beginnt wie der Vordersatz und schließt mit einem Ganzschluss. Frage und Antwort.`,
      );
    } else if (satz) {
      form = 'Satz';
      text.push(
        'Takt 1–2 stellen den Grundgedanken vor, Takt 3–4 wiederholen ihn (auch versetzt). Takt 5–8 spinnen fort: kürzere Glieder, mehr Bewegung, dann die Kadenz.',
      );
    } else {
      if (vergleiche(takte, 0, L, L / 2) !== 'verschieden' && !offenOderHalb(k(L))) text.push(`Takt ${L + 1} beginnt wie Takt 1, aber Takt ${L} schließt nicht offen: Für eine Periode braucht der Vordersatz einen Halbschluss.`);
      if (offenOderHalb(k(L)) && vergleiche(takte, 0, L, L / 2) === 'verschieden') text.push(`Takt ${L} endet offen, aber der Nachsatz beginnt anders als der Vordersatz. Lass Takt ${L + 1}–${L + 2} wie Takt 1–2 beginnen, dann wird es eine Periode.`);
      if (!geschlossen(k(n - (n % 4 || 0)) ?? kadenzen[kadenzen.length - 1])) text.push('Das Ende schließt noch nicht mit einem Ganzschluss auf dem Grundton.');
    }
  }
  if (!form && n < 8) text.push('Für eine Form wie Periode oder Satz braucht es mindestens acht Takte.');
  return { takte: n, kadenzen, glieder, form, text };
}

/** Liedform: A B A′ (dreiteilig) oder A B (zweiteilig), Teile zu vier oder acht Takten */
function liedform(takte: TaktInhalt[]): { name: string; text: string } | null {
  const n = takte.length;
  for (const L of [8, 4]) {
    if (n === 3 * L) {
      const reprise = vergleiche(takte, 0, 2 * L, Math.min(L, 4));
      const kontrast = vergleiche(takte, 0, L, 2) === 'verschieden';
      if (reprise !== 'verschieden' && kontrast)
        return { name: 'Dreiteilige Liedform (A B A)', text: `A (Takt 1–${L}), B (Takt ${L + 1}–${2 * L}) als Kontrast und die Wiederkehr von A (Takt ${2 * L + 1}–${3 * L}).` };
    }
  }
  return null;
}

/** Menuett mit Trio: 3/4-Takt, zwei gleich lange Hälften mit je zwei Teilen; beide schließen mit einem Ganzschluss */
function menuettTrio(score: Score, takte: TaktInhalt[], kad: (t: number) => Kadenz | null): { ok: boolean; text: string[]; fehlt: string[] } {
  const n = takte.length;
  const fehlt: string[] = [];
  if (score.time.beats !== 3) fehlt.push('Ein Menuett steht im 3/4-Takt.');
  const S = n / 2;
  if (n < 32 || S % 8 !== 0) fehlt.push('Menuett und Trio sind gleich lang und haben je mindestens 16 Takte (2 × 8).');
  if (fehlt.length) return { ok: false, text: [], fehlt };
  const mitte = kad(S / 2);
  const mEnde = kad(S);
  const tMitte = kad(S + S / 2);
  const tEnde = kad(n);
  if (!mitte || mitte.art === 'ganz' && !mitte.fremd) fehlt.push(`Der erste Teil des Menuetts (Takt ${S / 2}) sollte offen enden: Halbschluss oder Kadenz in der Dominante.`);
  if (!mEnde || mEnde.art !== 'ganz' || mEnde.fremd) fehlt.push(`Das Menuett (Takt ${S}) schließt mit einem Ganzschluss in der Grundtonart.`);
  if (!tEnde || tEnde.art !== 'ganz') fehlt.push(`Das Trio (Takt ${n}) schließt mit einem Ganzschluss.`);
  const text = [
    `Menuett: Takt 1–${S}. Erster Teil bis Takt ${S / 2} (${mitte ? kadenzText(mitte).replace(/^Takt \d+: /, '') : '?'}), zweiter Teil bis Takt ${S} (${mEnde ? kadenzText(mEnde).replace(/^Takt \d+: /, '') : '?'}).`,
    `Trio: Takt ${S + 1}–${n}. Erster Teil bis Takt ${S + S / 2} (${tMitte ? kadenzText(tMitte).replace(/^Takt \d+: /, '') : '?'}), zweiter Teil bis Takt ${n} (${tEnde ? kadenzText(tEnde).replace(/^Takt \d+: /, '') : '?'}).`,
    'Danach wird das Menuett wiederholt (Menuetto da capo), so entsteht die dreiteilige Form A B A.',
  ];
  return { ok: fehlt.length === 0, text, fehlt };
}

/** Was einem Menuett mit Trio noch fehlt (leer, wenn alles passt) */
export function menuettTrioFehlt(score: Score): string[] {
  const takte = melodieTakte(score);
  while (takte.length && takte[takte.length - 1].toene.length === 0) takte.pop();
  const harm = harmonienVon(score);
  return menuettTrio(score, takte, (t) => kadenzAm(score, t, harm, takte)).fehlt;
}
