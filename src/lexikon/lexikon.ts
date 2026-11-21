import MiniSearch from 'minisearch';
import { parseEintrag, type Eintrag } from './parse';

export type { Eintrag, Kategorie } from './parse';
export { KATEGORIEN } from './parse';

const dateien = import.meta.glob('./eintraege/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const EINTRAEGE: Eintrag[] = Object.entries(dateien)
  .map(([pfad, quelle]) => parseEintrag(quelle, pfad))
  .sort((a, b) => a.titel.localeCompare(b.titel, 'de'));

const NACH_ID = new Map(EINTRAEGE.map((e) => [e.id, e]));

export function eintrag(id: string): Eintrag | undefined {
  return NACH_ID.get(id);
}

/** Kleinschreibung, Umlaute und Akzente vereinfachen, damit „ubermassig“ auch „übermäßig“ findet */
export function normalisiere(s: string): string {
  return s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function klartext(md: string): string {
  return md.replace(/[*_`#|>[\]()-]/g, ' ');
}

const suche = new MiniSearch<Eintrag & { synonymText: string; klartext: string }>({
  fields: ['titel', 'synonymText', 'kurz', 'klartext'],
  storeFields: ['id'],
  processTerm: (t) => normalisiere(t),
  searchOptions: {
    boost: { titel: 4, synonymText: 3, kurz: 1.5 },
    prefix: true,
    fuzzy: 0.3,
    combineWith: 'AND',
  },
});
suche.addAll(EINTRAEGE.map((e) => ({ ...e, synonymText: e.synonyme.join(' '), klartext: klartext(e.text) })));

/** Fehlertolerante Suche über Titel, Synonyme, Kurzdefinition und Text */
export function sucheEintraege(anfrage: string): Eintrag[] {
  const q = anfrage.trim();
  if (!q) return EINTRAEGE;
  // Genaue Treffer im Titel oder in den Synonymen zuerst („Tritonus“ vor „Tritonus-Substitution“)
  const n = normalisiere(q);
  const genau = (e: Eintrag) => (normalisiere(e.titel) === n || e.synonyme.some((x) => normalisiere(x) === n) ? 0 : 1);
  return suche
    .search(q)
    .map((r) => NACH_ID.get(r.id as string)!)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => genau(a.e) - genau(b.e) || a.i - b.i)
    .map((x) => x.e);
}
