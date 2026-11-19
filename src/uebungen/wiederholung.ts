import type { Ergebnis } from '../speicher/backup';
import { UEBUNGEN, type UebungTyp } from './aufgaben';

/**
 * Wiederholungsplaner nach dem SM-2-Verfahren (SuperMemo 2), je Übungstyp.
 *
 * Der Plan wird jedes Mal aus den gespeicherten Ergebnissen berechnet, deshalb braucht
 * er keine eigene Tabelle und wandert mit der Datensicherung mit. Alle Ergebnisse eines
 * Übungstyps an einem Tag bilden eine Sitzung; ihre Trefferquote ergibt die Note.
 */

const TAG = 24 * 60 * 60 * 1000;

export interface Plan {
  typ: UebungTyp;
  /** Anfang des Tages, an dem die nächste Wiederholung fällig ist */
  faellig: number;
  /** Abstand bis zur nächsten Wiederholung in Tagen */
  intervall: number;
  /** Leichtigkeit nach SM-2 (1,3 bis etwa 2,5); niedrig = schwieriges Thema */
  leichtigkeit: number;
  /** Trefferquote der letzten 20 Aufgaben */
  quote: number;
  sitzungen: number;
}

/** Tagesnummer in lokaler Zeit */
export function tagVon(zeit: number): number {
  const d = new Date(zeit);
  return Math.floor((zeit - d.getTimezoneOffset() * 60 * 1000) / TAG);
}

const tagesbeginn = (tag: number) => {
  const utc = tag * TAG;
  return utc + new Date(utc).getTimezoneOffset() * 60 * 1000;
};

/** Note 0–5 aus der Trefferquote einer Sitzung */
export function note(quote: number): number {
  return quote >= 0.9 ? 5 : quote >= 0.75 ? 4 : quote >= 0.6 ? 3 : quote >= 0.4 ? 2 : 1;
}

/** Plan für einen Übungstyp aus seinen Ergebnissen */
export function planFuer(typ: UebungTyp, ergebnisse: Pick<Ergebnis, 'richtig' | 'zeit'>[]): Plan | null {
  if (!ergebnisse.length) return null;
  const sortiert = [...ergebnisse].sort((a, b) => a.zeit - b.zeit);
  const tage = new Map<number, { richtig: number; gesamt: number }>();
  for (const e of sortiert) {
    const t = tagVon(e.zeit);
    const s = tage.get(t) ?? { richtig: 0, gesamt: 0 };
    s.gesamt++;
    if (e.richtig) s.richtig++;
    tage.set(t, s);
  }
  let leichtigkeit = 2.5;
  let intervall = 0;
  let wiederholungen = 0;
  let letzterTag = 0;
  for (const [tag, s] of [...tage].sort((a, b) => a[0] - b[0])) {
    const n = note(s.richtig / s.gesamt);
    if (n >= 3) {
      intervall = wiederholungen === 0 ? 1 : wiederholungen === 1 ? 3 : Math.round(intervall * leichtigkeit);
      wiederholungen++;
    } else {
      wiederholungen = 0;
      intervall = 1;
    }
    leichtigkeit = Math.max(1.3, leichtigkeit + (0.1 - (5 - n) * (0.08 + (5 - n) * 0.02)));
    letzterTag = tag;
  }
  const letzte = sortiert.slice(-20);
  return {
    typ,
    faellig: tagesbeginn(letzterTag + intervall),
    intervall,
    leichtigkeit,
    quote: letzte.filter((e) => e.richtig).length / letzte.length,
    sitzungen: tage.size,
  };
}

/** Pläne aller Übungstypen, die schon einmal geübt wurden */
export function allePlaene(ergebnisse: Ergebnis[]): Plan[] {
  return UEBUNGEN.map((u) => planFuer(u.typ, ergebnisse.filter((e) => e.uebung === u.typ))).filter((p): p is Plan => p !== null);
}

/** Schwäche eines Themas: je niedriger die Quote und die Leichtigkeit, desto höher */
export function schwaeche(p: Plan): number {
  return 1 - p.quote + (2.5 - p.leichtigkeit) / 2;
}

/** Fällige Themen, die schwächsten und am längsten überfälligen zuerst */
export function faellige(plaene: Plan[], jetzt = Date.now()): Plan[] {
  const heute = tagVon(jetzt);
  return plaene
    .filter((p) => tagVon(p.faellig) <= heute)
    .sort((a, b) => schwaeche(b) + (heute - tagVon(b.faellig)) / 7 - (schwaeche(a) + (heute - tagVon(a.faellig)) / 7));
}

/**
 * Stellt die tägliche Wiederholungsrunde zusammen: etwa 15 Aufgaben (10 bis 15 Minuten).
 * Schwache Themen bekommen mehr Aufgaben; gleiche Typen stehen nicht direkt hintereinander.
 */
export function tagesrunde(themen: Plan[], anzahl = 15, rng: () => number = Math.random): UebungTyp[] {
  if (!themen.length) return [];
  const gewicht = themen.map((p) => 1 + 2 * schwaeche(p));
  const summe = gewicht.reduce((a, b) => a + b, 0);
  // Jedes Thema mindestens zwei Aufgaben, der Rest nach Gewicht
  const zahl = themen.map((_, i) => Math.max(2, Math.round((gewicht[i] / summe) * anzahl)));
  while (zahl.reduce((a, b) => a + b, 0) > Math.max(anzahl, themen.length * 2)) {
    const i = zahl.indexOf(Math.max(...zahl));
    zahl[i]--;
  }
  const topf = themen.flatMap((p, i) => Array<UebungTyp>(zahl[i]).fill(p.typ));
  // Mischen, dann direkte Wiederholungen auseinanderziehen
  for (let i = topf.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [topf[i], topf[j]] = [topf[j], topf[i]];
  }
  for (let i = 1; i < topf.length; i++) {
    if (topf[i] !== topf[i - 1]) continue;
    const j = topf.findIndex((t, k) => k > i && t !== topf[i]);
    if (j > 0) [topf[i], topf[j]] = [topf[j], topf[i]];
  }
  return topf;
}
