import { measureLength, quarterLength } from '../model/duration';
import { diatonicIndex, germanName, keyAlter, toMidi } from '../model/pitch';
import type { KeySignature, Pitch, Step } from '../model/types';
import type { EditorDoc } from '../editor/rebar';
import { rebar } from '../editor/rebar';
import { dreiklangArt, intervall, INTERVALL_NAMEN } from '../uebungen/theorie';

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const WEITE = ['None', 'Dezime', 'Undezime', 'Duodezime'];
const spanne = (stufen: number) => (stufen <= 8 ? INTERVALL_NAMEN[Math.max(stufen, 1) - 1] : (WEITE[stufen - 9] ?? `Spanne von ${stufen} Stufen`));

/** Grundton einer Tonart (ohne Oktave) */
export function grundton(key: KeySignature): { step: Step; alter: number } {
  const dur = (((key.fifths * 4) % 7) + 7) % 7;
  const idx = key.mode === 'minor' ? (dur + 5) % 7 : dur;
  const step = STEPS[idx];
  return { step, alter: keyAlter(step, key.fifths) };
}

const gleicheKlasse = (p: Pitch, g: { step: Step; alter: number }) => p.step === g.step && (p.alter ?? 0) === g.alter;

export interface Pruefpunkt {
  text: string;
  ok: boolean;
  /** Kurzer Hinweis, wenn es noch nicht passt */
  hinweis?: string;
}

/**
 * Prüft ein Stück gegen eine Liste von Kriterien, z. B.
 * „takte 8, dur, endet-grundton, schluss-lang, schritt-zum-schluss, umfang 10, sprung-max 6, leitereigen“.
 */
export function pruefe(doc: EditorDoc, kriterien: string[]): Pruefpunkt[] {
  const noten = doc.events.filter((e) => e.pitch);
  const toene = noten.map((e) => e.pitch!);
  const letzte = noten[noten.length - 1];
  const g = grundton(doc.key);
  const takte = doc.events.length ? rebar(doc).score.voices[0].measures.length : 0;

  return kriterien.map((k): Pruefpunkt => {
    const [name, arg] = k.trim().split(/\s+/);
    const n = Number(arg);
    switch (name) {
      case 'takte':
        return { text: `Genau ${n} Takte`, ok: takte === n, hinweis: `Bisher ${takte} ${takte === 1 ? "Takt" : "Takte"}.` };
      case 'noten':
        return { text: `Mindestens ${n} Noten`, ok: toene.length >= n, hinweis: `Bisher ${toene.length}.` };
      case 'dur':
        return { text: 'Steht in einer Dur-Tonart', ok: doc.key.mode === 'major', hinweis: 'Stelle unter „Tonart und Takt“ eine Dur-Tonart ein.' };
      case 'moll':
        return { text: 'Steht in einer Moll-Tonart', ok: doc.key.mode === 'minor', hinweis: 'Stelle unter „Tonart und Takt“ eine Moll-Tonart ein.' };
      case 'beginnt-grundton':
        return {
          text: `Beginnt mit dem Grundton ${germanName({ ...g, octave: 4 })}`,
          ok: !!toene[0] && gleicheKlasse(toene[0], g),
        };
      case 'endet-grundton':
        return {
          text: `Endet auf dem Grundton ${germanName({ ...g, octave: 4 })}`,
          ok: !!letzte && gleicheKlasse(letzte.pitch!, g),
          hinweis: 'Der letzte Ton sollte der Grundton der Tonart sein, dann klingt das Stück abgeschlossen.',
        };
      case 'schluss-lang': {
        const lang = !!letzte && quarterLength(letzte.duration) >= measureLength(doc.time) / 2;
        return { text: 'Der Schlusston ist lang', ok: lang, hinweis: 'Lass den letzten Ton mindestens einen halben Takt klingen.' };
      }
      case 'schritt-zum-schluss': {
        const [a, b] = toene.slice(-2);
        const ok = !!a && !!b && (Math.abs(diatonicIndex(a) - diatonicIndex(b)) <= 1 || [3, 4].includes(Math.abs(diatonicIndex(a) - diatonicIndex(b))));
        return { text: 'Schluss mit Sekundschritt oder Quint-/Quartsprung', ok, hinweis: 'Erreiche den Schlusston von der Nachbarnote oder von der Dominante aus.' };
      }
      case 'umfang': {
        const ds = toene.map(diatonicIndex);
        const umfang = ds.length ? Math.max(...ds) - Math.min(...ds) + 1 : 0;
        return { text: `Umfang höchstens eine ${spanne(n)}`, ok: umfang <= n, hinweis: `Die Melodie umfasst eine ${spanne(umfang)}.` };
      }
      case 'sprung-max': {
        let groesster = 0;
        for (let i = 1; i < toene.length; i++) groesster = Math.max(groesster, Math.abs(diatonicIndex(toene[i]) - diatonicIndex(toene[i - 1])) + 1);
        return { text: `Keine Sprünge größer als eine ${INTERVALL_NAMEN[n - 1]}`, ok: groesster <= n, hinweis: groesster ? `Größter Sprung: ${INTERVALL_NAMEN[Math.min(groesster, 8) - 1]}.` : undefined };
      }
      case 'leitereigen': {
        const fremd = toene.filter((p) => {
          const a = p.alter ?? 0;
          if (a === keyAlter(p.step, doc.key.fifths)) return false;
          // in Moll sind die erhöhte 6. und 7. Stufe erlaubt
          if (doc.key.mode === 'minor') {
            const stufe = (STEPS.indexOf(p.step) - STEPS.indexOf(g.step) + 7) % 7;
            return !((stufe === 5 || stufe === 6) && a === keyAlter(p.step, doc.key.fifths) + 1);
          }
          return true;
        });
        return { text: 'Nur Töne der Tonart', ok: fremd.length === 0, hinweis: fremd.length ? `Tonartfremd: ${fremd.map(germanName).join(', ')}.` : undefined };
      }
      case 'tonleiter': {
        const ok =
          toene.length === 8 &&
          gleicheKlasse(toene[0], g) &&
          toene.every((p, i) => i === 0 || diatonicIndex(p) - diatonicIndex(toene[i - 1]) === 1) &&
          toene.every((p) => (p.alter ?? 0) === keyAlter(p.step, doc.key.fifths));
        return { text: 'Tonleiter vom Grundton aufwärts, 8 Töne mit den richtigen Vorzeichen', ok, hinweis: 'Beginne beim Grundton und gehe Stufe für Stufe bis zur Oktave.' };
      }
      case 'dreiklaenge': {
        const gruppen: Pitch[][] = [];
        for (let i = 0; i + 2 < toene.length; i += 3) gruppen.push(toene.slice(i, i + 3));
        const ok = gruppen.length >= n && gruppen.every((gr) => dreiklangArt(gr) !== null) && toene.length % 3 === 0;
        return { text: `${n} Dreiklänge in Grundstellung, je drei Töne aufwärts`, ok, hinweis: 'Jeweils Grundton, Terz und Quinte nacheinander.' };
      }
      case 'nur-terzen': {
        const ok = toene.length >= 2 && toene.every((p, i) => i === 0 || intervall(toene[i - 1], p).nummer === 3);
        return { text: 'Nur Terzschritte', ok };
      }
      case 'hoechster-ton-einmal': {
        const max = Math.max(...toene.map(toMidi));
        const ok = toene.filter((p) => toMidi(p) === max).length === 1;
        return { text: 'Der höchste Ton kommt nur einmal vor (Höhepunkt)', ok, hinweis: 'Ein einziger Gipfelton macht die Melodie zielgerichtet.' };
      }
      default:
        return { text: `Unbekanntes Kriterium „${k}“`, ok: false };
    }
  });
}
