import Dexie, { type Table } from 'dexie';
import type { EditorDoc } from '../editor/rebar';
import {
  neueId,
  pruefeSicherung,
  zusammenfuehren,
  type Ergebnis,
  type Fortschritt,
  type Sicherung,
  type Stueck,
} from './backup';

/**
 * Lokale Datenbank im Browser (IndexedDB). Neue Felder oder Tabellen bekommen
 * eine neue `version(...)` mit Migration, damit vorhandene Daten erhalten bleiben.
 */
class TrainerDB extends Dexie {
  stuecke!: Table<Stueck, string>;
  fortschritt!: Table<Fortschritt, string>;
  ergebnisse!: Table<Ergebnis, string>;

  constructor(name = 'kompositionstrainer') {
    super(name);
    this.version(1).stores({
      stuecke: 'id, geaendert',
      fortschritt: 'modul',
      ergebnisse: 'id, modul, zeit',
    });
  }
}

export const db = new TrainerDB();

/** Bittet den Browser, die Daten nicht automatisch zu löschen (wichtig für Safari). */
export async function dauerhaftSpeichern(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function stueckSpeichern(doc: EditorDoc, id?: string): Promise<Stueck> {
  const jetzt = Date.now();
  const alt = id ? await db.stuecke.get(id) : undefined;
  const stueck: Stueck = {
    id: alt?.id ?? neueId(),
    titel: doc.title || 'Ohne Titel',
    doc,
    erstellt: alt?.erstellt ?? jetzt,
    geaendert: jetzt,
  };
  await db.stuecke.put(stueck);
  return stueck;
}

export function alleStuecke(): Promise<Stueck[]> {
  return db.stuecke.orderBy('geaendert').reverse().toArray();
}

export function stueckLoeschen(id: string) {
  return db.stuecke.delete(id);
}

export async function sicherungErstellen(): Promise<Sicherung> {
  const [stuecke, fortschritt, ergebnisse] = await Promise.all([
    db.stuecke.toArray(),
    db.fortschritt.toArray(),
    db.ergebnisse.toArray(),
  ]);
  return { format: 'kt-sicherung', version: 1, erstellt: Date.now(), stuecke, fortschritt, ergebnisse };
}

/** Liest eine Sicherung ein und führt sie mit dem vorhandenen Stand zusammen. */
export async function sicherungEinlesen(data: unknown): Promise<{ stuecke: number; module: number }> {
  const fremd = pruefeSicherung(data);
  const lokal = await sicherungErstellen();
  const merged = zusammenfuehren(lokal, fremd);
  await db.transaction('rw', db.stuecke, db.fortschritt, db.ergebnisse, async () => {
    await db.stuecke.bulkPut(merged.stuecke);
    await db.fortschritt.bulkPut(merged.fortschritt);
    await db.ergebnisse.bulkPut(merged.ergebnisse);
  });
  return { stuecke: fremd.stuecke.length, module: fremd.fortschritt.length };
}

export function alleErgebnisse() {
  return db.ergebnisse.toArray();
}

export function alleFortschritte(): Promise<Fortschritt[]> {
  return db.fortschritt.toArray();
}
