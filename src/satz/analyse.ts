import type { Score } from '../model/types';
import { erkenneAkkord, type Akkord } from './akkorde';
import { klaenge } from './klaenge';

export interface AkkordStelle {
  takt: number;
  zeit: number;
  akkord: Akkord;
}

const BASS_ZIFFER = ['', '₃', '₅', '₇'];

/** Funktion mit Basston nach Riemann, z. B. „D₃“ für die Dominante mit Terz im Bass */
export function funktionMitBass(a: Akkord): string {
  return a.funktion + BASS_ZIFFER[a.umkehrung];
}

/**
 * Die Akkorde eines Satzes: an jedem Zusammenklang, in dem alle Stimmen klingen und
 * ein Akkord erkannt wird. Gleiche Akkorde direkt hintereinander werden zusammengefasst.
 */
export function analysiere(score: Score): AkkordStelle[] {
  const out: AkkordStelle[] = [];
  for (const k of klaenge(score)) {
    if (k.toene.some((t) => !t)) continue;
    const akkord = erkenneAkkord(k.toene, score.key);
    if (!akkord) continue;
    const vorher = out[out.length - 1]?.akkord;
    if (vorher && vorher.name === akkord.name && vorher.umkehrung === akkord.umkehrung) continue;
    out.push({ takt: k.takt, zeit: k.zeit, akkord });
  }
  return out;
}

/** Die Folge der Funktionen ohne direkte Wiederholungen, z. B. ["T", "S", "D⁷", "T"] */
export function funktionsfolge(score: Score): string[] {
  const out: string[] = [];
  for (const s of analysiere(score)) if (out[out.length - 1] !== s.akkord.funktion) out.push(s.akkord.funktion);
  return out;
}

/** Passt eine erkannte Funktion zur erwarteten? „D“ akzeptiert auch „D⁷“, „D7“ verlangt die Septime. */
export function funktionPasst(erwartet: string, ist: string): boolean {
  const e = erwartet.replace(/7/g, '⁷');
  return ist === e || ist === `${e}⁷`;
}
