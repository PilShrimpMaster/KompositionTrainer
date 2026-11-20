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
  type StueckVersion,
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
    ...alt,
    id: alt?.id ?? neueId(),
    titel: doc.title || 'Ohne Titel',
    doc,
    erstellt: alt?.erstellt ?? jetzt,
    geaendert: jetzt,
  };
  await db.stuecke.put(stueck);
  return stueck;
}

/** Höchstens so viele Fassungen je Stück; die ältesten fallen weg */
export const MAX_VERSIONEN = 40;

/** Sichert den aktuellen Stand eines Stücks als benannte Fassung */
export async function versionSichern(id: string, doc: EditorDoc, name: string): Promise<Stueck> {
  const s = await db.stuecke.get(id);
  if (!s) throw new Error('Stück nicht gefunden');
  const version: StueckVersion = { id: neueId(), name: name.trim() || `Fassung ${(s.versionen?.length ?? 0) + 1}`, zeit: Date.now(), doc: structuredClone(doc) };
  const versionen = [...(s.versionen ?? []), version].slice(-MAX_VERSIONEN);
  const neu = { ...s, doc, titel: doc.title || s.titel, versionen, geaendert: Date.now() };
  await db.stuecke.put(neu);
  return neu;
}

/** Holt eine Fassung zurück; der bisherige Stand wird vorher selbst als Fassung gesichert */
export async function versionZurueckholen(id: string, versionId: string, aktuell: EditorDoc): Promise<EditorDoc> {
  const v = (await db.stuecke.get(id))?.versionen?.find((x) => x.id === versionId);
  if (!v) throw new Error('Fassung nicht gefunden');
  await versionSichern(id, aktuell, `Stand vor „${v.name}“`);
  const s = (await db.stuecke.get(id))!;
  await db.stuecke.put({ ...s, doc: structuredClone(v.doc), geaendert: Date.now() });
  return structuredClone(v.doc);
}

export async function versionLoeschen(id: string, versionId: string) {
  const s = await db.stuecke.get(id);
  if (s) await db.stuecke.put({ ...s, versionen: (s.versionen ?? []).filter((v) => v.id !== versionId), geaendert: Date.now() });
}

export async function portfolioSetzen(id: string, portfolio: boolean) {
  const s = await db.stuecke.get(id);
  if (s) await db.stuecke.put({ ...s, portfolio, geaendert: Date.now() });
}

/** Nimmt den Stand ins Portfolio auf: speichert das Stück (falls nötig neu) und sichert eine benannte Fassung */
export async function insPortfolio(doc: EditorDoc, id: string | null, name: string): Promise<Stueck> {
  const s = await stueckSpeichern(doc, id ?? undefined);
  await portfolioSetzen(s.id, true);
  return versionSichern(s.id, doc, name);
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
