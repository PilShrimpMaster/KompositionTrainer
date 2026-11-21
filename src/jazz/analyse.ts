import { measureLength, quarterLength } from '../model/duration';
import { eventId } from '../model/ids';
import { germanName, toMidi } from '../model/pitch';
import { grundton } from '../model/tonart';
import type { KeySignature, Pitch, Score, Step } from '../model/types';
import type { Befund } from '../satz/regeln';
import { akkordPcs, grundPc, parseAkkordsymbol, type AkkordSymbol } from './akkordsymbol';

/**
 * Jazzharmonik: Akkordsymbole eines Leadsheets in Stufen deuten (IIm7, V7, Imaj7 …),
 * II–V–I, Zwischendominanten, Tritonus-Substitutionen und modale Mischung finden
 * und die Melodietöne als Akkordton, Tension oder Avoid Note einordnen.
 */

const STAMM: Record<Step, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcVon = (p: { step: Step; alter?: number }) => (((STAMM[p.step] + (p.alter ?? 0)) % 12) + 12) % 12;

export interface LeadAkkord {
  /** Laufende Nummer im Stück */
  index: number;
  text: string;
  sym: AkkordSymbol;
  /** Takt ab 1 */
  takt: number;
  /** Beginn und Ende in Vierteln ab Stückanfang */
  start: number;
  ende: number;
  /** Note, über der das Symbol steht */
  id: string;
}

export interface MelodieTon {
  id: string;
  pitch: Pitch;
  takt: number;
  start: number;
  dauer: number;
  /** Beginnt auf einer Hauptzählzeit (Eins oder Taktmitte) */
  schwer: boolean;
}

/** Akkordsymbole und Melodietöne einer Stimme mit Zeitpunkten */
export function leadsheet(score: Score, stimme = 0): { akkorde: LeadAkkord[]; toene: MelodieTon[]; ungueltig: { text: string; takt: number; id: string }[] } {
  const akkorde: LeadAkkord[] = [];
  const toene: MelodieTon[] = [];
  const ungueltig: { text: string; takt: number; id: string }[] = [];
  const bar = measureLength(score.time);
  const haupt = score.time.beats % 2 === 0 && score.time.beatType === 4 ? bar / 2 : bar;
  let t = 0;
  score.voices[stimme]?.measures.forEach((m, mi) => {
    let pos = 0;
    m.notes.forEach((ev, ni) => {
      const id = eventId(stimme, mi, ni);
      const len = quarterLength(ev.duration);
      if (ev.akkord) {
        const sym = parseAkkordsymbol(ev.akkord);
        if (sym) akkorde.push({ index: akkorde.length, text: ev.akkord, sym, takt: mi + 1, start: t + pos, ende: Infinity, id });
        else ungueltig.push({ text: ev.akkord, takt: mi + 1, id });
      }
      if (ev.pitch) {
        const vorher = toene[toene.length - 1];
        // Übergebundene Noten zusammenfassen
        if (vorher && Math.abs(vorher.start + vorher.dauer - (t + pos)) < 1e-6 && toMidi(vorher.pitch) === toMidi(ev.pitch) && gebunden(score, stimme, mi, ni)) vorher.dauer += len;
        else toene.push({ id, pitch: ev.pitch, takt: mi + 1, start: t + pos, dauer: len, schwer: Math.abs(pos % haupt) < 1e-6 });
      }
      pos += len;
    });
    t += mi > 0 ? Math.max(pos, bar) : pos;
  });
  akkorde.forEach((a, i) => (a.ende = i + 1 < akkorde.length ? akkorde[i + 1].start : t));
  return { akkorde, toene, ungueltig };
}

function gebunden(score: Score, stimme: number, mi: number, ni: number): boolean {
  const ms = score.voices[stimme].measures;
  const vor = ni > 0 ? ms[mi].notes[ni - 1] : ms[mi - 1]?.notes[ms[mi - 1].notes.length - 1];
  return !!vor?.tie;
}

export type Qualitaet = 'maj' | 'dom' | 'moll' | 'halbvermindert' | 'vermindert' | 'uebermaessig' | 'sus';

export function qualitaet(a: AkkordSymbol): Qualitaet {
  if (a.geschlecht === 'vermindert') return a.septime === 'klein' ? 'halbvermindert' : 'vermindert';
  if (a.geschlecht === 'moll') return 'moll';
  if (a.geschlecht === 'uebermaessig') return a.septime === 'klein' ? 'dom' : 'uebermaessig';
  if (a.geschlecht === 'sus4' || a.geschlecht === 'sus2') return a.septime === 'klein' ? 'dom' : 'sus';
  return a.septime === 'klein' ? 'dom' : 'maj';
}

/** Kurzer Zusatz für die Stufenbezeichnung */
function zusatz(a: AkkordSymbol): string {
  const q = qualitaet(a);
  const sechs = a.toene.some((t) => t.stufe === 6);
  if (q === 'halbvermindert') return 'ø7';
  if (q === 'vermindert') return a.septime ? 'o7' : 'o';
  if (q === 'uebermaessig') return '+';
  if (q === 'moll') return a.septime === 'klein' ? 'm7' : a.septime === 'gross' ? 'm(maj7)' : sechs ? 'm6' : 'm';
  if (q === 'dom') return a.geschlecht === 'sus4' ? '7sus4' : '7';
  if (q === 'sus') return 'sus4';
  return a.septime === 'gross' ? 'maj7' : sechs ? '6' : '';
}

const DUR_STUFEN: Record<number, string> = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: '#IV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };
const MOLL_STUFEN: Record<number, string> = { 0: 'I', 1: 'bII', 2: 'II', 3: 'bIII', 4: 'III', 5: 'IV', 6: '#IV', 7: 'V', 8: 'bVI', 9: 'VI', 10: 'bVII', 11: 'VII' };

/** Stufe des Akkords in der Tonart, z. B. „IIm7“, „V7“, „bVImaj7“ */
export function stufe(a: AkkordSymbol, key: KeySignature): string {
  const tonika = pcVon(grundton(key));
  const iv = (grundPc(a) - tonika + 12) % 12;
  let roem = (key.mode === 'minor' ? MOLL_STUFEN : DUR_STUFEN)[iv];
  if (iv === 6 && qualitaet(a) === 'dom') roem = 'bV';
  return `${roem}${zusatz(a)}`;
}

/** Tonklassen der Tonleiter (Dur bzw. natürliches Moll) */
function leiter(key: KeySignature): number[] {
  const t = pcVon(grundton(key));
  const iv = key.mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return iv.map((i) => (t + i) % 12);
}

export type MusterArt = 'ii-v-i' | 'ii-v' | 'v-i' | 'zwischendominante' | 'tritonus-substitution' | 'modale-mischung';

export interface Muster {
  art: MusterArt;
  /** Indizes der beteiligten Akkorde (in der Liste ohne Wiederholungen) */
  akkorde: number[];
  takt: number;
  text: string;
}

export interface Deutung {
  akkord: LeadAkkord;
  stufe: string;
  /** Funktion oder Rolle in Worten */
  rolle: string;
  diatonisch: boolean;
}

const tonName = (pc: number) => ['C', 'Des', 'D', 'Es', 'E', 'F', 'Fis', 'G', 'As', 'A', 'B', 'H'][pc];

/** Deutet die Akkorde eines Leadsheets in der Tonart */
export function jazzAnalyse(akkorde: LeadAkkord[], key: KeySignature): { deutungen: Deutung[]; muster: Muster[] } {
  // Wiederholte gleiche Symbole zusammenfassen
  const folge = akkorde.filter((a, i) => i === 0 || a.text !== akkorde[i - 1].text);
  const skala = leiter(key);
  const tonika = pcVon(grundton(key));
  const muster: Muster[] = [];
  const rollen = new Map<number, string>();

  folge.forEach((a, i) => {
    const q = qualitaet(a.sym);
    const r = grundPc(a.sym);
    const naechster = folge[i + 1];
    const vorher = folge[i - 1];
    if (q !== 'dom' || !naechster) return;
    const ziel = grundPc(naechster.sym);
    const abstand = (r - ziel + 12) % 12;
    const zielName = germanName({ ...naechster.sym.grund, octave: 4 });
    const zielIstTonika = ziel === tonika && ['maj', 'moll'].includes(qualitaet(naechster.sym));
    const zweiVorher = vorher && ['moll', 'halbvermindert'].includes(qualitaet(vorher.sym));
    if (abstand === 7) {
      // Quintfall: V–I, eventuell mit II davor
      const ii = zweiVorher && (grundPc(vorher.sym) - r + 12) % 12 === 7;
      if (ii) muster.push({ art: 'ii-v-i', akkorde: [i - 1, i, i + 1], takt: vorher.takt, text: `II–V–I nach ${zielName}: ${vorher.text} – ${a.text} – ${naechster.text}` });
      else muster.push({ art: 'v-i', akkorde: [i, i + 1], takt: a.takt, text: `V–I nach ${zielName}: ${a.text} – ${naechster.text}` });
      if (!zielIstTonika) {
        muster.push({ art: 'zwischendominante', akkorde: [i, i + 1], takt: a.takt, text: `Zwischendominante: ${a.text} ist V7 von ${naechster.text}` });
        rollen.set(i, `Zwischendominante (V7 von ${zielName})`);
        if (ii) rollen.set(i - 1, `II von ${zielName} (eingeschobene II–V)`);
      } else {
        rollen.set(i, 'Dominante');
        if (ii) rollen.set(i - 1, 'Subdominante (II der II–V–I)');
      }
    } else if (abstand === 1) {
      // Halbton abwärts: Tritonus-Substitution
      const ii = zweiVorher && (grundPc(vorher.sym) - ziel + 12) % 12 === 2;
      muster.push({
        art: 'tritonus-substitution',
        akkorde: ii ? [i - 1, i, i + 1] : [i, i + 1],
        takt: (ii ? vorher : a).takt,
        text: `Tritonus-Substitution: ${a.text} ersetzt die Dominante von ${naechster.text} (${tonName((ziel + 7) % 12)}7), ihr Grundton liegt einen Tritonus entfernt`,
      });
      rollen.set(i, `Tritonus-Substitution (SubV7 von ${zielName})`);
      if (ii) rollen.set(i - 1, `II von ${zielName}`);
    }
  });
  // II–V ohne Auflösung
  folge.forEach((a, i) => {
    const v = folge[i + 1];
    if (!v || !['moll', 'halbvermindert'].includes(qualitaet(a.sym)) || qualitaet(v.sym) !== 'dom') return;
    if ((grundPc(a.sym) - grundPc(v.sym) + 12) % 12 !== 7) return;
    if (muster.some((m) => m.art === 'ii-v-i' && m.akkorde[0] === i)) return;
    muster.push({ art: 'ii-v', akkorde: [i, i + 1], takt: a.takt, text: `II–V ohne Auflösung: ${a.text} – ${v.text}` });
    if (!rollen.has(i)) rollen.set(i, 'II einer II–V');
  });

  const deutungen = folge.map((a, i): Deutung => {
    const st = stufe(a.sym, key);
    const diatonisch = akkordPcs(a.sym).every((pc) => skala.includes(pc));
    let rolle = rollen.get(i);
    if (!rolle && key.mode === 'major' && /^(bVI|bVII|bIII|IVm|IIø|Im)/.test(st) && !diatonisch) {
      rolle = 'aus Moll entlehnt (modale Mischung)';
      muster.push({ art: 'modale-mischung', akkorde: [i], takt: a.takt, text: `Modale Mischung: ${a.text} (${st}) stammt aus ${germanName({ ...grundton(key), octave: 4 }).toLowerCase()}-Moll` });
    }
    if (!rolle) {
      const roem = st.replace(/[^IVb#]+$/, '').replace(/[a-z+ø].*$/, '');
      const fkt: Record<string, string> = key.mode === 'minor'
        ? { I: 'Tonika', bIII: 'Tonikaparallele', IV: 'Subdominante', II: 'Subdominante', bVI: 'Subdominante', V: 'Dominante', bVII: 'Dominante', VII: 'Dominante' }
        : { I: 'Tonika', III: 'Tonika', VI: 'Tonika', II: 'Subdominante', IV: 'Subdominante', V: 'Dominante', VII: 'Dominante' };
      rolle = diatonisch ? (fkt[roem] ?? 'leitereigen') : 'leiterfremd';
    }
    return { akkord: a, stufe: st, rolle, diatonisch };
  });
  muster.sort((x, y) => x.takt - y.takt);
  return { deutungen, muster };
}

export type TonArt = 'akkordton' | 'tension' | 'avoid' | 'fremd';

const INTERVALL_NAME = ['Grundton', 'b9', '9', '#9', 'Terz', '11', '#11', 'Quinte', 'b13', '13', 'Septime', 'große Septime'];

/** Wie passt ein Melodieton zum Akkord? Akkordton, Tension (Optionston), Avoid Note oder fremd */
export function optionston(p: Pitch | { step: Step; alter?: number }, a: AkkordSymbol): { art: TonArt; name: string } {
  const pc = pcVon(p);
  const iv = (pc - grundPc(a) + 12) % 12;
  const ton = a.toene.find((t) => t.halb % 12 === iv);
  if (ton) {
    const n = { 1: 'Grundton', 2: 'Sekunde', 3: 'Terz', 4: 'Quarte', 5: 'Quinte', 6: 'Sexte', 7: 'Septime', 9: 'None', 11: 'Undezime', 13: 'Tredezime' }[ton.stufe] ?? `${ton.stufe}`;
    return { art: ton.stufe > 7 ? 'tension' : 'akkordton', name: n };
  }
  const q = qualitaet(a);
  const name = INTERVALL_NAME[iv];
  const t = (art: TonArt, nm = name) => ({ art, name: nm });
  switch (iv) {
    case 1:
      return q === 'dom' ? t('tension') : t('avoid');
    case 2:
      return t('tension');
    case 3:
      return q === 'dom' ? t('tension', '#9') : t('fremd', 'kleine Terz');
    case 4:
      return t('fremd', 'große Terz');
    case 5:
      return q === 'moll' || q === 'halbvermindert' || q === 'vermindert' ? t('tension') : q === 'sus' ? t('akkordton', 'Quarte') : t('avoid', '11 (Quarte)');
    case 6:
      return q === 'maj' || q === 'dom' || q === 'moll' ? t('tension') : t('fremd');
    case 7:
      return t('fremd', 'reine Quinte');
    case 8:
      return q === 'dom' || q === 'halbvermindert' ? t('tension') : q === 'moll' ? t('avoid') : t('fremd');
    case 9:
      return q === 'halbvermindert' ? t('fremd', '13') : t('tension');
    case 10:
      return t('fremd', 'kleine Septime');
    case 11:
      return q === 'maj' ? t('tension', 'große Septime') : t('fremd', 'große Septime');
  }
  return t('fremd');
}

/** Prüft ein Leadsheet: lesbare Symbole, Akkord am Anfang, keine langen Avoid Notes */
export function pruefeLeadsheet(score: Score, stimme = 0): Befund[] {
  const { akkorde, toene, ungueltig } = leadsheet(score, stimme);
  const befunde: Befund[] = [];
  for (const u of ungueltig) befunde.push({ regel: 'ls-symbol', art: 'fehler', text: `„${u.text}“ ist kein Akkordsymbol, das die App lesen kann.`, ids: [u.id], takt: u.takt });
  if (!akkorde.length) return befunde;
  const erster = toene[0];
  if (erster && erster.start < akkorde[0].start) befunde.push({ regel: 'ls-anfang', art: 'hinweis', text: 'Über der ersten Melodienote steht noch kein Akkordsymbol.', ids: [erster.id], takt: erster.takt });
  for (const ton of toene) {
    const a = akkorde.find((x) => x.start <= ton.start + 1e-6 && ton.start < x.ende - 1e-6);
    if (!a) continue;
    const o = optionston(ton.pitch, a.sym);
    const lang = ton.dauer >= 2 || (ton.schwer && ton.dauer >= 1);
    const name = germanName(ton.pitch);
    if (o.art === 'avoid' && lang)
      befunde.push({ regel: 'ls-avoid', art: 'fehler', text: `${name} ist über ${a.text} eine Avoid Note (${o.name}): Sie reibt sich einen Halbton über einem Akkordton. Als kurzer Durchgang geht das, lang oder betont nicht. Wähle einen anderen Akkord oder Ton.`, ids: [ton.id], takt: ton.takt });
    else if (o.art === 'fremd' && lang)
      befunde.push({ regel: 'ls-fremd', art: 'hinweis', text: `${name} passt über ${a.text} weder als Akkordton noch als Optionston (${o.name}). Gewollt als Reibung, oder passt ein anderer Akkord besser?`, ids: [ton.id], takt: ton.takt });
  }
  return befunde;
}

/** Zählt die Muster einer Art im Stück */
export function zaehleMuster(score: Score, key: KeySignature, art: MusterArt | MusterArt[]): number {
  const arten = Array.isArray(art) ? art : [art];
  return jazzAnalyse(leadsheet(score).akkorde, key).muster.filter((m) => arten.includes(m.art)).length;
}

/** Shell Voicing (Grundton, Terz, Septime) und Drop-2-Voicing eines Akkords */
export function voicings(a: AkkordSymbol): { shell: Pitch[]; drop2: Pitch[] } {
  const ton = (stufe: number) => a.toene.find((t) => t.stufe === stufe) ?? a.toene.find((t) => t.stufe === (stufe === 3 ? 4 : stufe === 7 ? 6 : 5));
  const spell = (halbOben: number, stufeNr: number, okt: number): Pitch => {
    const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const gi = STEPS.indexOf(a.grund.step);
    const zi = gi + stufeNr - 1;
    const step = STEPS[zi % 7];
    const o = okt + Math.floor(zi / 7);
    const soll = STAMM[a.grund.step] + a.grund.alter + halbOben + 12 * okt;
    return { step, alter: soll - (STAMM[step] + 12 * o), octave: o };
  };
  const grund = spell(0, 1, 2);
  const g = toMidi(grund) < 40 ? { ...grund, octave: grund.octave + 1 } : grund;
  const terz = ton(3)!;
  const sept = ton(7) ?? ton(6)!;
  const shell = [g, spell(terz.halb, terz.stufe, 3), spell(sept.halb, sept.stufe, 3)].sort((x, y) => toMidi(x) - toMidi(y));
  // Enge Lage mit vier Tönen (1/9, 3, 5/13, 7), dann den zweithöchsten eine Oktave tiefer
  const vier = [ton(3)!, a.toene.find((t) => t.stufe === 5) ?? ton(3)!, sept, a.toene.find((t) => t.stufe === 9) ?? a.toene[0]];
  const eng = vier
    .map((t) => {
      let p = spell(t.halb, t.stufe, 4);
      while (toMidi(p) > 72) p = { ...p, octave: p.octave - 1 };
      while (toMidi(p) < 60) p = { ...p, octave: p.octave + 1 };
      return p;
    })
    .sort((x, y) => toMidi(x) - toMidi(y));
  const zweit = eng[eng.length - 2];
  const drop2 = [{ ...zweit, octave: zweit.octave - 1 }, ...eng.filter((p) => p !== zweit)].sort((x, y) => toMidi(x) - toMidi(y));
  return { shell, drop2 };
}
