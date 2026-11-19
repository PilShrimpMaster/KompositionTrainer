import { diatonicIndex, germanNameWithOctave, toMidi } from '../model/pitch';
import type { Pitch, Score } from '../model/types';
import { klaenge, type Klang } from './klaenge';
import { erkenneAkkord, istLeitton, type Akkord } from './akkorde';
import { intervall, intervallName } from '../uebungen/theorie';

export type BefundArt = 'fehler' | 'hinweis';

export interface Befund {
  regel: string;
  art: BefundArt;
  /** Ein Satz Erklärung */
  text: string;
  /** Noten, die markiert werden */
  ids: string[];
  /** Takt ab 1 */
  takt: number;
  /** Bei zusammengefassten Befunden: letzter Takt und Anzahl der Stellen */
  bisTakt?: number;
  anzahl?: number;
}

export interface Regel {
  id: string;
  titel: string;
  /** Lexikon-Eintrag mit der Erklärung */
  begriff: string;
  pruefe: (ctx: Kontext) => Befund[];
}

export interface Kontext {
  score: Score;
  klaenge: Klang[];
  namen: string[];
  /** Erkannter Akkord je Zusammenklang */
  akkorde: (Akkord | null)[];
}

const halbtoene = (a: Pitch, b: Pitch) => toMidi(a) - toMidi(b);
const stufen = (a: Pitch, b: Pitch) => diatonicIndex(a) - diatonicIndex(b);

/** Reine Quinte (auch über mehrere Oktaven) */
const istQuinte = (o: Pitch, u: Pitch) => {
  const h = halbtoene(o, u);
  return h > 0 && h % 12 === 7 && stufen(o, u) % 7 === 4;
};
/** Oktave oder Einklang (auch über mehrere Oktaven) */
const istOktave = (o: Pitch, u: Pitch) => {
  const h = halbtoene(o, u);
  return h >= 0 && h % 12 === 0 && stufen(o, u) % 7 === 0;
};
const gleich = (a: Pitch, b: Pitch) => toMidi(a) === toMidi(b);
const ids = (...xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))];

/** Paare benachbarter Klänge, in denen beide Stimmen klingen */
function* schritte(ctx: Kontext) {
  for (let i = 1; i < ctx.klaenge.length; i++) yield [ctx.klaenge[i - 1], ctx.klaenge[i]] as const;
}

function* paare(n: number) {
  for (let o = 0; o < n; o++) for (let u = o + 1; u < n; u++) yield [o, u] as const;
}

const parallelen: Regel = {
  id: 'parallelen',
  titel: 'Quint- und Oktavparallelen',
  begriff: 'quintparallele',
  pruefe(ctx) {
    const out: Befund[] = [];
    for (const [a, b] of schritte(ctx)) {
      for (const [o, u] of paare(ctx.namen.length)) {
        const [ao, au, bo, bu] = [a.toene[o], a.toene[u], b.toene[o], b.toene[u]];
        if (!ao || !au || !bo || !bu) continue;
        if (gleich(ao, bo) || gleich(au, bu)) continue; // eine Stimme bleibt liegen
        const art = istQuinte(ao, au) && istQuinte(bo, bu) ? 'Quint' : istOktave(ao, au) && istOktave(bo, bu) ? 'Oktav' : null;
        if (!art) continue;
        const gegen = Math.sign(halbtoene(bo, ao)) !== Math.sign(halbtoene(bu, au));
        out.push({
          regel: 'parallelen',
          art: 'fehler',
          text: gegen
            ? `${art}parallele in Gegenbewegung zwischen ${ctx.namen[o]} und ${ctx.namen[u]}. Auch so verlieren die beiden Stimmen ihre Selbstständigkeit.`
            : `${art}parallele zwischen ${ctx.namen[o]} und ${ctx.namen[u]}: Beide Stimmen bewegen sich im ${art === 'Quint' ? 'Quint' : 'Oktav'}abstand und klingen wie eine.`,
          ids: ids(a.ids[o], a.ids[u], b.ids[o], b.ids[u]),
          takt: b.takt + 1,
        });
      }
    }
    return out;
  },
};

const verdeckte: Regel = {
  id: 'verdeckte-parallelen',
  titel: 'Verdeckte Quinten und Oktaven',
  begriff: 'verdeckte-parallele',
  pruefe(ctx) {
    const n = ctx.namen.length;
    if (n < 3) return [];
    const out: Befund[] = [];
    for (const [a, b] of schritte(ctx)) {
      const [ao, au, bo, bu] = [a.toene[0], a.toene[n - 1], b.toene[0], b.toene[n - 1]];
      if (!ao || !au || !bo || !bu || gleich(ao, bo) || gleich(au, bu)) continue;
      const richtung = Math.sign(halbtoene(bo, ao));
      if (richtung !== Math.sign(halbtoene(bu, au))) continue;
      const ziel = istQuinte(bo, bu) ? 'Quinte' : istOktave(bo, bu) ? 'Oktave' : null;
      if (!ziel) continue;
      if ((ziel === 'Quinte' && istQuinte(ao, au)) || (ziel === 'Oktave' && istOktave(ao, au))) continue; // schon offene Parallele
      if (Math.abs(stufen(bo, ao)) <= 1) continue; // Sopran im Schritt: erlaubt
      out.push({
        regel: 'verdeckte-parallelen',
        art: 'fehler',
        text: `Verdeckte ${ziel} zwischen ${ctx.namen[0]} und ${ctx.namen[n - 1]}: Beide Außenstimmen gehen in dieselbe Richtung in eine ${ziel}, der ${ctx.namen[0]} springt. Erlaubt wäre es, wenn der ${ctx.namen[0]} schrittweise geht.`,
        ids: ids(a.ids[0], a.ids[n - 1], b.ids[0], b.ids[n - 1]),
        takt: b.takt + 1,
      });
    }
    return out;
  },
};

/** Übliche Stimmumfänge im Chorsatz (MIDI) */
export const UMFANG: [number, number][] = [
  [60, 81], // Sopran c′–a″
  [55, 74], // Alt g–d″
  [48, 67], // Tenor c–g′
  [40, 62], // Bass E–d′
];

const UMFANG_TEXT = ['c′ bis a″', 'g bis d″', 'c bis g′', 'E bis d′'];

const umfang: Regel = {
  id: 'umfang',
  titel: 'Stimmumfang',
  begriff: 'stimmumfang',
  pruefe(ctx) {
    if (ctx.namen.length !== 4) return [];
    const out: Befund[] = [];
    for (const k of ctx.klaenge) {
      k.toene.forEach((p, v) => {
        if (!p || !k.neu[v]) return;
        const m = toMidi(p);
        const [lo, hi] = UMFANG[v];
        if (m >= lo && m <= hi) return;
        out.push({
          regel: 'umfang',
          art: 'fehler',
          text: `${ctx.namen[v]} zu ${m > hi ? 'hoch' : 'tief'}: ${germanNameWithOctave(p)} liegt außerhalb des üblichen Umfangs (${UMFANG_TEXT[v]}).`,
          ids: ids(k.ids[v]),
          takt: k.takt + 1,
        });
      });
    }
    return out;
  },
};

const abstand: Regel = {
  id: 'abstand',
  titel: 'Abstand der Stimmen',
  begriff: 'stimmabstand',
  pruefe(ctx) {
    const n = ctx.namen.length;
    const out: Befund[] = [];
    for (const k of ctx.klaenge) {
      for (let o = 0; o < n - 1; o++) {
        const u = o + 1;
        const [po, pu] = [k.toene[o], k.toene[u]];
        if (!po || !pu || (!k.neu[o] && !k.neu[u])) continue;
        const h = halbtoene(po, pu);
        const unten = u === n - 1 && n >= 3;
        if (unten ? h <= 19 : h <= 12) continue;
        out.push({
          regel: 'abstand',
          art: unten ? 'hinweis' : 'fehler',
          text: unten
            ? `${ctx.namen[o]} und ${ctx.namen[u]} liegen mehr als eine Duodezime auseinander. Das ist erlaubt, klingt aber leicht hohl.`
            : `${ctx.namen[o]} und ${ctx.namen[u]} liegen mehr als eine Oktave auseinander. Zwischen den oberen Stimmen sollte höchstens eine Oktave liegen.`,
          ids: ids(k.ids[o], k.ids[u]),
          takt: k.takt + 1,
        });
      }
    }
    return out;
  },
};

const kreuzung: Regel = {
  id: 'kreuzung',
  titel: 'Stimmkreuzung und Stimmüberschreitung',
  begriff: 'stimmkreuzung',
  pruefe(ctx) {
    const n = ctx.namen.length;
    const out: Befund[] = [];
    ctx.klaenge.forEach((k, i) => {
      for (let o = 0; o < n - 1; o++) {
        const u = o + 1;
        const [po, pu] = [k.toene[o], k.toene[u]];
        if (po && pu && (k.neu[o] || k.neu[u]) && toMidi(pu) > toMidi(po)) {
          out.push({
            regel: 'kreuzung',
            art: 'fehler',
            text: `Stimmkreuzung: Der ${ctx.namen[u]} liegt über dem ${ctx.namen[o]}. Das Ohr verliert dann die Stimmen aus den Augen.`,
            ids: ids(k.ids[o], k.ids[u]),
            takt: k.takt + 1,
          });
          continue;
        }
        const vorher = ctx.klaenge[i - 1];
        if (!vorher) continue;
        const [vo, vu] = [vorher.toene[o], vorher.toene[u]];
        const hoch = k.neu[u] && pu && vo && toMidi(pu) > toMidi(vo);
        const tief = k.neu[o] && po && vu && toMidi(po) < toMidi(vu);
        if (hoch || tief) {
          out.push({
            regel: 'kreuzung',
            art: 'hinweis',
            text: hoch
              ? `Stimmüberschreitung: Der ${ctx.namen[u]} geht über den vorigen Ton im ${ctx.namen[o]} hinaus.`
              : `Stimmüberschreitung: Der ${ctx.namen[o]} geht unter den vorigen Ton im ${ctx.namen[u]}.`,
            ids: ids(hoch ? k.ids[u] : k.ids[o], hoch ? vorher.ids[o] : vorher.ids[u]),
            takt: k.takt + 1,
          });
        }
      }
    });
    return out;
  },
};

const vollstaendig = (k: Klang) => k.toene.every(Boolean) && k.neu.some(Boolean);

const verdopplung: Regel = {
  id: 'verdopplung',
  titel: 'Verdopplung',
  begriff: 'verdopplung',
  pruefe(ctx) {
    const out: Befund[] = [];
    const key = ctx.score.key;
    ctx.klaenge.forEach((k, i) => {
      if (!vollstaendig(k)) return;
      const lt = k.toene.map((p, v) => (p && istLeitton(p, key) ? v : -1)).filter((v) => v >= 0);
      if (lt.length > 1) {
        out.push({
          regel: 'verdopplung',
          art: 'fehler',
          text: `Leitton verdoppelt (${lt.map((v) => ctx.namen[v]).join(' und ')}): Beide Stimmen wollen aufwärts zum Grundton und laufen dann in Oktaven.`,
          ids: ids(...lt.map((v) => k.ids[v])),
          takt: k.takt + 1,
        });
        return;
      }
      const a = ctx.akkorde[i];
      if (!a || a.art !== 'Dur' || a.sept) return;
      const terzen = a.rollen.map((r, v) => (r === 3 ? v : -1)).filter((v) => v >= 0);
      if (terzen.length < 2) return;
      const vorher = ctx.akkorde[i - 1];
      if (a.stufe === 6 && vorher?.stufe === 5) return; // Trugschluss: Terzverdopplung üblich
      out.push({
        regel: 'verdopplung',
        art: 'hinweis',
        text: `Terz verdoppelt in ${a.name}: Im Durdreiklang klingt das dick. Verdopple lieber den Grundton.`,
        ids: ids(...terzen.map((v) => k.ids[v])),
        takt: k.takt + 1,
      });
    });
    return out;
  },
};

const leittonAufloesung: Regel = {
  id: 'leitton',
  titel: 'Auflösung des Leittons',
  begriff: 'leitton',
  pruefe(ctx) {
    const out: Befund[] = [];
    const key = ctx.score.key;
    const n = ctx.namen.length;
    ctx.klaenge.forEach((b, i) => {
      const a = ctx.klaenge[i - 1];
      const aa = ctx.akkorde[i - 1];
      const ba = ctx.akkorde[i];
      if (!a || !aa || !ba) return;
      const dominantisch = aa.stufe === 5 || (aa.stufe === 7 && aa.art === 'vermindert');
      if (!dominantisch || (ba.stufe !== 1 && ba.stufe !== 6)) return;
      a.toene.forEach((p, v) => {
        const q = b.toene[v];
        if (!p || !q || !istLeitton(p, key) || toMidi(p) === toMidi(q)) return;
        if (stufen(q, p) === 1 && halbtoene(q, p) === 1) return; // sauber aufgelöst
        const aussen = v === 0 || v === n - 1;
        out.push({
          regel: 'leitton',
          art: aussen ? 'fehler' : 'hinweis',
          text: aussen
            ? `Der Leitton im ${ctx.namen[v]} löst sich nicht aufwärts zum Grundton auf. In einer Außenstimme hört man das deutlich.`
            : `Der Leitton im ${ctx.namen[v]} geht nicht zum Grundton (freier Leitton). In Mittelstimmen ist das erlaubt, wenn der Klang dadurch vollständig wird.`,
          ids: ids(a.ids[v], b.ids[v]),
          takt: b.takt + 1,
        });
      });
    });
    return out;
  },
};

const septime: Regel = {
  id: 'septime',
  titel: 'Auflösung der Septime',
  begriff: 'septakkord',
  pruefe(ctx) {
    const out: Befund[] = [];
    ctx.klaenge.forEach((b, i) => {
      const a = ctx.klaenge[i - 1];
      const aa = ctx.akkorde[i - 1];
      if (!a || !aa?.sept) return;
      aa.rollen.forEach((r, v) => {
        const p = a.toene[v];
        const q = b.toene[v];
        if (r !== 7 || !p || !q || toMidi(p) === toMidi(q)) return;
        if (stufen(q, p) === -1) return; // Sekunde abwärts: richtig
        out.push({
          regel: 'septime',
          art: 'fehler',
          text: `Die Septime von ${aa.name} im ${ctx.namen[v]} sollte sich einen Schritt abwärts auflösen, hier geht sie ${halbtoene(q, p) > 0 ? 'aufwärts' : 'im Sprung abwärts'}.`,
          ids: ids(a.ids[v], b.ids[v]),
          takt: b.takt + 1,
        });
      });
    });
    return out;
  },
};

const spruenge: Regel = {
  id: 'spruenge',
  titel: 'Melodische Sprünge',
  begriff: 'sprung',
  pruefe(ctx) {
    const out: Befund[] = [];
    ctx.namen.forEach((name, v) => {
      let vorher: { p: Pitch; id: string | null } | null = null;
      for (const k of ctx.klaenge) {
        const p = k.toene[v];
        if (!k.neu[v]) continue;
        if (!p) {
          vorher = null;
          continue;
        }
        if (vorher && toMidi(vorher.p) !== toMidi(p)) {
          const iv = intervall(vorher.p, p);
          const weit = Math.abs(halbtoene(p, vorher.p));
          let befund: { art: BefundArt; text: string } | null = null;
          if (weit > 12) befund = { art: 'fehler', text: `Sprung größer als eine Oktave im ${name}. Das ist schwer zu singen.` };
          else if (iv.qualitaet.includes('übermäßig') && iv.nummer !== 8)
            befund = { art: 'fehler', text: `${intervallName(iv)[0].toUpperCase()}${intervallName(iv).slice(1)} im ${name}: Übermäßige Schritte sind schwer zu treffen und klingen fremd.` };
          else if (iv.nummer === 7) befund = { art: 'hinweis', text: `Septimsprung im ${name}: Das ist schwer zu singen, besser vermeiden.` };
          if (befund) out.push({ regel: 'spruenge', ...befund, ids: ids(vorher.id, k.ids[v]), takt: k.takt + 1 });
        }
        vorher = { p, id: k.ids[v] };
      }
    });
    return out;
  },
};

export const REGELN: Regel[] = [parallelen, verdeckte, umfang, abstand, kreuzung, verdopplung, leittonAufloesung, septime, spruenge];

export interface PruefOptionen {
  /** Stilhinweise mitprüfen (ab Stufe 6 abschaltbar) */
  hinweise?: boolean;
}

/** Prüft einen mehrstimmigen Satz; Stimmen von oben nach unten (Sopran zuerst) */
export function pruefeSatz(score: Score, opts: PruefOptionen = {}): Befund[] {
  const k = klaenge(score);
  const ctx: Kontext = { score, klaenge: k, namen: score.voices.map((v) => v.name), akkorde: k.map((x) => erkenneAkkord(x.toene, score.key)) };
  const alle = REGELN.flatMap((r) => r.pruefe(ctx));
  const gesehen = new Set<string>();
  return alle
    .filter((b) => opts.hinweise !== false || b.art === 'fehler')
    .filter((b) => {
      const key = `${b.regel}|${b.text}|${b.ids.join(',')}`;
      if (gesehen.has(key)) return false;
      gesehen.add(key);
      return true;
    })
    .sort((a, b) => a.takt - b.takt || (a.art === b.art ? 0 : a.art === 'fehler' ? -1 : 1))
    .reduce<Befund[]>(zusammenfassen, []);
}

/** Gleiche Befunde in aufeinanderfolgenden Klängen (z. B. lange zu weite Lage) zu einem zusammenfassen */
function zusammenfassen(out: Befund[], b: Befund): Befund[] {
  const gleich = out.find((x) => x.regel === b.regel && x.text === b.text && (x.bisTakt ?? x.takt) >= b.takt - 1);
  if (!gleich) return [...out, b];
  gleich.ids = [...new Set([...gleich.ids, ...b.ids])];
  gleich.bisTakt = Math.max(gleich.bisTakt ?? gleich.takt, b.takt);
  gleich.anzahl = (gleich.anzahl ?? 1) + 1;
  return out;
}

export function regel(id: string): Regel | undefined {
  return REGELN.find((r) => r.id === id);
}
