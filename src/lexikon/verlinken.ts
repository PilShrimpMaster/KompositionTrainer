import { EINTRAEGE } from './lexikon';

export type Segment = string | { text: string; id: string };

interface Begriff {
  wort: string;
  id: string;
}

/** Titel und Synonyme ab 4 Buchstaben; kurze Kürzel wie „D“ oder „T“ würden zu viel treffen */
const BEGRIFFE: Begriff[] = EINTRAEGE.flatMap((e) => [e.titel, ...e.synonyme].filter((w) => w.length >= 4).map((wort) => ({ wort, id: e.id }))).sort(
  (a, b) => b.wort.length - a.wort.length,
);

const NACH_WORT = new Map(BEGRIFFE.map((b) => [b.wort.toLowerCase(), b.id]));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Längste Begriffe zuerst, mit üblichen Endungen (Intervalle, Tonarten, Taktes) */
const MUSTER = new RegExp(`(?<![\\p{L}\\d])(${BEGRIFFE.map((b) => escape(b.wort)).join('|')})(e|en|n|s|es|er)?(?![\\p{L}\\d])`, 'giu');

/**
 * Zerlegt einen Text in normale Stücke und Lexikon-Verweise.
 * Jeder Eintrag wird nur einmal verlinkt (`schon` wird dabei ergänzt).
 */
export function verlinkeText(text: string, schon: Set<string> = new Set(), ausser?: string): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const m of text.matchAll(MUSTER)) {
    const id = NACH_WORT.get(m[1].toLowerCase());
    if (!id || id === ausser || schon.has(id)) continue;
    schon.add(id);
    if (m.index > pos) out.push(text.slice(pos, m.index));
    out.push({ text: m[0], id });
    pos = m.index + m[0].length;
  }
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}

const NICHT_VERLINKEN = new Set(['A', 'H1', 'H2', 'H3', 'H4', 'CODE', 'PRE', 'BUTTON']);

/** Verlinkt Fachbegriffe in einem bereits gerenderten HTML-Bereich */
export function verlinkeDom(root: HTMLElement, schon: Set<string> = new Set(), ausser?: string) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      for (let el = n.parentElement; el && el !== root; el = el.parentElement) {
        if (NICHT_VERLINKEN.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const knoten: Text[] = [];
  while (walker.nextNode()) knoten.push(walker.currentNode as Text);
  for (const t of knoten) {
    const teile = verlinkeText(t.data, schon, ausser);
    if (teile.length === 1 && typeof teile[0] === 'string') continue;
    const frag = document.createDocumentFragment();
    for (const s of teile) {
      if (typeof s === 'string') frag.append(s);
      else {
        const a = document.createElement('a');
        a.href = `#lexikon/${s.id}`;
        a.dataset.lexikon = s.id;
        a.className = 'lexikon-link';
        a.textContent = s.text;
        frag.append(a);
      }
    }
    t.replaceWith(frag);
  }
}

/** Klicks auf Verweise abfangen: automatische (data-lexikon) und geschriebene `[Text](lexikon:id)` */
export function lexikonZiel(ev: MouseEvent): string | null {
  const a = (ev.target as HTMLElement).closest?.('a');
  if (!a) return null;
  if (a.dataset.lexikon) return a.dataset.lexikon;
  const href = a.getAttribute('href') ?? '';
  return href.startsWith('lexikon:') ? href.slice('lexikon:'.length) : null;
}
