import { measureLength, quarterLength } from '../model/duration';
import { diatonicIndex, germanName, germanNameWithOctave, keyAlter, toMidi } from '../model/pitch';
import { ENSEMBLES, instrument, lagePruefen, lageText, notiert, umfangText } from '../model/instrumente';
import type { Pitch, Step } from '../model/types';
import type { EditorDoc } from '../editor/rebar';
import { rebar } from '../editor/rebar';
import { rebarSatz } from '../editor/satzdoc';
import type { Score } from '../model/types';
import { analysiere, funktionPasst, funktionsfolge } from '../satz/analyse';
import { pruefeSatz } from '../satz/regeln';
import { pruefeKontrapunkt } from '../kontrapunkt/fux';
import { findeMotive } from '../kontrapunkt/motive';
import { MODUS_NAMEN, modusLeiter, type ModusName } from '../uebungen/modal';
import { ensembleName, stimmenVon, synchron } from '../editor/satzdoc';
import { klavierHarmonien, pruefeKlaviersatz } from '../satz/klavier';
import { analysiereForm, kadenzAm, kadenzText, menuettTrioFehlt, type KadenzArt } from '../satz/form';
import type { Akkord } from '../satz/akkorde';
import { parseNotenfolge, parseTonart } from './kompakt';
import { grundton } from '../model/tonart';
import { dreiklangArt, intervall, INTERVALL_NAMEN } from '../uebungen/theorie';

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const WEITE = ['None', 'Dezime', 'Undezime', 'Duodezime'];
const spanne = (stufen: number) => (stufen <= 8 ? INTERVALL_NAMEN[Math.max(stufen, 1) - 1] : (WEITE[stufen - 9] ?? `Spanne von ${stufen} Stufen`));

export { grundton };

const gleicheKlasse = (p: Pitch, g: { step: Step; alter: number }) => p.step === g.step && (p.alter ?? 0) === g.alter;

export interface Pruefpunkt {
  text: string;
  ok: boolean;
  /** Kurzer Hinweis, wenn es noch nicht passt */
  hinweis?: string;
}

/**
 * Prüft ein Stück gegen eine Liste von Kriterien, z. B.
 * „takte 8, dur, endet-grundton, schluss-lang, schritt-zum-schluss, umfang 10, sprung-max 6, leitereigen“.
 */
export function pruefe(gesamt: EditorDoc, kriterien: string[]): Pruefpunkt[] {
  // Im Klaviersatz gelten die Melodie-Kriterien für die Melodie (obere Stimme)
  // Im Ensemble für die oberste Stimme
  const doc =
    gesamt.satz?.klavier || gesamt.satz?.ensemble
      ? { ...gesamt, clef: stimmenVon(gesamt.satz)[0].clef, events: synchron(gesamt).satz!.stimmen[0] }
      : gesamt;
  const noten = doc.events.filter((e) => e.pitch);
  const toene = noten.map((e) => e.pitch!);
  const letzte = noten[noten.length - 1];
  const g = grundton(doc.key);
  const takte = doc.events.length ? rebar(doc).score.voices[0].measures.length : 0;

  let satzScore: Score | null | undefined;
  const satz = () => (satzScore === undefined ? (satzScore = gesamt.satz ? rebarSatz(gesamt).score : null) : satzScore);

  return kriterien.map((k): Pruefpunkt => {
    const [name, ...args] = k.trim().split(/\s+/);
    const arg = args[0];
    const n = Number(arg);
    switch (name) {
      case 'takte':
        return { text: `Genau ${n} Takte`, ok: takte === n, hinweis: `Bisher ${takte} ${takte === 1 ? "Takt" : "Takte"}.` };
      case 'noten':
        return { text: `Mindestens ${n} Noten`, ok: toene.length >= n, hinweis: `Bisher ${toene.length}.` };
      case 'dur':
        return { text: 'Steht in einer Dur-Tonart', ok: doc.key.mode === 'major', hinweis: 'Stelle unter „Tonart und Takt“ eine Dur-Tonart ein.' };
      case 'moll':
        return { text: 'Steht in einer Moll-Tonart', ok: doc.key.mode === 'minor', hinweis: 'Stelle unter „Tonart und Takt“ eine Moll-Tonart ein.' };
      case 'beginnt-grundton':
        return {
          text: `Beginnt mit dem Grundton ${germanName({ ...g, octave: 4 })}`,
          ok: !!toene[0] && gleicheKlasse(toene[0], g),
        };
      case 'endet-grundton':
        return {
          text: `Endet auf dem Grundton ${germanName({ ...g, octave: 4 })}`,
          ok: !!letzte && gleicheKlasse(letzte.pitch!, g),
          hinweis: 'Der letzte Ton sollte der Grundton der Tonart sein, dann klingt das Stück abgeschlossen.',
        };
      case 'schluss-lang': {
        const lang = !!letzte && quarterLength(letzte.duration) >= measureLength(doc.time) / 2;
        return { text: 'Der Schlusston ist lang', ok: lang, hinweis: 'Lass den letzten Ton mindestens einen halben Takt klingen.' };
      }
      case 'schritt-zum-schluss': {
        const [a, b] = toene.slice(-2);
        const ok = !!a && !!b && (Math.abs(diatonicIndex(a) - diatonicIndex(b)) <= 1 || [3, 4].includes(Math.abs(diatonicIndex(a) - diatonicIndex(b))));
        return { text: 'Schluss mit Sekundschritt oder Quint-/Quartsprung', ok, hinweis: 'Erreiche den Schlusston von der Nachbarnote oder von der Dominante aus.' };
      }
      case 'umfang': {
        const ds = toene.map(diatonicIndex);
        const umfang = ds.length ? Math.max(...ds) - Math.min(...ds) + 1 : 0;
        return { text: `Umfang höchstens eine ${spanne(n)}`, ok: umfang <= n, hinweis: `Die Melodie umfasst eine ${spanne(umfang)}.` };
      }
      case 'sprung-max': {
        let groesster = 0;
        for (let i = 1; i < toene.length; i++) groesster = Math.max(groesster, Math.abs(diatonicIndex(toene[i]) - diatonicIndex(toene[i - 1])) + 1);
        return { text: `Keine Sprünge größer als eine ${INTERVALL_NAMEN[n - 1]}`, ok: groesster <= n, hinweis: groesster ? `Größter Sprung: ${INTERVALL_NAMEN[Math.min(groesster, 8) - 1]}.` : undefined };
      }
      case 'leitereigen': {
        const fremd = toene.filter((p) => {
          const a = p.alter ?? 0;
          if (a === keyAlter(p.step, doc.key.fifths)) return false;
          // in Moll sind die erhöhte 6. und 7. Stufe erlaubt
          if (doc.key.mode === 'minor') {
            const stufe = (STEPS.indexOf(p.step) - STEPS.indexOf(g.step) + 7) % 7;
            return !((stufe === 5 || stufe === 6) && a === keyAlter(p.step, doc.key.fifths) + 1);
          }
          return true;
        });
        return { text: 'Nur Töne der Tonart', ok: fremd.length === 0, hinweis: fremd.length ? `Tonartfremd: ${fremd.map(germanName).join(', ')}.` : undefined };
      }
      case 'tonleiter': {
        const ok =
          toene.length === 8 &&
          gleicheKlasse(toene[0], g) &&
          toene.every((p, i) => i === 0 || diatonicIndex(p) - diatonicIndex(toene[i - 1]) === 1) &&
          toene.every((p) => (p.alter ?? 0) === keyAlter(p.step, doc.key.fifths));
        return { text: 'Tonleiter vom Grundton aufwärts, 8 Töne mit den richtigen Vorzeichen', ok, hinweis: 'Beginne beim Grundton und gehe Stufe für Stufe bis zur Oktave.' };
      }
      case 'dreiklaenge': {
        const gruppen: Pitch[][] = [];
        for (let i = 0; i + 2 < toene.length; i += 3) gruppen.push(toene.slice(i, i + 3));
        const ok = gruppen.length >= n && gruppen.every((gr) => dreiklangArt(gr) !== null) && toene.length % 3 === 0;
        return { text: `${n} Dreiklänge in Grundstellung, je drei Töne aufwärts`, ok, hinweis: 'Jeweils Grundton, Terz und Quinte nacheinander.' };
      }
      case 'nur-terzen': {
        const ok = toene.length >= 2 && toene.every((p, i) => i === 0 || intervall(toene[i - 1], p).nummer === 3);
        return { text: 'Nur Terzschritte', ok };
      }
      case 'hoechster-ton-einmal': {
        const max = Math.max(...toene.map(toMidi));
        const ok = toene.filter((p) => toMidi(p) === max).length === 1;
        return { text: 'Der höchste Ton kommt nur einmal vor (Höhepunkt)', ok, hinweis: 'Ein einziger Gipfelton macht die Melodie zielgerichtet.' };
      }
      case 'finalis': {
        const step = arg as Step;
        return {
          text: `Endet auf der Finalis ${germanName({ step, octave: 4 })}`,
          ok: !!letzte && letzte.pitch!.step === step && !letzte.pitch!.alter,
          hinweis: 'Im Modus ist der Schlusston die Finalis, der Grundton des Modus.',
        };
      }
      case 'modus':
      case 'charakterton': {
        const modus = MODUS_NAMEN.find((m) => m.toLowerCase() === (arg ?? '').toLowerCase().replace('ae', 'ä')) as ModusName | undefined;
        if (!modus || !args[1]) return { text: `Unbekannter Modus „${k}“`, ok: false };
        const grund: Pitch = { step: args[1] as Step, octave: 4 };
        const leiter = modusLeiter(grund, modus);
        const klasse = (p: Pitch) => ((toMidi(p) % 12) + 12) % 12;
        const erlaubt = new Set(leiter.map(klasse));
        if (name === 'modus') {
          const fremd = toene.filter((p) => !erlaubt.has(klasse(p)));
          return { text: `Nur Töne aus ${germanName(grund)}-${modus}`, ok: fremd.length === 0, hinweis: fremd.length ? `Nicht im Modus: ${[...new Set(fremd.map(germanName))].join(', ')}.` : undefined };
        }
        const FARBE: Record<ModusName, number> = { Ionisch: 6, Dorisch: 5, Phrygisch: 1, Lydisch: 3, Mixolydisch: 6, Äolisch: 5 };
        const ton = leiter[FARBE[modus]];
        const anzahl = toene.filter((p) => klasse(p) === klasse(ton)).length;
        return { text: `Der Farbton ${germanName(ton)} kommt mindestens zweimal vor`, ok: anzahl >= 2, hinweis: `Der Ton ${germanName(ton)} unterscheidet ${modus} von Dur und Moll. Bisher ${anzahl}-mal.` };
      }
      case 'instrument':
      case 'gute-lage':
      case 'transponiert':
        return instrumentKriterium(name, args, doc);
      case 'periode':
      case 'satzform':
      case 'liedform':
      case 'menuett-trio':
      case 'halbschluss':
      case 'ganzschluss-takt':
        return formKriterium(name, args, satz() ?? rebar(doc).score);
      case 'ensemble':
      case 'im-umfang':
      case 'begleitung-noten':
      case 'blues':
      case 'vierstimmig':
      case 'vollstaendig':
      case 'fehlerfrei':
      case 'funktionen':
      case 'ganzschluss':
      case 'enthaelt':
      case 'endet-in':
      case 'liedtext':
      case 'mindestens-takte':
      case 'motiv-anzahl':
      case 'motiv-imitation':
      case 'motiv-verarbeitung':
        return satzKriterium(name, args, gesamt, satz());
      default:
        return { text: `Unbekanntes Kriterium „${k}“`, ok: false };
    }
  });
}

/** Instrumentation: Umfang, gute Lage und richtige Transposition (die Melodie im Editor) */
function instrumentKriterium(name: string, args: string[], doc: EditorDoc): Pruefpunkt {
  const i = instrument(args[0]);
  if (!i) return { text: `Unbekanntes Instrument „${args[0]}“`, ok: false };
  const toene = doc.events.filter((e) => e.pitch).map((e) => e.pitch!);
  const titel = `${i.name}${i.stimmung ? ` ${i.stimmung}` : ''}`;
  if (name === 'instrument') {
    const { ausserhalb } = lagePruefen(toene, i);
    return {
      text: `Alle Töne liegen im Umfang ${titel === i.name ? `der ${i.name}` : `des ${titel}`} (klingend ${umfangText(i)})`,
      ok: toene.length > 0 && ausserhalb.length === 0,
      hinweis: ausserhalb.length ? `Nicht spielbar: ${[...new Set(ausserhalb.map(germanNameWithOctave))].join(', ')}.` : undefined,
    };
  }
  if (name === 'gute-lage') {
    const { anteilLage } = lagePruefen(toene, i);
    return { text: `Die Melodie liegt überwiegend in der guten Lage (klingend ${lageText(i)})`, ok: toene.length > 0 && anteilLage >= 0.8, hinweis: `${Math.round(anteilLage * 100)} % der Töne liegen in der guten Lage.` };
  }
  // transponiert <id> <klingende Vorlage>: Die Melodie im Editor ist die notierte Stimme
  const vorlage = parseNotenfolge(args.slice(1).join(' '));
  const soll = vorlage.map((e) => (e.pitch ? notiert(e.pitch, i) : null));
  const ist = doc.events;
  let erster = -1;
  for (let k = 0; k < Math.max(soll.length, ist.length); k++) {
    const a = soll[k];
    const b = ist[k]?.pitch;
    const gleich = a === undefined ? false : a === null ? !b : !!b && toMidi(a) === toMidi(b) && a.step === b.step && ist[k].duration.type === vorlage[k].duration.type;
    if (!gleich) {
      erster = k;
      break;
    }
  }
  return {
    text: `Die Stimme ist richtig für ${titel} notiert (${i.transposition.name} klingend)`,
    ok: erster < 0,
    hinweis:
      erster < 0
        ? undefined
        : soll[erster]
          ? `Note ${erster + 1}: notiert gehört dort ${germanNameWithOctave(soll[erster]!)} hin. Notiert wird ${i.transposition.name.replace('tiefer', 'höher')}, als es klingt.`
          : `Note ${erster + 1}: dort steht in der Vorlage eine Pause oder die Melodie ist zu Ende.`,
  };
}

/** Kriterien der Formenlehre: gelten für Melodien und für Sätze (dort zählen die Akkorde) */
function formKriterium(name: string, args: string[], score: Score): Pruefpunkt {
  const f = analysiereForm(score);
  const warum = f.text[0] ? ` ${f.text[0]}` : '';
  switch (name) {
    case 'periode':
      return { text: 'Das Thema ist eine Periode (Vordersatz mit offenem Schluss, Nachsatz mit Ganzschluss)', ok: !!f.form?.includes('Periode'), hinweis: `Erkannt: ${f.form ?? 'noch keine Form'}.${warum}` };
    case 'satzform':
      return { text: 'Das Thema ist ein Satz (Grundgedanke, Wiederholung, Fortspinnung)', ok: f.form === 'Satz', hinweis: `Erkannt: ${f.form ?? 'noch keine Form'}.${warum}` };
    case 'liedform':
      return { text: 'Dreiteilige Liedform A B A', ok: !!f.form?.includes('Liedform'), hinweis: `Erkannt: ${f.form ?? 'noch keine Form'}. A und die Wiederkehr von A beginnen gleich, B bringt einen Kontrast.` };
    case 'menuett-trio': {
      const fehlt = menuettTrioFehlt(score);
      return { text: 'Menuett mit Trio: 3/4-Takt, je zwei Teile, beide mit Ganzschluss am Ende', ok: fehlt.length === 0, hinweis: fehlt[0] };
    }
    case 'halbschluss':
    case 'ganzschluss-takt': {
      const t = Number(args[0]);
      const k = kadenzAm(score, t);
      const soll: KadenzArt = name === 'halbschluss' ? 'halb' : 'ganz';
      const ok = !!k && (k.art === soll || (soll === 'halb' && !!k.fremd)) && (soll === 'halb' || !k.fremd);
      return { text: `Takt ${t} endet mit einem ${soll === 'halb' ? 'Halbschluss' : 'Ganzschluss'}`, ok, hinweis: k ? `Erkannt: ${kadenzText(k)}.` : `Takt ${t} fehlt noch.` };
    }
  }
  return { text: name, ok: false };
}

const OHNE_SATZ: Pruefpunkt = { text: 'Vierstimmiger Satz', ok: false, hinweis: 'Stelle unter „Stück einstellen“ die Besetzung „Chorsatz“ ein.' };
const UMKEHRUNG: Record<string, number> = { Grundstellung: 0, Sextakkord: 1, Quartsextakkord: 2 };

/** Die Akkorde eines Satzes: im Klaviersatz je Abschnitt aus Melodie und Begleitung, sonst je Zusammenklang */
function akkordStellen(score: Score, klavier: boolean): { akkord: Akkord }[] {
  if (!klavier) return analysiere(score);
  return klavierHarmonien(score)
    .filter((h): h is typeof h & { akkord: Akkord } => !!h.akkord && h.kurz !== '?')
    .filter((h, i, xs) => i === 0 || xs[i - 1].akkord.name !== h.akkord.name || xs[i - 1].akkord.umkehrung !== h.akkord.umkehrung);
}

function folge(stellen: { akkord: Akkord }[]): string[] {
  const out: string[] = [];
  for (const s of stellen) if (out[out.length - 1] !== s.akkord.funktion) out.push(s.akkord.funktion);
  return out;
}

/** Kriterien für vierstimmige Sätze */
function satzKriterium(name: string, args: string[], doc: EditorDoc, score: Score | null): Pruefpunkt {
  if (!score || !doc.satz) return OHNE_SATZ;
  const stimmen = doc.satz.stimmen;
  switch (name) {
    case 'ensemble': {
      const soll = ENSEMBLES.find((e) => e.id === args[0])?.instrumente ?? args.join('').split(/[+,]/);
      const ist = doc.satz.ensemble ?? [];
      return {
        text: `Besetzung: ${ensembleName(soll)}`,
        ok: ist.join() === soll.join(),
        hinweis: 'Wähle unter „Stück einstellen“ die Besetzung „Ensemble“ und die passenden Instrumente, oder beginne die Aufgabe neu.',
      };
    }
    case 'im-umfang': {
      const fehler = pruefeSatz(score).filter((b) => b.regel === 'umfang' && b.art === 'fehler');
      return {
        text: 'Jedes Instrument bleibt in seinem Tonumfang',
        ok: !!doc.satz.ensemble && fehler.length === 0,
        hinweis: fehler[0] ? `Takt ${fehler[0].takt}: ${fehler[0].text}` : undefined,
      };
    }
    case 'vierstimmig': {
      const laengen = stimmen.map((st) => st.reduce((s, e) => s + quarterLength(e.duration), 0));
      const leer = stimmen.map((st, i) => (st.some((e) => e.pitch) ? null : ['Sopran', 'Alt', 'Tenor', 'Bass'][i])).filter(Boolean);
      const ok = leer.length === 0 && laengen.every((l) => Math.abs(l - laengen[0]) < 1e-9);
      return {
        text: 'Alle vier Stimmen sind gleich lang ausgeschrieben',
        ok,
        hinweis: leer.length ? `Noch leer: ${leer.join(', ')}.` : 'Die Stimmen sind unterschiedlich lang.',
      };
    }
    case 'vollstaendig': {
      // Jede Stimme ist so lang wie die vorgegebene (z. B. der Cantus firmus)
      const laengen = stimmen.map((st) => st.reduce((s, e) => s + quarterLength(e.duration), 0));
      const soll = Math.max(...laengen);
      const namen = stimmenVon(doc.satz).map((st) => st.name);
      const kurz = laengen.map((l, i) => (l < soll - 1e-9 ? namen[i] : null)).filter(Boolean);
      return {
        text: doc.satz.klavier
          ? 'Melodie und Begleitung sind gleich lang'
          : doc.satz.ensemble
            ? 'Alle Stimmen reichen bis zum Schluss'
            : doc.satz.kontrapunkt?.gattung === 'frei'
              ? 'Beide Stimmen sind gleich lang'
              : 'Die Gegenstimme reicht bis zum Schluss', ok: kurz.length === 0, hinweis: kurz.length ? `Noch zu kurz: ${kurz.join(', ')}.` : undefined };
    }
    case 'fehlerfrei': {
      const kp = doc.satz.kontrapunkt;
      const kl = !!doc.satz.klavier;
      const fehler = (kl ? pruefeKlaviersatz(score, { hinweise: false }) : kp ? pruefeKontrapunkt(score, { ...kp, hinweise: false }) : pruefeSatz(score)).filter((b) => b.art === 'fehler');
      const erster = fehler[0];
      return {
        text: kl
          ? 'Keine Fehler im Klaviersatz (Parallelen zwischen Melodie und Bass, Schluss)'
          : kp
            ? 'Keine Fehler im Kontrapunkt (Konsonanzen, Dissonanzen, Parallelen, Schluss …)'
            : doc.satz.ensemble
              ? 'Keine Satzfehler (Parallelen, Umfang der Instrumente, Auflösung …)'
              : 'Keine Satzfehler (Parallelen, Umfang, Auflösung …)',
        ok: fehler.length === 0,
        hinweis: erster ? `${fehler.length} Fehler, z. B. Takt ${erster.takt}: ${erster.text}` : undefined,
      };
    }
    case 'begleitung-noten': {
      const n = Number(args[0]);
      const ist = doc.satz.klavier ? stimmen[1].filter((e) => e.pitch).length : 0;
      return { text: `Die Begleitung hat mindestens ${n} Töne (ein Begleitmuster, nicht nur lange Bässe)`, ok: ist >= n, hinweis: `Bisher ${ist}.` };
    }
    case 'blues': {
      // 12 Takte: I I I I | IV IV I I | V IV I I (in Takt 2 darf IV stehen, in Takt 12 V)
      const erlaubt = [[1], [1, 4], [1], [1], [4], [4], [1], [1], [5], [4, 5], [1], [1, 5]];
      const harm = klavierHarmonien(score).filter((h) => h.akkord && h.kurz !== '?');
      const stufen = erlaubt.map((_, t) => harm.find((h) => h.takt === t)?.akkord?.stufe ?? null);
      const falsch = stufen.map((s, t) => (s !== null && erlaubt[t].includes(s) ? null : t + 1)).filter((x): x is number => x !== null);
      const ROEM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
      return {
        text: 'Das Bluesschema: I I I I | IV IV I I | V IV I I',
        ok: falsch.length === 0,
        hinweis: falsch.length ? `Prüfe Takt ${falsch.slice(0, 4).join(', ')}: erkannt ${stufen.map((s) => (s ? ROEM[s] : '?')).join(' ')}.` : undefined,
      };
    }
    case 'mindestens-takte': {
      const n = Number(args[0]);
      const ist = score.voices[0].measures.length;
      return { text: `Mindestens ${n} Takte`, ok: ist >= n, hinweis: `Bisher ${ist} ${ist === 1 ? 'Takt' : 'Takte'}.` };
    }
    case 'motiv-anzahl': {
      const n = Number(args[0]);
      const ist = findeMotive(score).length;
      return { text: `Das Motiv erklingt mindestens ${n}-mal`, ok: ist >= n, hinweis: `Bisher ${ist}-mal erkannt. Öffne „Satz prüfen“, um die Funde zu sehen; passe dort auch die Länge des Motivs an.` };
    }
    case 'motiv-imitation': {
      const ok = findeMotive(score).some((f) => f.bezug === 'Imitation');
      return { text: 'Die andere Stimme imitiert das Motiv', ok, hinweis: 'Lass das Motiv in der zweiten Stimme mit gleichem Rhythmus und gleichen Tonschritten einsetzen, zum Beispiel eine Oktave tiefer.' };
    }
    case 'motiv-verarbeitung': {
      const f = findeMotive(score);
      const ok = f.some((x) => x.bezug === 'Sequenz' || x.form !== 'Thema');
      return { text: 'Das Motiv wird verarbeitet (Sequenz, Umkehrung, Krebs oder Vergrößerung)', ok, hinweis: 'Setze das Motiv zum Beispiel direkt hintereinander eine Stufe tiefer (Sequenz) oder kehre seine Richtung um.' };
    }
    case 'funktionen': {
      const ist = doc.satz.klavier ? folge(akkordStellen(score, true)) : funktionsfolge(score);
      const ok = ist.length === args.length && args.every((e, i) => funktionPasst(e, ist[i]));
      return {
        text: `Akkordfolge ${args.join(' – ').replace(/7/g, '⁷')}`,
        ok,
        hinweis: ist.length ? `Erkannt: ${ist.join(' – ')}.` : 'Noch keine vollständigen Akkorde.',
      };
    }
    case 'ganzschluss': {
      const a = akkordStellen(score, !!doc.satz.klavier);
      const [d, t] = a.slice(-2).map((s) => s?.akkord);
      const tonika = doc.key.mode === 'major' ? 'T' : 't';
      const ok = !!d && !!t && funktionPasst('D', d.funktion) && (t.funktion === tonika || t.funktion === 'T') && t.umkehrung === 0;
      return { text: 'Schluss mit Dominante und Tonika in Grundstellung (Ganzschluss)', ok, hinweis: 'Die letzten beiden Akkorde: D oder D⁷, dann die Tonika mit Grundton im Bass.' };
    }
    case 'enthaelt': {
      const e = args[0];
      const a = akkordStellen(score, !!doc.satz.klavier);
      const ok = e in UMKEHRUNG ? a.some((s) => s.akkord.umkehrung === UMKEHRUNG[e] && !s.akkord.sept) : a.some((s) => funktionPasst(e, s.akkord.funktion));
      return { text: `Enthält ${e in UMKEHRUNG ? 'einen ' + e : e.replace(/7/g, '⁷')}`, ok };
    }
    case 'endet-in': {
      const ziel = parseTonart(args.join(' '));
      const a = akkordStellen({ ...score, key: ziel }, !!doc.satz.klavier);
      const [d, t] = a.slice(-2).map((s) => s?.akkord);
      const ok = !!d && !!t && funktionPasst('D', d.funktion) && ['T', 't'].includes(t.funktion) && t.umkehrung === 0;
      return { text: 'Endet mit einer Kadenz in der neuen Tonart', ok, hinweis: 'Zum Schluss die Dominante der neuen Tonart (mit ihrem Leitton) und dann deren Tonika.' };
    }
    case 'liedtext': {
      const silben = (doc.satz.text ?? '').split(/\s+/).filter(Boolean).length;
      let anschlaege = 0;
      let gebunden = false;
      for (const e of stimmen[0]) {
        if (e.pitch && !gebunden) anschlaege++;
        gebunden = !!(e.pitch && e.tie);
      }
      return {
        text: 'Zu jeder Sopran-Note gehört eine Silbe',
        ok: anschlaege > 0 && silben === anschlaege,
        hinweis: `${anschlaege} Noten, ${silben} Silben. Den Text trägst du unter „Stück einstellen“ ein.`,
      };
    }
  }
  return { text: name, ok: false };
}
