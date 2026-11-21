import { parseAkkordsymbol } from './akkordsymbol';

/** MusicXML-„kind“ zu Akkordsymbol-Zusatz und zurück */
const KIND_SUFFIX: Record<string, string> = {
  major: '',
  minor: 'm',
  augmented: '+',
  diminished: 'dim',
  dominant: '7',
  'major-seventh': 'maj7',
  'minor-seventh': 'm7',
  'diminished-seventh': 'dim7',
  'augmented-seventh': '+7',
  'half-diminished': 'm7b5',
  'major-minor': 'm(maj7)',
  'major-sixth': '6',
  'minor-sixth': 'm6',
  'dominant-ninth': '9',
  'major-ninth': 'maj9',
  'minor-ninth': 'm9',
  'dominant-11th': '11',
  'major-11th': 'maj11',
  'minor-11th': 'm11',
  'dominant-13th': '13',
  'major-13th': 'maj13',
  'minor-13th': 'm13',
  'suspended-second': 'sus2',
  'suspended-fourth': 'sus4',
  power: '5',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function kindVon(suffix: string): string {
  const s = suffix.replace(/Δ/g, 'maj').replace(/^-/, 'm').replace(/ø7?/, 'm7b5');
  // Längster passender Anfang
  let best = 'major';
  let laenge = -1;
  for (const [kind, suf] of Object.entries(KIND_SUFFIX)) {
    if (suf.length > laenge && s.startsWith(suf)) {
      best = kind;
      laenge = suf.length;
    }
  }
  return best;
}

/** <harmony> für ein Akkordsymbol; der genaue Text steht im text-Attribut (MuseScore zeigt ihn so an) */
export function harmonyXml(symbol: string): string {
  const a = parseAkkordsymbol(symbol);
  if (!a) return '';
  const [haupt] = symbol.split(/\/(?=[A-G])/);
  const suffix = haupt.replace(/^[A-G](##|bb|#|b)?/, '');
  const root = `<root><root-step>${a.grund.step}</root-step>${a.grund.alter ? `<root-alter>${a.grund.alter}</root-alter>` : ''}</root>`;
  const bass = a.bass ? `<bass><bass-step>${a.bass.step}</bass-step>${a.bass.alter ? `<bass-alter>${a.bass.alter}</bass-alter>` : ''}</bass>` : '';
  return `<harmony>${root}<kind text="${esc(suffix)}">${kindVon(suffix)}</kind>${bass}</harmony>`;
}

const ALTER_TEXT: Record<string, string> = { '-1': 'b', '1': '#', '0': '' };

/** Liest ein <harmony>-Element als Akkordsymbol; undefined, wenn es nicht lesbar ist */
export function harmonyLesen(el: Element): string | undefined {
  const t = (parent: Element | null | undefined, name: string) => parent?.getElementsByTagName(name)[0]?.textContent?.trim() ?? undefined;
  const rootEl = el.getElementsByTagName('root')[0];
  const step = t(rootEl, 'root-step');
  if (!step) return undefined;
  const alter = Number(t(rootEl, 'root-alter') ?? 0);
  const kindEl = el.getElementsByTagName('kind')[0];
  const kind = kindEl?.textContent?.trim() ?? 'major';
  if (kind === 'none') return undefined;
  let suffix = kindEl?.getAttribute('text') ?? KIND_SUFFIX[kind] ?? '';
  // Hinzugefügte und veränderte Töne nur, wenn kein eigener Text da ist
  if (!kindEl?.hasAttribute('text')) {
    for (const d of Array.from(el.getElementsByTagName('degree'))) {
      const wert = t(d, 'degree-value');
      const a = t(d, 'degree-alter') ?? '0';
      const typ = t(d, 'degree-type');
      if (!wert || typ === 'subtract') continue;
      suffix += typ === 'add' && a === '0' ? `add${wert}` : `${ALTER_TEXT[a] ?? ''}${wert}`;
    }
  }
  const bassEl = el.getElementsByTagName('bass')[0];
  const bassStep = t(bassEl, 'bass-step');
  const bassAlter = Number(t(bassEl, 'bass-alter') ?? 0);
  const ton = (s: string, a: number) => `${s}${a === 1 ? '#' : a === -1 ? 'b' : ''}`;
  const symbol = `${ton(step, alter)}${suffix}${bassStep ? `/${ton(bassStep, bassAlter)}` : ''}`;
  return parseAkkordsymbol(symbol) ? symbol : undefined;
}
