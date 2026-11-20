import { measureLength, quarterLength } from '../model/duration';
import { diatonicIndex, germanNameWithOctave, keyAlter, toMidi } from '../model/pitch';
import type { Pitch, Score } from '../model/types';
import { klaenge, type Klang } from '../satz/klaenge';
import { zusammenfassen, type Befund, type BefundArt } from '../satz/regeln';
import { intervall, intervallName } from '../uebungen/theorie';

/**
 * Zweistimmiger Gattungskontrapunkt nach Johann Joseph Fux („Gradus ad Parnassum“, 1725).
 * Eine Stimme ist der Cantus firmus (ganze Noten), die andere die Gegenstimme (Kontrapunkt).
 */
export type Gattung = 1 | 2 | 3 | 4 | 5;

export const GATTUNGEN: Record<Gattung, { name: string; kurz: string }> = {
  1: { name: '1. Gattung: Note gegen Note', kurz: 'eine Ganze gegen jede Ganze' },
  2: { name: '2. Gattung: zwei gegen eine', kurz: 'zwei Halbe gegen jede Ganze' },
  3: { name: '3. Gattung: vier gegen eine', kurz: 'vier Viertel gegen jede Ganze' },
  4: { name: '4. Gattung: Synkopen', kurz: 'übergebundene Halbe (Synkopen) gegen jede Ganze' },
  5: { name: '5. Gattung: floride', kurz: 'gemischte Notenwerte' },
};

export interface KpOptionen {
  gattung: Gattung;
  /** Welche Stimme der Cantus firmus ist: 0 = oben, 1 = unten */
  cf: 0 | 1;
  hinweise?: boolean;
}

export interface KpRegel {
  id: string;
  titel: string;
  begriff: string;
}

export const KP_REGELN: KpRegel[] = [
  { id: 'kp-rhythmus', titel: 'Rhythmus der Gattung', begriff: 'gattungskontrapunkt' },
  { id: 'kp-konsonanz', titel: 'Konsonanzen und Dissonanzen', begriff: 'konsonanz-dissonanz' },
  { id: 'kp-durchgang', titel: 'Durchgang und Wechselnote', begriff: 'durchgang' },
  { id: 'kp-vorhalt', titel: 'Synkopendissonanz (Vorhalt)', begriff: 'vorhalt' },
  { id: 'kp-anfang', titel: 'Anfang', begriff: 'gattungskontrapunkt' },
  { id: 'kp-schluss', titel: 'Schluss (Clausula)', begriff: 'clausula' },
  { id: 'kp-parallelen', titel: 'Parallelen', begriff: 'quintparallele' },
  { id: 'kp-verdeckt', titel: 'Verdeckte Parallelen', begriff: 'verdeckte-parallele' },
  { id: 'kp-einklang', titel: 'Einklang', begriff: 'gattungskontrapunkt' },
  { id: 'kp-bewegung', titel: 'Bewegungsarten', begriff: 'bewegungsarten' },
  { id: 'kp-melodik', titel: 'Melodik der Gegenstimme', begriff: 'sprung' },
  { id: 'kp-hoehepunkt', titel: 'Höhepunkt', begriff: 'hoehepunkt' },
  { id: 'kp-abstand', titel: 'Abstand und Kreuzung', begriff: 'stimmkreuzung' },
  { id: 'kp-leiter', titel: 'Leitereigene Töne', begriff: 'kirchentonarten' },
];

export const kpRegel = (id: string) => KP_REGELN.find((r) => r.id === id);

/* ---------- Intervalle ---------- */

const halb = (a: Pitch, b: Pitch) => toMidi(a) - toMidi(b);
const stufen = (a: Pitch, b: Pitch) => diatonicIndex(a) - diatonicIndex(b);
const gleich = (a: Pitch, b: Pitch) => toMidi(a) === toMidi(b);

/** Konsonanz im zweistimmigen Satz: Einklang, Oktave, Quinte (rein), Terzen, Sexten (groß/klein) */
export function konsonant(a: Pitch, b: Pitch): boolean {
  const iv = intervall(a, b);
  if (iv.nummer === 1 || iv.nummer === 8 || iv.nummer === 5) return iv.qualitaet === 'rein';
  if (iv.nummer === 3 || iv.nummer === 6) return iv.qualitaet === 'groß' || iv.qualitaet === 'klein';
  return false;
}

/** Vollkommene Konsonanz: Einklang, Quinte, Oktave (auch über Oktaven) */
export function vollkommen(a: Pitch, b: Pitch): boolean {
  const iv = intervall(a, b);
  return (iv.nummer === 1 || iv.nummer === 5 || iv.nummer === 8) && iv.qualitaet === 'rein';
}

const ivName = (a: Pitch, b: Pitch) => {
  const iv = intervall(a, b);
  const n = intervallName(iv);
  return Math.abs(stufen(a, b)) >= 7 && iv.nummer !== 8 ? `${n} (über die Oktave)` : n;
};
const gross = (s: string) => s[0].toUpperCase() + s.slice(1);
/** „große Terz“ → „einer großen Terz“ */
const mitEiner = (name: string) => `einer ${name.replace(/^(\S+)e /, '$1en ')}`;
const istSchritt = (a: Pitch, b: Pitch) => Math.abs(stufen(b, a)) === 1;

/* ---------- Ablauf ---------- */

interface Ton {
  p: Pitch | null;
  id: string;
  start: number;
  ende: number;
  takt: number;
}

/** Die Töne einer Stimme mit Anfangs- und Endzeit (Bögen zusammengefasst) */
function toene(score: Score, v: number): Ton[] {
  const out: Ton[] = [];
  let zeit = 0;
  let gebunden = false;
  score.voices[v].measures.forEach((m, mi) =>
    m.notes.forEach((n, ni) => {
      const l = quarterLength(n.duration);
      const letzte = out[out.length - 1];
      if (gebunden && n.pitch && letzte?.p && gleich(letzte.p, n.pitch)) letzte.ende = zeit + l;
      else out.push({ p: n.pitch ?? null, id: `${v}-${mi}-${ni}`, start: zeit, ende: zeit + l, takt: mi });
      gebunden = !!n.tie && !!n.pitch;
      zeit += l;
    }),
  );
  return out;
}

const idsVon = (...xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))];

export function pruefeKontrapunkt(score: Score, opts: KpOptionen): Befund[] {
  if (score.voices.length !== 2) return [];
  const { gattung } = opts;
  const cfV = opts.cf;
  const kpV = (1 - cfV) as 0 | 1;
  const kpOben = kpV === 0;
  const takt = measureLength(score.time);
  const cf = toene(score, cfV).filter((t) => t.p);
  const kp = toene(score, kpV);
  const kpNoten = kp.filter((t): t is Ton & { p: Pitch } => !!t.p);
  const ks = klaenge(score);
  const out: Befund[] = [];
  const add = (regel: string, art: BefundArt, text: string, ids: string[], t: number) => out.push({ regel, art, text, ids, takt: t + 1 });
  if (cf.length < 2 || kpNoten.length < 2) return [];

  const oben = (k: Klang) => k.toene[0];
  const unten = (k: Klang) => k.toene[1];
  const betont = (zeit: number) => Math.abs(zeit / takt - Math.round(zeit / takt)) < 1e-6;
  const letzterTakt = Math.max(...cf.map((t) => t.takt));
  const finalis = cf[cf.length - 1].p!;

  /* Rhythmus der Gattung */
  const erwartet: Record<Gattung, number | null> = { 1: 1, 2: 2, 3: 4, 4: null, 5: null };
  const anzahl = erwartet[gattung];
  score.voices[kpV].measures.forEach((m, mi) => {
    if (mi >= letzterTakt) return; // Schlusston darf eine Ganze sein
    const n = m.notes.length;
    const nurPauseDavor = mi === 0 && m.notes[0] && !m.notes[0].pitch;
    const vorletzterGanz = mi === letzterTakt - 1 && n === 1 && (gattung === 2 || gattung === 3);
    if (anzahl && n !== anzahl && !vorletzterGanz && !(nurPauseDavor && n === anzahl)) {
      add('kp-rhythmus', 'fehler', `In der ${GATTUNGEN[gattung].name.split(':')[0]} stehen ${GATTUNGEN[gattung].kurz}; hier sind es ${n} Noten.`, idsVon(`${kpV}-${mi}-0`), mi);
    }
    if (gattung === 4 && mi > 0 && mi < letzterTakt - 1) {
      const vorher = score.voices[kpV].measures[mi - 1].notes;
      if (!vorher[vorher.length - 1]?.tie) add('kp-rhythmus', 'hinweis', 'In der 4. Gattung wird die zweite Halbe meist über den Taktstrich gebunden (Synkope).', idsVon(`${kpV}-${mi - 1}-${vorher.length - 1}`), mi);
    }
  });

  /* Konsonanz und Dissonanzbehandlung */
  const kpIndex = (id: string | null) => kpNoten.findIndex((t) => t.id === id);
  for (const k of ks) {
    const o = oben(k);
    const u = unten(k);
    if (!o || !u) continue;
    if (konsonant(o, u)) continue;
    const name = ivName(o, u);
    const kpId = k.ids[kpV];
    const i = kpIndex(kpId);
    const ton = kpNoten[i];
    if (!ton) continue;
    const vor = kpNoten[i - 1];
    const nach = kpNoten[i + 1];
    const ids = idsVon(k.ids[0], k.ids[1]);
    const synkopiert = !k.neu[kpV]; // Gegenstimme liegt aus dem vorigen Takt herüber

    if (gattung === 1) {
      add('kp-konsonanz', 'fehler', `${gross(name)}: In der 1. Gattung sind nur Konsonanzen erlaubt (Terz, Quinte, Sexte, Oktave, Einklang).`, ids, k.takt);
      continue;
    }
    if (synkopiert) {
      // Vorhalt: vorbereitet (gebunden), schrittweise abwärts in eine Konsonanz aufgelöst
      if (!(gattung === 4 || gattung === 5)) {
        add('kp-konsonanz', 'fehler', `${gross(name)} durch einen übergebundenen Ton: Vorhalte gehören in die 4. und 5. Gattung.`, ids, k.takt);
        continue;
      }
      const loest = nach && stufen(nach.p, ton.p) === -1;
      const cfUnter = cf.find((c) => c.start <= (nach?.start ?? 0) + 1e-9 && c.ende > (nach?.start ?? 0) + 1e-9)?.p;
      const ziel = nach && cfUnter ? konsonant(nach.p, cfUnter) : false;
      if (!loest) add('kp-vorhalt', 'fehler', `Vorhalt (${name}) ohne Auflösung: Ein Vorhalt löst sich einen Schritt abwärts auf.`, idsVon(...ids, nach?.id), k.takt);
      else if (!ziel) add('kp-vorhalt', 'fehler', `Der Vorhalt (${name}) löst sich nicht in eine Konsonanz auf.`, idsVon(...ids, nach?.id), k.takt);
      else if (!kpOben) {
        // Unter dem Cantus firmus sind nur 2–3 und 4–5 (9–10) gute Vorhalte, die Septime nicht
        const iv = intervall(o, u).nummer;
        if (iv === 7) add('kp-vorhalt', 'fehler', 'Septimvorhalt in der Unterstimme: Unter dem Cantus firmus klingen nur 2–3 und 4–5 gut.', ids, k.takt);
      }
      continue;
    }
    if (betont(k.zeit) && k.neu[kpV]) {
      add('kp-konsonanz', 'fehler', `${gross(name)} auf der betonten Zählzeit: Auf der Eins steht eine Konsonanz, Dissonanzen nur als Vorhalt.`, ids, k.takt);
      continue;
    }
    if (gattung === 4) {
      add('kp-konsonanz', 'fehler', `${gross(name)} auf der unbetonten Halben: In der 4. Gattung ist nur der Vorhalt auf der Eins dissonant.`, ids, k.takt);
      continue;
    }
    // Unbetont: Durchgang, Wechselnote oder Cambiata
    if (!vor || !nach) {
      add('kp-durchgang', 'fehler', `${gross(name)} ohne Vorgänger oder Nachfolger: Eine Dissonanz braucht einen Schritt hinein und hinaus.`, ids, k.takt);
      continue;
    }
    const rein = stufen(ton.p, vor.p);
    const raus = stufen(nach.p, ton.p);
    const durchgang = Math.abs(rein) === 1 && Math.abs(raus) === 1 && Math.sign(rein) === Math.sign(raus);
    const wechsel = Math.abs(rein) === 1 && Math.abs(raus) === 1 && Math.sign(rein) !== Math.sign(raus);
    const nachNach = kpNoten[i + 2];
    const cambiata = (gattung === 3 || gattung === 5) && rein === -1 && raus === -2 && !!nachNach && stufen(nachNach.p, nach.p) === 1;
    if (durchgang || cambiata) continue;
    if (wechsel) {
      if (gattung === 2) add('kp-durchgang', 'hinweis', `${gross(name)} als Wechselnote: In der 2. Gattung erlaubt Fux dissonant nur den Durchgang.`, idsVon(...ids, vor.id, nach.id), k.takt);
      continue;
    }
    add(
      'kp-durchgang',
      'fehler',
      `${gross(name)} wird ${Math.abs(rein) !== 1 ? 'nicht im Schritt erreicht' : 'nicht im Schritt verlassen'}: Eine unbetonte Dissonanz kommt und geht im Schritt (Durchgang oder Wechselnote)${gattung >= 3 ? ', Ausnahme ist die Cambiata' : ''}.`,
      idsVon(...ids, vor.id, nach.id),
      k.takt,
    );
  }

  /* Anfang */
  const erster = ks.find((k) => oben(k) && unten(k));
  if (erster) {
    const [o, u] = [oben(erster)!, unten(erster)!];
    const iv = intervall(o, u);
    const ids = idsVon(erster.ids[0], erster.ids[1]);
    if (!vollkommen(o, u)) add('kp-anfang', 'fehler', `Der Kontrapunkt beginnt mit ${mitEiner(intervallName(iv))}. Am Anfang steht eine vollkommene Konsonanz: Einklang, Quinte oder Oktave.`, ids, erster.takt);
    else if (!kpOben && iv.nummer === 5) add('kp-anfang', 'fehler', 'Unter dem Cantus firmus beginnt die Gegenstimme mit Einklang oder Oktave, nicht mit der Quinte: Sonst klingt eine andere Tonart.', ids, erster.takt);
  }

  /* Schluss: Einklang/Oktave, beide Stimmen schrittweise in Gegenbewegung */
  // Erst prüfen, wenn die Gegenstimme bis zum Schluss reicht
  const fertig = kp.length > 0 && kp[kp.length - 1].ende >= cf[cf.length - 1].ende - 1e-6 && !!kp[kp.length - 1].p;
  const letzteK = fertig ? [...ks].reverse().find((k) => oben(k) && unten(k)) : undefined;
  if (letzteK) {
    const [o, u] = [oben(letzteK)!, unten(letzteK)!];
    const ids = idsVon(letzteK.ids[0], letzteK.ids[1]);
    const iv = intervall(o, u);
    if (!(iv.qualitaet === 'rein' && (iv.nummer === 1 || iv.nummer === 8))) {
      add('kp-schluss', 'fehler', `Der Schluss endet mit ${mitEiner(intervallName(iv))}. Der Kontrapunkt schließt im Einklang oder in der Oktave.`, ids, letzteK.takt);
    } else {
      const kpLetzt = kpNoten[kpNoten.length - 1];
      const kpVor = kpNoten[kpNoten.length - 2];
      if (!kpVor || !istSchritt(kpVor.p, kpLetzt.p)) {
        add('kp-schluss', 'fehler', 'Die Gegenstimme erreicht den Schlusston nicht im Schritt. In der Clausula gehen beide Stimmen schrittweise in Gegenbewegung in den Schlussklang.', idsVon(kpVor?.id, kpLetzt.id), letzteK.takt);
      } else {
        // Leitton: Die Stimme, die von unten kommt, braucht einen Halbton (außer im Phrygischen)
        const vonUnten = stufen(kpLetzt.p, kpVor.p) === 1 ? kpVor : null;
        const cfVor = cf[cf.length - 2];
        const cfVonUnten = cfVor && stufen(finalis, cfVor.p!) === 1 ? cfVor : null;
        const leit = vonUnten ?? cfVonUnten;
        const zielTon = vonUnten ? kpLetzt.p : finalis;
        if (leit && halb(zielTon, leit.p!) !== 1) {
          add('kp-schluss', 'fehler', `Vor dem Schlusston fehlt der Leitton: ${germanNameWithOctave(leit.p!)} sollte einen Halbton unter dem Ziel liegen (erhöhen). Nur das Phrygische schließt ohne Leitton.`, idsVon(leit.id), leit.takt);
        }
      }
    }
  }

  /* Parallelen und verdeckte Parallelen zwischen aufeinanderfolgenden Klängen */
  const beide = ks.filter((k) => oben(k) && unten(k));
  for (let i = 1; i < beide.length; i++) {
    const [a, b] = [beide[i - 1], beide[i]];
    const [ao, au, bo, bu] = [oben(a)!, unten(a)!, oben(b)!, unten(b)!];
    const ids = idsVon(a.ids[0], a.ids[1], b.ids[0], b.ids[1]);
    if (gleich(ao, bo) && gleich(au, bu)) continue;
    const ia = intervall(ao, au);
    const ib = intervall(bo, bu);
    const perfekt = vollkommen(bo, bu);
    if (perfekt && vollkommen(ao, au) && ia.nummer === ib.nummer && !gleich(ao, bo) && !gleich(au, bu)) {
      const art = ib.nummer === 5 ? 'Quint' : ib.nummer === 8 ? 'Oktav' : 'Einklang';
      add('kp-parallelen', 'fehler', `${art}parallele: Beide Stimmen gehen im gleichen vollkommenen Intervall weiter und verschmelzen zu einer.`, ids, b.takt);
      continue;
    }
    const gleicheRichtung = Math.sign(halb(bo, ao)) === Math.sign(halb(bu, au)) && halb(bo, ao) !== 0;
    if (perfekt && gleicheRichtung && betont(b.zeit) && ib.nummer !== 1) {
      add('kp-verdeckt', gattung === 1 ? 'fehler' : 'hinweis', `Verdeckte ${ib.nummer === 5 ? 'Quinte' : 'Oktave'}: Beide Stimmen gehen in dieselbe Richtung in eine vollkommene Konsonanz. Erreiche sie in Gegenbewegung.`, ids, b.takt);
    }
  }
  // Akzentparallelen: vollkommene Konsonanzen gleicher Art auf aufeinanderfolgenden Einsen
  if (gattung === 2 || gattung === 3) {
    const einsen = beide.filter((k) => betont(k.zeit));
    for (let i = 1; i < einsen.length; i++) {
      const [a, b] = [einsen[i - 1], einsen[i]];
      if (b.takt !== a.takt + 1) continue;
      const [ao, au, bo, bu] = [oben(a)!, unten(a)!, oben(b)!, unten(b)!];
      if (vollkommen(ao, au) && vollkommen(bo, bu) && intervall(ao, au).nummer === intervall(bo, bu).nummer && intervall(bo, bu).nummer !== 1) {
        const dazwischen = beide.filter((k) => k.zeit > a.zeit && k.zeit < b.zeit);
        const sprung = dazwischen.length <= 1 && !istSchritt(ao, bo) && !istSchritt(au, bu);
        add('kp-parallelen', sprung ? 'fehler' : 'hinweis', `Akzentparallele: ${intervallName(intervall(bo, bu))} auf zwei aufeinanderfolgenden Einsen. Die Noten dazwischen verdecken sie kaum.`, idsVon(a.ids[0], a.ids[1], b.ids[0], b.ids[1]), b.takt);
      }
    }
  }

  /* Einklang mitten im Satz */
  beide.forEach((k, i) => {
    if (i === 0 || i === beide.length - 1) return;
    if (gleich(oben(k)!, unten(k)!) && betont(k.zeit)) add('kp-einklang', gattung === 1 ? 'fehler' : 'hinweis', 'Einklang mitten im Satz: Die beiden Stimmen fallen zusammen, nur am Anfang und Schluss ist er üblich.', idsVon(k.ids[0], k.ids[1]), k.takt);
  });

  /* Kreuzung und Abstand */
  beide.forEach((k) => {
    const d = halb(oben(k)!, unten(k)!);
    if (d < 0) add('kp-abstand', 'fehler', 'Die Stimmen kreuzen sich: Die obere liegt unter der unteren.', idsVon(k.ids[0], k.ids[1]), k.takt);
    else if (d > 19) add('kp-abstand', 'hinweis', 'Mehr als eine Duodezime Abstand: Die Stimmen klingen getrennt, halte sie näher zusammen (höchstens eine Dezime).', idsVon(k.ids[0], k.ids[1]), k.takt);
  });

  /* Bewegung: zu viele Terzen oder Sexten hintereinander */
  let folge = 0;
  for (let i = 0; i < beide.length; i++) {
    const n = intervall(oben(beide[i])!, unten(beide[i])!).nummer;
    const vor = i > 0 ? intervall(oben(beide[i - 1])!, unten(beide[i - 1])!).nummer : 0;
    folge = (n === 3 || n === 6) && n === vor ? folge + 1 : 1;
    if (folge === 4 && gattung === 1) add('kp-bewegung', 'hinweis', `Vier ${n === 3 ? 'Terzen' : 'Sexten'} nacheinander: Die Gegenstimme läuft nur parallel mit. Wechsle zu Gegenbewegung.`, idsVon(beide[i].ids[0], beide[i].ids[1]), beide[i].takt);
  }

  /* Melodik der Gegenstimme */
  for (let i = 1; i < kpNoten.length; i++) {
    const [a, b] = [kpNoten[i - 1], kpNoten[i]];
    const d = halb(b.p, a.p);
    const ids = idsVon(a.id, b.id);
    if (d === 0) {
      if (gattung === 1 || gattung === 2 || gattung === 3) add('kp-melodik', 'hinweis', 'Tonwiederholung in der Gegenstimme: Sie hält den Fluss an, besser vermeiden.', ids, b.takt);
      continue;
    }
    const iv = intervall(a.p, b.p);
    if (Math.abs(d) > 12) add('kp-melodik', 'fehler', 'Sprung größer als eine Oktave.', ids, b.takt);
    else if (iv.qualitaet.includes('übermäßig') || iv.qualitaet.includes('vermindert')) add('kp-melodik', 'fehler', `${gross(intervallName(iv))}: übermäßige und verminderte Sprünge sind im strengen Satz verboten.`, ids, b.takt);
    else if (iv.nummer === 7) add('kp-melodik', 'fehler', 'Septimsprung: im strengen Satz verboten.', ids, b.takt);
    else if (iv.nummer === 6 && !(iv.qualitaet === 'klein' && d > 0)) add('kp-melodik', 'fehler', 'Sextsprung: Fux erlaubt nur die kleine Sexte aufwärts.', ids, b.takt);
    // Nach einem großen Sprung schrittweise in Gegenrichtung
    const c = kpNoten[i + 1];
    if (Math.abs(stufen(b.p, a.p)) >= 4 && c && !(Math.sign(halb(c.p, b.p)) === -Math.sign(d) && istSchritt(b.p, c.p))) {
      add('kp-melodik', 'hinweis', 'Nach einem großen Sprung geht die Melodie meist schrittweise in die Gegenrichtung zurück.', idsVon(a.id, b.id, c.id), c.takt);
    }
    // Zwei Sprünge in dieselbe Richtung, die keinen Dreiklang bilden
    if (c && Math.abs(stufen(b.p, a.p)) >= 2 && Math.abs(stufen(c.p, b.p)) >= 2 && Math.sign(d) === Math.sign(halb(c.p, b.p)) && Math.abs(stufen(c.p, a.p)) > 4) {
      add('kp-melodik', 'hinweis', 'Zwei Sprünge in dieselbe Richtung über mehr als eine Quinte: Das klingt zerrissen.', idsVon(a.id, b.id, c.id), c.takt);
    }
  }
  const umfang = Math.max(...kpNoten.map((t) => toMidi(t.p))) - Math.min(...kpNoten.map((t) => toMidi(t.p)));
  if (umfang > 16) add('kp-melodik', 'hinweis', 'Die Gegenstimme umfasst mehr als eine Dezime. Im strengen Satz bleibt sie in einem singbaren Rahmen.', [], 0);

  /* Höhepunkt: der höchste Ton nur einmal */
  const hoechster = Math.max(...kpNoten.map((t) => toMidi(t.p)));
  const gipfel = kpNoten.filter((t) => toMidi(t.p) === hoechster);
  if (gipfel.length > 1 && kpOben) add('kp-hoehepunkt', 'hinweis', `Der höchste Ton (${germanNameWithOctave(gipfel[0].p)}) kommt ${gipfel.length}-mal vor. Eine gute Linie hat einen einzigen Höhepunkt.`, gipfel.map((t) => t.id), gipfel[1].takt);

  /* Leitereigene Töne: Erhöhungen nur als Leitton vor dem Schluss */
  kpNoten.forEach((t, i) => {
    const soll = keyAlter(t.p.step, score.key.fifths);
    const ist = t.p.alter ?? 0;
    if (ist === soll) return;
    const vorSchluss = i >= kpNoten.length - 3 && ist === soll + 1;
    const bFa = t.p.step === 'B' && ist === -1; // b „fa“ im Dorischen und Lydischen ist erlaubt
    if (!vorSchluss && !bFa) add('kp-leiter', 'hinweis', `${germanNameWithOctave(t.p)} ist leiterfremd. Im strengen Satz bleiben die Töne im Modus; erhöht wird nur der Leitton vor dem Schluss.`, [t.id], t.takt);
  });

  const gesehen = new Set<string>();
  return out
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
