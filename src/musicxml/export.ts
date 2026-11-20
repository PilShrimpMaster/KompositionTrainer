import { measureLength, quarterLength } from '../model/duration';
import type { Duration, NoteEvent, Score, Voice } from '../model/types';

/** Teilungen je Viertel: 16 erlaubt auch doppelt punktierte Sechzehntel */
export const DIVISIONS = 16;

const TYP: Record<Duration['type'], string> = { whole: 'whole', half: 'half', quarter: 'quarter', eighth: 'eighth', '16th': '16th' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Stimmen, die sich ein System teilen, landen in einer Stimme (Part) mit mehreren Voices */
export function partsAus(score: Score): Voice[][] {
  const parts: Voice[][] = [];
  const nachSystem = new Map<number, Voice[]>();
  for (const v of score.voices) {
    if (v.staff === undefined) {
      parts.push([v]);
      continue;
    }
    let p = nachSystem.get(v.staff);
    if (!p) {
      p = [];
      nachSystem.set(v.staff, p);
      parts.push(p);
    }
    p.push(v);
  }
  return parts;
}

function partName(voices: Voice[]): string {
  return voices.map((v) => v.name).join(' / ');
}

function noteXml(ev: NoteEvent, voiceNr: number, stem: string | undefined, tieStop: boolean): string {
  const dur = Math.round(quarterLength(ev.duration) * DIVISIONS);
  const teile: string[] = ['<note>'];
  if (ev.pitch) {
    teile.push(
      `<pitch><step>${ev.pitch.step}</step>${ev.pitch.alter ? `<alter>${ev.pitch.alter}</alter>` : ''}<octave>${ev.pitch.octave}</octave></pitch>`,
    );
  } else {
    teile.push('<rest/>');
  }
  teile.push(`<duration>${dur}</duration>`);
  if (ev.pitch && tieStop) teile.push('<tie type="stop"/>');
  if (ev.pitch && ev.tie) teile.push('<tie type="start"/>');
  teile.push(`<voice>${voiceNr}</voice>`, `<type>${TYP[ev.duration.type]}</type>`);
  for (let i = 0; i < (ev.duration.dots ?? 0); i++) teile.push('<dot/>');
  if (ev.pitch && stem) teile.push(`<stem>${stem}</stem>`);
  const notations: string[] = [];
  if (ev.pitch && tieStop) notations.push('<tied type="stop"/>');
  if (ev.pitch && ev.tie) notations.push('<tied type="start"/>');
  if (ev.fermata) notations.push('<fermata type="upright"/>');
  if (notations.length) teile.push(`<notations>${notations.join('')}</notations>`);
  if (ev.lyric && ev.pitch) {
    const t = ev.lyric.trim();
    const weiter = t.endsWith('-');
    teile.push(`<lyric number="1"><syllabic>${weiter ? 'begin' : 'single'}</syllabic><text>${esc(weiter ? t.slice(0, -1) : t)}</text></lyric>`);
  }
  teile.push('</note>');
  return teile.join('');
}

/** Silbentrennung wie im Liedtext: „Lo- be den“ → begin/end statt single */
function silbenKorrigieren(xml: string): string {
  // Eine Silbe nach einer „begin“-Silbe ist „middle“ oder „end“
  let offen = false;
  return xml.replace(/<syllabic>(begin|single)<\/syllabic>/g, (_, art: string) => {
    let neu: string;
    if (offen) neu = art === 'begin' ? 'middle' : 'end';
    else neu = art;
    offen = art === 'begin';
    return `<syllabic>${neu}</syllabic>`;
  });
}

/** Wandelt einen Satz in MusicXML 3.1 (score-partwise), lesbar von MuseScore, Finale, Sibelius, Dorico */
export function exportMusicXml(score: Score): string {
  const parts = partsAus(score);
  const takte = Math.max(...score.voices.map((v) => v.measures.length));
  const voll = Math.round(measureLength(score.time) * DIVISIONS);
  const out: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.1 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="3.1">',
    `<work><work-title>${esc(score.title)}</work-title></work>`,
    '<identification>',
    score.composer ? `<creator type="composer">${esc(score.composer)}</creator>` : '',
    '<encoding><software>KompositionsTrainer</software></encoding>',
    '</identification>',
    '<part-list>',
    ...parts.map((p, i) => `<score-part id="P${i + 1}"><part-name>${esc(partName(p))}</part-name></score-part>`),
    '</part-list>',
  ];

  parts.forEach((voices, pi) => {
    out.push(`<part id="P${pi + 1}">`);
    const tieOffen = voices.map(() => false);
    for (let m = 0; m < takte; m++) {
      out.push(`<measure number="${m + 1}">`);
      if (m === 0) {
        out.push(
          `<attributes><divisions>${DIVISIONS}</divisions><key><fifths>${score.key.fifths}</fifths><mode>${score.key.mode}</mode></key>` +
            `<time><beats>${score.time.beats}</beats><beat-type>${score.time.beatType}</beat-type></time>` +
            `<clef>${voices[0].clef === 'bass' ? '<sign>F</sign><line>4</line>' : '<sign>G</sign><line>2</line>'}</clef></attributes>`,
        );
        if (pi === 0) out.push(`<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${score.tempo}</per-minute></metronome></direction-type><sound tempo="${score.tempo}"/></direction>`);
      }
      voices.forEach((v, vi) => {
        const noten = v.measures[m]?.notes ?? [];
        let laenge = 0;
        if (vi > 0) out.push(`<backup><duration>${0}</duration></backup>`); // wird unten ersetzt
        const stem = voices.length > 1 ? (v.stem ?? (vi === 0 ? 'up' : 'down')) : undefined;
        if (noten.length === 0) {
          out.push(`<note><rest measure="yes"/><duration>${voll}</duration><voice>${vi + 1}</voice></note>`);
          laenge = voll;
          tieOffen[vi] = false;
        }
        for (const ev of noten) {
          out.push(noteXml(ev, vi + 1, stem, tieOffen[vi]));
          tieOffen[vi] = !!(ev.pitch && ev.tie);
          laenge += Math.round(quarterLength(ev.duration) * DIVISIONS);
        }
        // Rücksprung für die nächste Stimme: so lang wie diese Stimme im Takt
        if (vi < voices.length - 1) out.push(`<!--laenge:${laenge}-->`);
      });
      if (m === takte - 1) out.push('<barline location="right"><bar-style>light-heavy</bar-style></barline>');
      out.push('</measure>');
    }
    out.push('</part>');
  });
  out.push('</score-partwise>');

  // Platzhalter für <backup> mit der wirklichen Länge der vorigen Stimme füllen
  let xml = out.filter(Boolean).join('\n');
  xml = xml.replace(/<!--laenge:(\d+)-->\n<backup><duration>0<\/duration><\/backup>/g, (_, n: string) => `<backup><duration>${n}</duration></backup>`);
  return silbenKorrigieren(xml);
}

export function dateiname(titel: string, endung: string): string {
  return `${titel.replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '') || 'noten'}.${endung}`;
}
