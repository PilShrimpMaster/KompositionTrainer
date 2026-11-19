import type { Ergebnis, Fortschritt, ModulStatus } from '../speicher/backup';
import { neueId } from '../speicher/backup';
import { db } from '../speicher/db';

/** Wie viele der letzten Ergebnisse in die Sicherheit eingehen */
export const FENSTER = 20;
/** Ab so vielen Aufgaben und dieser Quote gilt ein Modul als sicher */
export const SICHER_AB = { anzahl: 15, quote: 0.85 };

/** Sicherheit und Status eines Moduls aus seinen Ergebnissen (neueste zuletzt) */
export function berechneFortschritt(
  modul: string,
  ergebnisse: Pick<Ergebnis, 'richtig' | 'zeit'>[],
  bisher?: Fortschritt,
): Fortschritt {
  const sortiert = [...ergebnisse].sort((a, b) => a.zeit - b.zeit);
  const letzte = sortiert.slice(-FENSTER);
  const sicherheit = letzte.length ? letzte.filter((e) => e.richtig).length / letzte.length : 0;
  let status: ModulStatus = letzte.length ? 'begonnen' : 'offen';
  if (sortiert.length >= SICHER_AB.anzahl && sicherheit >= SICHER_AB.quote) status = 'sicher';
  else if (bisher?.status === 'uebersprungen') status = 'uebersprungen';
  return { modul, status, sicherheit, geaendert: Date.now() };
}

export async function ergebnisSpeichern(modul: string, uebung: string, richtig: boolean): Promise<Fortschritt> {
  await db.ergebnisse.add({ id: neueId(), modul, uebung, richtig, zeit: Date.now() });
  const alle = await db.ergebnisse.where('modul').equals(modul).toArray();
  const f = berechneFortschritt(modul, alle, await db.fortschritt.get(modul));
  await db.fortschritt.put(f);
  return f;
}

export async function modulSicherheit(modul: string): Promise<number> {
  return (await db.fortschritt.get(modul))?.sicherheit ?? 0;
}
