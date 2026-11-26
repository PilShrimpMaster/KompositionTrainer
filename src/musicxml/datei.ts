import type { Score } from '../model/types';
import { validateScore } from '../model/validate';
import { dateiname, exportMusicXml } from './export';
import { importMusicXml, type ImportErgebnis } from './import';
import { entpackeMxl, istZip } from './mxl';
import { scoreAlsMidi } from '../midi/smf';

export const NOTENDATEIEN = '.json,.musicxml,.xml,.mxl,application/json,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml';

/** Öffnet eine Notendatei: eigenes JSON, MusicXML oder komprimiertes MusicXML (.mxl) */
export async function ladeNotendatei(name: string, daten: Uint8Array): Promise<ImportErgebnis> {
  try {
    if (istZip(daten)) return importMusicXml(await entpackeMxl(daten), name);
    const text = new TextDecoder().decode(daten).replace(/^﻿/, '');
    if (text.trimStart().startsWith('<')) return importMusicXml(text, name);
    const r = validateScore(JSON.parse(text));
    return r.score ? { score: r.score, hinweise: [] } : { hinweise: [], fehler: r.errors[0] };
  } catch (e) {
    return { hinweise: [], fehler: e instanceof SyntaxError ? 'Die Datei ist weder JSON noch MusicXML.' : `Die Datei ließ sich nicht lesen (${(e as Error).message}).` };
  }
}

export async function ladeDatei(f: File): Promise<ImportErgebnis> {
  return ladeNotendatei(f.name, new Uint8Array(await f.arrayBuffer()));
}

export function herunterladen(inhalt: BlobPart, name: string, typ: string) {
  const blob = new Blob([inhalt], { type: typ });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Speichert den Satz als .musicxml (öffnet sich direkt in MuseScore Studio 4) */
export function speichereMusicXml(score: Score) {
  herunterladen(exportMusicXml(score), dateiname(score.title, 'musicxml'), 'application/vnd.recordare.musicxml+xml');
}

export function speichereJson(score: Score) {
  herunterladen(JSON.stringify(score, null, 2), dateiname(score.title, 'json'), 'application/json');
}

/** Speichert den Satz als Standard-MIDI-Datei (.mid), z. B. für FL Studio */
export function speichereMidi(score: Score) {
  herunterladen(scoreAlsMidi(score) as BlobPart, dateiname(score.title, 'mid'), 'audio/midi');
}
