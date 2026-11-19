import { erzeugeAufgabe, UEBUNGEN, type Aufgabe, type Stufe } from '../uebungen/aufgaben';
import { berechneFortschritt } from '../uebungen/fortschritt';
import { db } from '../speicher/db';
import type { Fortschritt } from '../speicher/backup';
import { MODULE } from './module';

/** Fragen je Modul und wie viele davon richtig sein müssen, um es zu überspringen */
export const FRAGEN_JE_MODUL = 5;
export const BESTANDEN_AB = 4;
/** Schwierigkeit der Fragen eines Moduls, von leicht nach schwer */
const SCHWIERIGKEIT: Stufe[] = [2, 2, 3, 3, 3];

export interface Testfrage {
  modul: string;
  aufgabe: Aufgabe;
  hoeren: boolean;
}

export interface ModulErgebnis {
  modul: string;
  titel: string;
  richtig: number;
  gesamt: number;
  bestanden: boolean;
}

/**
 * Stellt den Einstufungstest der Stufe 1 zusammen: je Modul fünf Fragen,
 * Lesen und Hören gemischt. Diktate bleiben draußen, sie dauern für einen Test zu lange.
 */
export function erstelleTest(rng: () => number = Math.random): Testfrage[] {
  const fragen: Testfrage[] = [];
  for (const m of MODULE.filter((m) => m.stufe === 1)) {
    const typen = UEBUNGEN.filter((u) => u.modul === m.id && u.typ !== 'melodiediktat');
    const gesehen = new Set<string>();
    for (let i = 0; i < FRAGEN_JE_MODUL; i++) {
      const info = typen[i % typen.length];
      let a = erzeugeAufgabe(info.typ, SCHWIERIGKEIT[i], rng);
      // dieselbe Frage nicht zweimal
      for (let n = 0; n < 8 && gesehen.has(schluessel(a)); n++) a = erzeugeAufgabe(info.typ, SCHWIERIGKEIT[i], rng);
      gesehen.add(schluessel(a));
      fragen.push({ modul: m.id, aufgabe: a, hoeren: info.hoeren });
    }
  }
  return fragen;
}

function schluessel(a: Aufgabe) {
  return `${a.frage}|${a.loesung}|${JSON.stringify(a.noten ?? a.klang)}`;
}

/** Wertet die Antworten aus (null = „Weiß ich nicht“) */
export function auswerten(fragen: Testfrage[], antworten: (string | null)[]): ModulErgebnis[] {
  return MODULE.filter((m) => m.stufe === 1).map((m) => {
    const idx = fragen.map((f, i) => (f.modul === m.id ? i : -1)).filter((i) => i >= 0);
    const richtig = idx.filter((i) => antworten[i] === fragen[i].aufgabe.loesung).length;
    return { modul: m.id, titel: m.titel, richtig, gesamt: idx.length, bestanden: richtig >= BESTANDEN_AB };
  });
}

/**
 * Überträgt das Ergebnis in den Fortschritt: Bestandene Module werden „übersprungen“
 * (ein schon sicheres Modul bleibt sicher). Wer ein früher übersprungenes Modul jetzt
 * nicht besteht, bekommt wieder den Stand aus seinen Übungen.
 */
export async function einstufungAnwenden(ergebnisse: ModulErgebnis[]): Promise<Fortschritt[]> {
  const neu: Fortschritt[] = [];
  for (const e of ergebnisse) {
    const bisher = await db.fortschritt.get(e.modul);
    let f: Fortschritt;
    if (e.bestanden) {
      if (bisher?.status === 'sicher') continue;
      f = { modul: e.modul, status: 'uebersprungen', sicherheit: Math.max(bisher?.sicherheit ?? 0, e.richtig / e.gesamt), geaendert: Date.now() };
    } else {
      if (bisher?.status !== 'uebersprungen') continue;
      const alle = await db.ergebnisse.where('modul').equals(e.modul).toArray();
      f = berechneFortschritt(e.modul, alle);
    }
    await db.fortschritt.put(f);
    neu.push(f);
  }
  return neu;
}
