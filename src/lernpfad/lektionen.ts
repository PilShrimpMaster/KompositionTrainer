import { parseLektion, type Lektion, type Schreibaufgabe } from './lektion';

const dateien = import.meta.glob('./lektionen/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const LEKTIONEN: Lektion[] = Object.entries(dateien).map(([pfad, quelle]) => parseLektion(quelle, pfad));

export function lektionFuer(modul: string): Lektion | undefined {
  return LEKTIONEN.find((l) => l.modul === modul);
}

export function alleAufgaben(): Schreibaufgabe[] {
  return LEKTIONEN.flatMap((l) => l.schritte.flatMap((s) => s.bausteine.flatMap((b) => (b.art === 'aufgabe' ? [b.aufgabe] : []))));
}
