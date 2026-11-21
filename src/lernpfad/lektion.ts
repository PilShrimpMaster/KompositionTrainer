import { liesStil, type Stil } from '../satz/stil';
import type { Gattung } from '../kontrapunkt/fux';
import { kpSatz } from '../kontrapunkt/kurzform';
import { leseFelder, liste, parseBeispiel, trenneKopf } from '../lexikon/parse';
import type { Clef, KeySignature, NoteEvent, Pitch, Score, TimeSignature } from '../model/types';
import { satz } from '../satz/kurzform';
import { ENSEMBLES, instrument } from '../model/instrumente';
import { ensembleDoc, rebarSatz } from '../editor/satzdoc';
import type { UebungTyp } from '../uebungen/aufgaben';
import { parseNotenbeispiel, parseNotenfolge, parseSchluessel, parseTakt, parseTonart } from './kompakt';

/** Eine Schreibaufgabe, die im Editor bearbeitet und geprüft wird */
export interface Schreibaufgabe {
  id: string;
  titel: string;
  text: string;
  tonart?: KeySignature;
  takt?: TimeSignature;
  schluessel?: Clef;
  /** Kriterien für die automatische Prüfung, siehe pruefe() */
  pruefung: string[];
  /** Vierstimmiger Satz: vorgegebene Noten je Stimme (Sopran, Alt, Tenor, Bass), leere Stimmen schreibt man selbst */
  vorgabe?: NoteEvent[][];
  /** Liedtext unter dem Sopran */
  liedtext?: string;
  /** Kontrapunkt: Gattung, Lage des Cantus firmus (0 = oben, 1 = unten) und seine Noten */
  kontrapunkt?: { gattung: Gattung; cf: 0 | 1; cantus: NoteEvent[] };
  /** Klaviersatz: vorgegebene Melodie und/oder Begleitung (eine davon darf leer sein) */
  klavier?: { melodie: NoteEvent[]; begleitung: NoteEvent[] };
  /** Ensemble: Instrumente von oben nach unten und vorgegebene Noten je Stimme */
  ensemble?: { instrumente: string[]; vorgabe: NoteEvent[][] };
  /** Stilprofil der Prüfung, z. B. „romantik“ */
  stil?: Stil;
  /** Einstimmiges Leadsheet als Vorgabe: Melodie mit Akkordsymbolen */
  leadsheet?: NoteEvent[];
}

function pruefeStil(text: string): Stil {
  const s = liesStil(text);
  if (!s) throw new Error(`Unbekannter Stil „${text}“`);
  return s;
}

/** „besetzung: streichquartett“ oder „besetzung: oboe, klarinette, fagott“ und Stimmen „v1:“ bis „v8:“ */
function ensembleFelder(f: Record<string, string>): { instrumente: string[]; vorgabe: NoteEvent[][] } {
  const name = (f.besetzung ?? f.ensemble ?? '').trim();
  const instrumente = ENSEMBLES.find((e) => e.id === name)?.instrumente ?? name.split(/\s*,\s*/).filter(Boolean);
  if (!instrumente.length) throw new Error('Ensemble braucht eine besetzung');
  for (const id of instrumente) if (!instrument(id)) throw new Error(`Unbekanntes Instrument „${id}“`);
  return { instrumente, vorgabe: instrumente.map((_, k) => (f[`v${k + 1}`] ? parseNotenfolge(f[`v${k + 1}`]) : [])) };
}

/** Partitur eines Ensemble-Beispiels */
function ensembleScore(f: Record<string, string>): Score {
  const { instrumente, vorgabe } = ensembleFelder(f);
  const basis = {
    title: f.titel ?? '',
    tempo: f.tempo ? Number(f.tempo) : 80,
    time: f.takt ? parseTakt(f.takt) : { beats: 4, beatType: 4 },
    key: f.tonart ? parseTonart(f.tonart) : { fifths: 0, mode: 'major' as const },
    clef: 'treble' as const,
    events: [],
  };
  return rebarSatz(ensembleDoc(basis, instrumente, vorgabe)).score;
}

const STIMM_FELDER = ['sopran', 'alt', 'tenor', 'bass'] as const;

/** „kontrapunkt: 2“, „cantus: D3:1 F3 …“, „cf: unten“ (Standard) oder „oben“ */
function kontrapunktFelder(f: Record<string, string>): { gattung: Gattung; cf: 0 | 1; cantus: NoteEvent[] } {
  const gattung = liesGattung(f.kontrapunkt);
  // Im freien Satz ist „cantus“ ein optionaler Beginn der Oberstimme
  if (!f.cantus && gattung !== 'frei') throw new Error('Kontrapunkt-Aufgabe braucht einen cantus');
  return { gattung, cf: f.cf === 'oben' ? 0 : 1, cantus: f.cantus ? parseNotenfolge(f.cantus) : [] };
}

function liesGattung(s: string): Gattung {
  if (s === 'frei') return 'frei';
  const g = Number(s);
  if (![1, 2, 3, 4, 5].includes(g)) throw new Error(`Unbekannte Gattung „${s}“`);
  return g as Gattung;
}

/** Satz-Block: Kopfzeilen und je eine Zeile „S: …“, „A: …“, „T: …“, „B: …“ */
function parseSatzBlock(inhalt: string): { score: Score; analyse: boolean } {
  const f = leseFelder(inhalt);
  const stimmen = (['S', 'A', 'T', 'B'] as const).map((k) => {
    if (!f[k]) throw new Error(`Satz braucht die Stimme ${k}`);
    return f[k];
  }) as [string, string, string, string];
  const score = satz({ titel: f.titel ?? '', tonart: f.tonart ?? '0', takt: f.takt, tempo: f.tempo ? Number(f.tempo) : undefined, stimmen, text: f.text });
  return { score, analyse: f.analyse === 'ja' };
}

export type Baustein =
  | { art: 'text'; markdown: string }
  | { art: 'noten'; score: Score; analyse?: boolean; kontrapunkt?: { gattung: Gattung; cf: 0 | 1 }; motive?: boolean; form?: boolean; harmonien?: boolean; merkmale?: boolean }
  | { art: 'akkorde'; gruppen: Pitch[][]; klang: 'nacheinander' | 'zusammen'; schluessel: Clef; tonart?: KeySignature }
  | { art: 'uebungen'; typen: UebungTyp[] }
  | { art: 'aufgabe'; aufgabe: Schreibaufgabe };

export interface Schritt {
  titel: string;
  bausteine: Baustein[];
}

export interface Lektion {
  modul: string;
  titel: string;
  dauer?: string;
  schritte: Schritt[];
}

const FENCE = /```(noten|satz|akkorde|uebungen|aufgabe|zweistimmig|ensemble)[^\n]*\n([\s\S]*?)```/g;

function bausteine(text: string, ort: string, aufgabeNr: { n: number }, modul: string): Baustein[] {
  const out: Baustein[] = [];
  let pos = 0;
  for (const m of text.matchAll(FENCE)) {
    const davor = text.slice(pos, m.index).trim();
    if (davor) out.push({ art: 'text', markdown: davor });
    pos = m.index + m[0].length;
    const inhalt = m[2];
    try {
      switch (m[1]) {
        case 'noten':
          out.push({ art: 'noten', score: parseNotenbeispiel(inhalt), ...(/^\s*form\s*:\s*ja/m.test(inhalt) ? { form: true } : {}) });
          break;
        case 'satz':
          out.push({ art: 'noten', ...parseSatzBlock(inhalt) });
          break;
        case 'zweistimmig': {
          // Zweistimmiges Beispiel: oben/unten, optional gattung und cf (oben|unten) für die Prüfung
          const f = leseFelder(inhalt);
          if (!f.oben || !f.unten) throw new Error('Zweistimmig braucht oben und unten');
          const cf: 0 | 1 = f.cf === 'oben' ? 0 : 1;
          const gattung = f.gattung ? liesGattung(f.gattung) : undefined;
          const klavier = f.klavier === 'ja';
          const namen: [string, string] = klavier ? ['Melodie', 'Begleitung'] : gattung && gattung !== 'frei' ? (cf === 1 ? ['Kontrapunkt', 'Cantus firmus'] : ['Cantus firmus', 'Kontrapunkt']) : ['Oberstimme', 'Unterstimme'];
          const score = kpSatz({ titel: f.titel ?? '', tonart: f.tonart, takt: f.takt, tempo: f.tempo ? Number(f.tempo) : undefined, oben: f.oben, unten: f.unten, namen, ...(klavier ? { schluessel: ['treble', 'bass'] as ['treble', 'bass'] } : {}) });
          out.push({
            art: 'noten',
            score,
            ...(gattung ? { kontrapunkt: { gattung, cf } } : {}),
            ...(f.motive === 'ja' ? { motive: true } : {}),
            ...(klavier ? { harmonien: true } : {}),
            ...(f.form === 'ja' ? { form: true } : {}),
          });
          break;
        }
        case 'ensemble': {
          const f = leseFelder(inhalt);
          const score = ensembleScore(f);
          out.push({ art: 'noten', score, ...(f.analyse === 'ja' ? { analyse: true } : {}), ...(f.form === 'ja' ? { form: true } : {}) });
          break;
        }
        case 'akkorde': {
          const zeilen = inhalt.split('\n').map((z) => z.trim()).filter(Boolean);
          const felder = leseFelder(zeilen.filter((z) => z.includes(':')).join('\n'));
          const toene = zeilen.filter((z) => !z.includes(':')).join(' | ');
          out.push({
            art: 'akkorde',
            gruppen: parseBeispiel(toene),
            klang: felder.klang === 'nacheinander' ? 'nacheinander' : 'zusammen',
            schluessel: parseSchluessel(felder.schluessel),
            tonart: felder.tonart ? parseTonart(felder.tonart) : undefined,
          });
          break;
        }
        case 'uebungen':
          out.push({ art: 'uebungen', typen: inhalt.split(/\s+/).filter(Boolean) as UebungTyp[] });
          break;
        case 'aufgabe': {
          const f = leseFelder(inhalt);
          if (!f.titel || !f.text) throw new Error('Aufgabe braucht titel und text');
          out.push({
            art: 'aufgabe',
            aufgabe: {
              id: `${modul}-${++aufgabeNr.n}`,
              titel: f.titel,
              text: f.text,
              tonart: f.tonart ? parseTonart(f.tonart) : undefined,
              takt: f.takt ? parseTakt(f.takt) : undefined,
              schluessel: f.schluessel ? parseSchluessel(f.schluessel) : undefined,
              pruefung: liste(f.pruefung),
              ...(f.stil ? { stil: pruefeStil(f.stil) } : {}),
              ...(f.kontrapunkt
                ? { kontrapunkt: kontrapunktFelder(f) }
                : {}),
              ...(f.klavier === 'ja'
                ? { klavier: { melodie: f.melodie ? parseNotenfolge(f.melodie) : [], begleitung: f.begleitung ? parseNotenfolge(f.begleitung) : [] } }
                : {}),
              ...(f.besetzung ? { ensemble: ensembleFelder(f) } : {}),
              ...(f.leadsheet ? { leadsheet: parseNotenfolge(f.leadsheet) } : {}),
              ...(f.satz === 'ja'
                ? { vorgabe: STIMM_FELDER.map((k) => (f[k] ? parseNotenfolge(f[k]) : [])), liedtext: f.liedtext || undefined }
                : {}),
            },
          });
          break;
        }
      }
      // Beispiele mit Stilprofil („stil: romantik“) und Stilmerkmal-Anzeige („merkmale: ja“)
      const letzter = out[out.length - 1];
      if (m[1] !== 'aufgabe' && letzter?.art === 'noten') {
        const stil = /^\s*stil\s*:\s*(\S+)/m.exec(inhalt);
        if (stil) letzter.score.stil = pruefeStil(stil[1]);
        if (/^\s*merkmale\s*:\s*ja/m.test(inhalt)) letzter.merkmale = true;
      }
    } catch (e) {
      throw new Error(`${ort}: ${(e as Error).message}`);
    }
  }
  const rest = text.slice(pos).trim();
  if (rest) out.push({ art: 'text', markdown: rest });
  return out;
}

/** Liest eine Lektion: Kopfzeilen, dann Schritte mit „## Überschrift“ */
export function parseLektion(quelle: string, datei = '?'): Lektion {
  const { kopf, text } = trenneKopf(quelle, datei);
  if (!kopf.modul || !kopf.titel) throw new Error(`${datei}: modul und titel fehlen`);
  const teile = text.split(/^## +(.+)$/m);
  const schritte: Schritt[] = [];
  const nr = { n: 0 };
  if (teile[0].trim()) schritte.push({ titel: 'Einführung', bausteine: bausteine(teile[0], datei, nr, kopf.modul) });
  for (let i = 1; i < teile.length; i += 2) {
    schritte.push({ titel: teile[i].trim(), bausteine: bausteine(teile[i + 1] ?? '', `${datei} „${teile[i].trim()}“`, nr, kopf.modul) });
  }
  return { modul: kopf.modul, titel: kopf.titel, dauer: kopf.dauer, schritte };
}
