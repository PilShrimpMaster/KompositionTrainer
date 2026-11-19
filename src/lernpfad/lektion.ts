import { leseFelder, liste, parseBeispiel, trenneKopf } from '../lexikon/parse';
import type { Clef, KeySignature, Pitch, Score, TimeSignature } from '../model/types';
import type { UebungTyp } from '../uebungen/aufgaben';
import { parseNotenbeispiel, parseSchluessel, parseTakt, parseTonart } from './kompakt';

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
}

export type Baustein =
  | { art: 'text'; markdown: string }
  | { art: 'noten'; score: Score }
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

const FENCE = /```(noten|akkorde|uebungen|aufgabe)[^\n]*\n([\s\S]*?)```/g;

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
          out.push({ art: 'noten', score: parseNotenbeispiel(inhalt) });
          break;
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
            },
          });
          break;
        }
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
