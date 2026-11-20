import { germanKeyName } from '../model/pitch';
import type { Score } from '../model/types';
import { analysiereForm, kadenzText } from '../satz/form';
import { klavierHarmonien } from '../satz/klavier';
import { funktionsfolge } from '../satz/analyse';
import type { Befund } from '../satz/regeln';
import { stimmeKurz } from './erklaeren';
import { rebar } from '../editor/rebar';
import { emptyDoc } from '../editor/state';
import { parseNotenfolge } from '../lernpfad/kompakt';

/**
 * KI-Feedback zu eigenen Kompositionen: Claude bekommt das ganze Stück in Kurzform
 * und die Analyse der App (Form, Kadenzen, Harmonien, Befunde) und antwortet als Kompositionslehrer.
 */
export const FEEDBACK_SYSTEM = `Du bist Kompositionslehrer in einer Lern-App. Die Person will Profikomponist werden, lernt allein, liest Noten, kennt Harmonielehre und Kontrapunkt-Grundlagen, spielt Saxophon und schreibt größere Werke in MuseScore.
Schreibe Deutsch, duze die Person, verwende deutsche Tonnamen (H statt B, B für Hb, Fis, Es) und Funktionsbezeichnungen (T, S, D, Tp …). Nenne Stellen immer mit Taktzahl.
Gib Feedback wie ein guter Lehrer in der Kompositionsstunde: zuerst, was musikalisch gelingt (konkret, nicht pauschal), dann höchstens drei Verbesserungen, die am meisten bringen, jeweils mit einem konkreten Vorschlag, was man ändern könnte und warum es dann besser klingt. Ordne das Stück stilistisch ein (z. B. klassisches Menuett, Choral, Invention, Popsong) und miss es an diesem Stil.
Wiederhole keine Regelverstöße, die die App schon meldet, außer um zu sagen, welcher davon am wichtigsten ist. Achte vor allem auf das, was eine Regelprüfung nicht sieht: Melodiebogen und Höhepunkt, Motivarbeit, Spannung und Entspannung, Proportionen der Form, Kadenzplan, Abwechslung im Rhythmus, Charakter.
Wo es hilft, gib zu einer Verbesserung ein kurzes Notenbeispiel (die geänderte Oberstimme der genannten Takte, vollständige Takte in der Taktart des Stücks). Noten schreibst du in der Kurzform der App: Ton mit Oktave (C4 = eingestrichenes c, F#4, Bb3; r = Pause), Doppelpunkt, Notenwert (1 2 4 8 16, Punkt mit .), | als Taktstrich. Englische Tonbuchstaben: B4 ist das deutsche h′.
Fasse dich kurz: insgesamt höchstens etwa 250 Wörter.`;

export const FEEDBACK_SCHEMA = {
  type: 'object',
  properties: {
    einordnung: { type: 'string', description: 'Ein bis zwei Sätze: Stil, Form und Gesamteindruck' },
    staerken: { type: 'array', description: 'Zwei bis drei konkrete Stärken mit Taktangabe', items: { type: 'string' } },
    verbesserungen: {
      type: 'array',
      description: 'Höchstens drei Verbesserungen, die wichtigste zuerst',
      items: {
        type: 'object',
        properties: {
          takte: { type: 'string', description: 'z. B. „Takt 5–8“ oder „ganzes Stück“' },
          beobachtung: { type: 'string', description: 'Was hier passiert und wie es wirkt' },
          vorschlag: { type: 'string', description: 'Was du ändern würdest und warum es dann besser klingt' },
          beispiel: { type: 'string', description: 'Die geänderte Melodie dieser Takte in der Kurzform (eine Stimme, ganze Takte), oder leer' },
        },
        required: ['takte', 'beobachtung', 'vorschlag', 'beispiel'],
        additionalProperties: false,
      },
    },
    naechsterSchritt: { type: 'string', description: 'Eine konkrete Übung oder Aufgabe für die nächste Arbeitssitzung' },
  },
  required: ['einordnung', 'staerken', 'verbesserungen', 'naechsterSchritt'],
  additionalProperties: false,
} as const;

export const FOKUS = {
  allgemein: 'Allgemein',
  melodie: 'Melodie und Motiv',
  harmonie: 'Harmonik und Begleitung',
  form: 'Form und Proportionen',
} as const;
export type Fokus = keyof typeof FOKUS;

const FOKUS_TEXT: Record<Fokus, string> = {
  allgemein: 'Gib ein ausgewogenes Feedback zu allen Aspekten.',
  melodie: 'Konzentriere dich auf die Melodie: Bogen, Höhepunkt, Motiv und seine Verarbeitung, Phrasierung, Rhythmus.',
  harmonie: 'Konzentriere dich auf Harmonik und Begleitung: Akkordwahl, Kadenzen, Bassführung, Begleitmuster, harmonischer Rhythmus.',
  form: 'Konzentriere dich auf die Form: Gliederung, Proportionen, Wiederholung und Kontrast, Kadenzplan, Höhepunkt im Ganzen.',
};

export interface FeedbackKontext {
  /** Name der Besetzung, z. B. „Klaviersatz“ */
  besetzung: string;
  befunde: Befund[];
  /** Text der Schreibaufgabe, falls das Stück eine Aufgabe löst */
  aufgabe?: string;
  fokus: Fokus;
}

/** Die Anfrage an Claude: Stück in Kurzform plus Analyse der App */
export function feedbackAnfrage(score: Score, k: FeedbackKontext): string {
  const takte = Math.max(...score.voices.map((v) => v.measures.length));
  const form = analysiereForm(score);
  const harmonien =
    score.voices.length === 2 && k.besetzung === 'Klaviersatz'
      ? klavierHarmonien(score)
          .map((h) => `${h.takt + 1}:${h.kurz}`)
          .join(' ')
      : score.voices.length === 4
        ? funktionsfolge(score).join(' – ')
        : '';
  const befunde = k.befunde.slice(0, 8).map((b) => `- Takt ${b.takt}${b.bisTakt && b.bisTakt !== b.takt ? `–${b.bisTakt}` : ''} (${b.art}): ${b.text}`);
  return [
    `Mein Stück „${score.title}“: ${k.besetzung}, ${germanKeyName(score.key)}, ${score.time.beats}/${score.time.beatType}-Takt, Tempo ${score.tempo}, ${takte} Takte.`,
    k.aufgabe ? `Es ist meine Lösung dieser Aufgabe: ${k.aufgabe}` : '',
    '',
    'Noten:',
    ...score.voices.map((v, i) => `${v.name ?? `Stimme ${i + 1}`}: ${stimmeKurz(score, i)}`),
    '',
    'Analyse der App (automatisch, kann irren):',
    `- Form: ${form.form ?? 'keine bekannte Form erkannt'}; Zweitakter ${form.glieder.map((g) => g.name).join(' ') || '–'}`,
    form.kadenzen.length ? `- Kadenzen: ${form.kadenzen.map(kadenzText).join('; ')}` : '',
    harmonien ? `- Harmonien: ${harmonien}` : '',
    befunde.length ? `- Befunde der Regelprüfung:\n${befunde.join('\n')}` : '- Die Regelprüfung findet keine Fehler.',
    '',
    FOKUS_TEXT[k.fokus],
  ]
    .filter((z) => z !== '')
    .join('\n');
}

export interface Feedback {
  einordnung: string;
  staerken: string[];
  verbesserungen: { takte: string; beobachtung: string; vorschlag: string; beispiel: Score | null }[];
  naechsterSchritt: string;
}

const text = (x: unknown) => (typeof x === 'string' ? x.trim() : '');

/** Ein Notenbeispiel aus der Kurzform, in Tonart und Takt des Stücks; null, wenn es nicht lesbar ist */
function beispielLesen(kurz: string, vorlage: Score | null, titel: string): Score | null {
  if (!vorlage || !kurz.trim()) return null;
  try {
    const events = parseNotenfolge(kurz);
    if (!events.some((e) => e.pitch)) return null;
    return rebar({ ...emptyDoc(), title: titel, tempo: vorlage.tempo, key: vorlage.key, time: vorlage.time, clef: vorlage.voices[0]?.clef === 'bass' ? 'bass' : 'treble', events }).score;
  } catch {
    return null;
  }
}

export function feedbackLesen(json: string, vorlage: Score | null = null): Feedback {
  const roh = JSON.parse(json) as Record<string, unknown>;
  const staerken = Array.isArray(roh.staerken) ? roh.staerken.map(text).filter(Boolean).slice(0, 4) : [];
  const verbesserungen = Array.isArray(roh.verbesserungen)
    ? (roh.verbesserungen as Record<string, unknown>[])
        .map((v) => ({ takte: text(v?.takte), beobachtung: text(v?.beobachtung), vorschlag: text(v?.vorschlag), beispiel: beispielLesen(text(v?.beispiel), vorlage, `Vorschlag: ${text(v?.takte)}`) }))
        .filter((v) => v.beobachtung || v.vorschlag)
        .slice(0, 3)
    : [];
  return { einordnung: text(roh.einordnung), staerken, verbesserungen, naechsterSchritt: text(roh.naechsterSchritt) };
}
