import type { EditorDoc } from '../editor/rebar';

export type ModulStatus = 'offen' | 'begonnen' | 'sicher' | 'uebersprungen';

export interface Stueck {
  id: string;
  titel: string;
  doc: EditorDoc;
  erstellt: number;
  geaendert: number;
  /** Gesicherte Fassungen, älteste zuerst */
  versionen?: StueckVersion[];
  /** Fertiges Werk im Portfolio */
  portfolio?: boolean;
}

/** Mehrsätziges Werk: eine geordnete Folge von Stücken (Sätzen) */
export interface Werk {
  id: string;
  titel: string;
  /** Stück-Ids in der Reihenfolge der Sätze */
  saetze: string[];
  erstellt: number;
  geaendert: number;
}

export interface StueckVersion {
  id: string;
  name: string;
  zeit: number;
  doc: EditorDoc;
}

export interface Fortschritt {
  modul: string;
  status: ModulStatus;
  /** Sicherheit 0–1, aus den letzten Übungsergebnissen */
  sicherheit: number;
  geaendert: number;
}

export interface Ergebnis {
  id: string;
  modul: string;
  uebung: string;
  richtig: boolean;
  zeit: number;
}

export interface Sicherung {
  format: 'kt-sicherung';
  version: 1;
  erstellt: number;
  stuecke: Stueck[];
  fortschritt: Fortschritt[];
  ergebnisse: Ergebnis[];
  /** Ältere Sicherungen haben noch keine Werke */
  werke?: Werk[];
}

export function neueId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Prüft eine eingelesene Sicherungsdatei; wirft mit deutscher Meldung, wenn sie unbrauchbar ist. */
export function pruefeSicherung(data: unknown): Sicherung {
  const d = data as Partial<Sicherung>;
  if (!d || d.format !== 'kt-sicherung') throw new Error('Das ist keine Sicherung des KompositionsTrainers.');
  if (d.version !== 1) throw new Error(`Unbekannte Version der Sicherung (${String(d.version)}).`);
  if (!Array.isArray(d.stuecke) || !Array.isArray(d.fortschritt) || !Array.isArray(d.ergebnisse))
    throw new Error('Die Sicherung ist unvollständig.');
  return d as Sicherung;
}

/**
 * Führt zwei Stände zusammen, z. B. iPad und PC: Bei Stücken und Fortschritt
 * gewinnt der jeweils neuere Eintrag, Übungsergebnisse werden vereinigt.
 */
export function zusammenfuehren(
  lokal: Omit<Sicherung, 'format' | 'version' | 'erstellt'>,
  fremd: Omit<Sicherung, 'format' | 'version' | 'erstellt'>,
) {
  const neuer = <T, K extends keyof T>(a: T[], b: T[], key: K, zeit: (t: T) => number) => {
    const map = new Map<unknown, T>();
    for (const x of a) map.set(x[key], x);
    for (const x of b) {
      const cur = map.get(x[key]);
      if (!cur || zeit(x) > zeit(cur)) map.set(x[key], x);
    }
    return [...map.values()];
  };
  return {
    stuecke: neuer(lokal.stuecke, fremd.stuecke, 'id', (s) => s.geaendert),
    fortschritt: neuer(lokal.fortschritt, fremd.fortschritt, 'modul', (f) => f.geaendert),
    ergebnisse: neuer(lokal.ergebnisse, fremd.ergebnisse, 'id', (e) => e.zeit),
    werke: neuer(lokal.werke ?? [], fremd.werke ?? [], 'id', (w) => w.geaendert),
  };
}

/** Sätze eines Werks als Stücke, in Reihenfolge; gelöschte Stücke fallen heraus */
export function werkSaetze(werk: Werk, stuecke: Stueck[]): Stueck[] {
  const map = new Map(stuecke.map((s) => [s.id, s]));
  return werk.saetze.flatMap((id) => map.get(id) ?? []);
}

/** Verschiebt den Satz an Position i um d Plätze (−1 nach oben, +1 nach unten) */
export function satzVerschieben(saetze: string[], i: number, d: number): string[] {
  const j = i + d;
  if (i < 0 || i >= saetze.length || j < 0 || j >= saetze.length) return saetze;
  const a = saetze.slice();
  [a[i], a[j]] = [a[j], a[i]];
  return a;
}
