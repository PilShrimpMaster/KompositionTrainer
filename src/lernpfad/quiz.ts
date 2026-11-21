import type { UebungTyp } from '../uebungen/aufgaben';
import type { Lektion } from './lektion';

/** Eine Wissensfrage im Quiz am Ende einer Lektion */
export interface QuizFrage {
  frage: string;
  antworten: string[];
  /** Index der richtigen Antwort in `antworten` */
  richtig: number;
  erklaerung?: string;
  /** Lektion, aus der die Frage stammt */
  modul: string;
}

/**
 * Liest den Abschnitt „## Quiz“ einer Lektion. Fragen sind durch Leerzeilen getrennt:
 *
 *     ? Frage
 *     + richtige Antwort
 *     - falsche Antwort
 *     - falsche Antwort
 *     = Erklärung (optional)
 */
export function parseQuiz(text: string, modul: string, ort = '?'): QuizFrage[] {
  const bloecke = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return bloecke.map((block, i) => {
    let frage = '';
    let erklaerung: string | undefined;
    const antworten: string[] = [];
    let richtig = -1;
    for (const roh of block.split('\n')) {
      const z = roh.trim();
      const inhalt = z.slice(1).trim();
      if (z.startsWith('?')) frage = inhalt;
      else if (z.startsWith('+')) {
        if (richtig >= 0) throw new Error(`${ort}: Frage ${i + 1} hat mehr als eine richtige Antwort`);
        richtig = antworten.length;
        antworten.push(inhalt);
      } else if (z.startsWith('-')) antworten.push(inhalt);
      else if (z.startsWith('=')) erklaerung = inhalt;
      else if (z) throw new Error(`${ort}: unbekannte Zeile „${z}“ in Frage ${i + 1}`);
    }
    if (!frage) throw new Error(`${ort}: Frage ${i + 1} hat keinen Fragetext`);
    if (richtig < 0) throw new Error(`${ort}: „${frage}“ hat keine richtige Antwort (+)`);
    if (antworten.length < 2) throw new Error(`${ort}: „${frage}“ braucht mindestens zwei Antworten`);
    if (new Set(antworten).size !== antworten.length) throw new Error(`${ort}: „${frage}“ hat doppelte Antworten`);
    return { frage, antworten, richtig, erklaerung, modul };
  });
}

/** Übungstypen, die in einer Lektion vorkommen */
export function uebungenDer(l: Lektion): UebungTyp[] {
  return [...new Set(l.schritte.flatMap((s) => s.bausteine.flatMap((b) => (b.art === 'uebungen' ? b.typen : []))))];
}

const istAbschluss = (modul: string) => /^s\d+-abschluss$/.test(modul);
const stufeVon = (modul: string) => Number(/^s(\d+)-/.exec(modul)?.[1] ?? 1);

/**
 * Was das Quiz einer Lektion abfragt: ihre eigenen Wissensfragen und eine Praxisrunde mit ihren Übungen.
 * Das Quiz eines Abschlussprojekts fragt die ganze Stufe ab: eigene Fragen, je zwei Fragen aus jeder
 * Lektion der Stufe und alle Übungen der Stufe.
 */
export function quizFuer(l: Lektion, alle: Lektion[], zufall: () => number = Math.random): { fragen: QuizFrage[]; praxis: UebungTyp[] } {
  if (!istAbschluss(l.modul)) {
    const praxis = uebungenDer(l);
    // Jede Übung zweimal, damit die Praxisrunde mehr als eine Stichprobe ist
    return { fragen: mische(l.quiz, zufall), praxis: mische([...praxis, ...praxis], zufall) };
  }
  const stufe = stufeVon(l.modul);
  const lektionen = alle.filter((x) => x !== l && stufeVon(x.modul) === stufe && !istAbschluss(x.modul));
  const aus = lektionen.flatMap((x) => mische(x.quiz, zufall).slice(0, 2));
  const praxis = [...new Set(lektionen.flatMap(uebungenDer))];
  return { fragen: mische([...l.quiz, ...aus], zufall), praxis: mische(praxis, zufall) };
}

export function mische<T>(xs: T[], zufall: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Ergebnisse im Browser ---------- */

export interface QuizErgebnis {
  /** Bestes Ergebnis (richtige Antworten) */
  beste: number;
  von: number;
  datum: string;
}

const KEY = 'kt-quiz-v1';
/** Ab diesem Anteil richtiger Antworten gilt ein Quiz als bestanden */
export const BESTANDEN = 0.8;

export function quizErgebnisse(): Record<string, QuizErgebnis> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, QuizErgebnis>;
  } catch {
    return {};
  }
}

export function quizErgebnis(modul: string): QuizErgebnis | undefined {
  return quizErgebnisse()[modul];
}

export const bestanden = (e: QuizErgebnis | undefined) => !!e && e.von > 0 && e.beste / e.von >= BESTANDEN;

export function quizSpeichern(modul: string, richtig: number, von: number) {
  const alle = quizErgebnisse();
  const alt = alle[modul];
  if (alt && alt.von === von && alt.beste >= richtig) return;
  alle[modul] = { beste: alt && alt.von === von ? Math.max(alt.beste, richtig) : richtig, von, datum: new Date().toISOString().slice(0, 10) };
  try {
    localStorage.setItem(KEY, JSON.stringify(alle));
  } catch {
    /* ignorieren */
  }
}
