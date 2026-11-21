import { germanKeyName } from '../model/pitch';
import type { Duration, NoteEvent, Pitch, Score } from '../model/types';
import { satz } from '../satz/kurzform';
import { pruefeSatz, regel, type Befund } from '../satz/regeln';
import type { Aufgabe } from '../uebungen/aufgaben';

export const KI_MODELL = 'claude-opus-5-5';

/* ---------- Satz → Kurzform ---------- */

const WERT: Record<Duration['type'], string> = { whole: '1', half: '2', quarter: '4', eighth: '8', '16th': '16' };
const VZ: Record<number, string> = { [-2]: 'bb', [-1]: 'b', 0: '', 1: '#', 2: '##' };

export function tonKurz(p: Pitch): string {
  return `${p.step}${VZ[p.alter ?? 0] ?? ''}${p.octave}`;
}

export function noteKurz(ev: NoteEvent): string {
  const d = `${WERT[ev.duration.type]}${'.'.repeat(ev.duration.dots ?? 0)}`;
  return `${ev.pitch ? tonKurz(ev.pitch) : 'r'}:${d}${ev.tie ? '~' : ''}${ev.fermata ? '^' : ''}${ev.akkord ? `[${ev.akkord}]` : ''}`;
}

/** Eine Stimme als „G4:4 A4:4 | B4:2 …“, optional nur die Takte von–bis (ab 1) */
export function stimmeKurz(score: Score, stimme: number, von = 1, bis = Infinity): string {
  const takte = score.voices[stimme]?.measures ?? [];
  return takte
    .slice(von - 1, Math.min(bis, takte.length))
    .map((m) => m.notes.map(noteKurz).join(' '))
    .join(' | ');
}

export function tonartKurz(score: Score): string {
  return `${score.key.fifths}${score.key.mode === 'minor' ? ' moll' : ''}`;
}

/** Takte rund um einen Befund: einer davor, einer danach */
export function bereich(score: Score, befund: Pick<Befund, 'takt' | 'bisTakt'>): [number, number] {
  const anzahl = Math.max(...score.voices.map((v) => v.measures.length));
  const von = Math.max(1, befund.takt - 1);
  const bis = Math.min(anzahl, (befund.bisTakt ?? befund.takt) + 1);
  return [von, Math.max(von, bis)];
}

export function ausschnitt(score: Score, von: number, bis: number, titel = `Takt ${von}–${bis}`): Score {
  const stimmen = [0, 1, 2, 3].map((i) => stimmeKurz(score, i, von, bis)) as [string, string, string, string];
  return satz({ titel, tonart: tonartKurz(score), takt: `${score.time.beats}/${score.time.beatType}`, tempo: score.tempo, stimmen });
}

/* ---------- Anfragen ---------- */

export const SYSTEM = `Du bist ein geduldiger Tonsatz-Lehrer in einer Lern-App für klassische Komposition. Die Person lernt allein, liest Noten, kennt Grundlagen der Harmonielehre und spielt Saxophon.
Schreibe Deutsch, duze die Person, verwende deutsche Tonnamen (H statt B, B für Hb, Fis, Es usw.) und Funktionsbezeichnungen (T, S, D, D⁷, Tp, Sp, Dp, Tg …).
Erkläre knapp und anschaulich: warum es die Regel gibt (wie es klingt, was in der Stimmführung passiert), nicht nur, dass sie verletzt wurde. Höchstens etwa 120 Wörter.

Noten schreibst du in dieser Kurzform: Ton mit Oktave (C4 = eingestrichenes c, F#4, Bb3; r = Pause), Doppelpunkt, Notenwert (1 2 4 8 16, Punkt mit .), ~ für Haltebogen, ^ für Fermate, | als Taktstrich. Englische Tonbuchstaben: B4 ist das deutsche h′, Bb4 das b′.
Jeder Korrekturvorschlag enthält alle vier Stimmen (Sopran, Alt, Tenor, Bass) für genau dieselben Takte wie der gezeigte Ausschnitt, mit derselben Anzahl Takte und vollständig gefüllten Takten. Ändere so wenig wie möglich und nur, was den Fehler behebt. Ein Vorschlag darf keine neuen Regelverstöße enthalten (keine Parallelen, Stimmumfang S C4–A5, A G3–D5, T C3–G4, B E2–D4, Abstand benachbarter Oberstimmen höchstens eine Oktave, Leitton aufwärts, Septime abwärts).`;

export const SCHEMA = {
  type: 'object',
  properties: {
    erklaerung: { type: 'string', description: 'Warum es die Regel gibt und was hier passiert' },
    vorschlaege: {
      type: 'array',
      description: 'Zwei bis drei verschiedene Korrekturen; leer, wenn keine Noten nötig sind',
      items: {
        type: 'object',
        properties: {
          beschreibung: { type: 'string', description: 'Ein Satz: was geändert wurde und warum es klingt' },
          sopran: { type: 'string' },
          alt: { type: 'string' },
          tenor: { type: 'string' },
          bass: { type: 'string' },
        },
        required: ['beschreibung', 'sopran', 'alt', 'tenor', 'bass'],
        additionalProperties: false,
      },
    },
  },
  required: ['erklaerung', 'vorschlaege'],
  additionalProperties: false,
} as const;

/** Anfrage zu einem Befund der Satzprüfung */
export function satzAnfrage(befund: Befund, score: Score): { text: string; von: number; bis: number } {
  const [von, bis] = bereich(score, befund);
  const r = regel(befund.regel);
  const namen = ['Sopran', 'Alt', 'Tenor', 'Bass'];
  const takte = befund.bisTakt && befund.bisTakt !== befund.takt ? `Takt ${befund.takt}–${befund.bisTakt}` : `Takt ${befund.takt}`;
  const text = [
    `Vierstimmiger Satz in ${germanKeyName(score.key)}, ${score.time.beats}/${score.time.beatType}-Takt.`,
    '',
    'Ganzer Satz:',
    ...namen.map((n, i) => `${n}: ${stimmeKurz(score, i)}`),
    '',
    `Die Prüfung meldet einen ${befund.art === 'fehler' ? 'Fehler' : 'Stilhinweis'} (${r?.titel ?? befund.regel}) in ${takte}: ${befund.text}`,
    '',
    `Ausschnitt Takt ${von}–${bis}, für den du Korrekturen vorschlägst:`,
    ...namen.map((n, i) => `${n}: ${stimmeKurz(score, i, von, bis)}`),
    '',
    'Erkläre, warum es diese Regel gibt und was hier konkret passiert. Schlage dann zwei bis drei verschiedene Korrekturen für genau diesen Ausschnitt vor.',
  ].join('\n');
  return { text, von, bis };
}

/** Anfrage zu einer Übungsaufgabe nach dem Antworten */
export function uebungAnfrage(a: Aufgabe, antwort: string | null): string {
  const zeilen = [
    `Übungsaufgabe: ${a.frage}`,
    a.optionen.length ? `Antwortmöglichkeiten: ${a.optionen.join(' / ')}` : '',
    `Richtige Lösung: ${a.loesung}`,
    antwort && antwort !== a.loesung ? `Gewählt wurde: ${antwort}` : antwort ? 'Die Antwort war richtig.' : '',
    a.noten ? `Gezeigte Töne: ${a.noten.groups.map((g) => g.map(tonKurz).join(' ')).join(' | ')}` : '',
    a.satz ? `Gezeigter Satz in ${germanKeyName(a.satz.key)}:\n${['Sopran', 'Alt', 'Tenor', 'Bass'].map((n, i) => `${n}: ${stimmeKurz(a.satz!, i)}`).join('\n')}` : '',
    a.diktat ? `Diktat, richtige Töne: ${a.diktat.map(tonKurz).join(' ')}` : '',
    `Kurze Erklärung der App: ${a.erklaerung}`,
    '',
    a.satz
      ? 'Erkläre ausführlicher, woran man die Lösung erkennt und hört. Wenn es um einen Fehler im Satz geht, schlage zwei bis drei Korrekturen für den ganzen gezeigten Satz vor; sonst lass die Vorschläge leer.'
      : 'Erkläre ausführlicher, woran man die Lösung erkennt und hört, und gib einen Merktipp. Lass die Vorschläge leer.',
  ];
  return zeilen.filter((z) => z !== '').join('\n');
}

/* ---------- Antwort ---------- */

export interface Vorschlag {
  beschreibung: string;
  /** Der Ausschnitt mit der Korrektur, oder null, wenn die Noten nicht lesbar waren */
  score: Score | null;
  /** Fehler, die unsere eigene Prüfung im Vorschlag noch findet */
  restfehler: number;
}

export interface Erklaerung {
  erklaerung: string;
  vorschlaege: Vorschlag[];
}

interface RohVorschlag {
  beschreibung?: unknown;
  sopran?: unknown;
  alt?: unknown;
  tenor?: unknown;
  bass?: unknown;
}

/** Liest die JSON-Antwort und baut aus jedem Vorschlag einen abspielbaren Satz */
export function antwortLesen(json: string, vorlage: Score | null): Erklaerung {
  const roh = JSON.parse(json) as { erklaerung?: unknown; vorschlaege?: unknown };
  const erklaerung = typeof roh.erklaerung === 'string' ? roh.erklaerung.trim() : '';
  const liste = Array.isArray(roh.vorschlaege) ? (roh.vorschlaege as RohVorschlag[]) : [];
  const vorschlaege = liste.slice(0, 3).map((v): Vorschlag => {
    const beschreibung = typeof v.beschreibung === 'string' ? v.beschreibung : '';
    if (!vorlage) return { beschreibung, score: null, restfehler: 0 };
    try {
      const stimmen = [v.sopran, v.alt, v.tenor, v.bass].map((s) => (typeof s === 'string' ? s : '')) as [string, string, string, string];
      if (stimmen.some((s) => !s.trim())) throw new Error('Stimme fehlt');
      const score = satz({
        titel: '',
        tonart: tonartKurz(vorlage),
        takt: `${vorlage.time.beats}/${vorlage.time.beatType}`,
        tempo: vorlage.tempo,
        stimmen,
      });
      const restfehler = pruefeSatz(score, { hinweise: false }).filter((b) => b.art === 'fehler').length;
      return { beschreibung, score, restfehler };
    } catch {
      return { beschreibung, score: null, restfehler: 0 };
    }
  });
  return { erklaerung, vorschlaege };
}
