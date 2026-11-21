import { harmonyLesen } from '../jazz/harmonyXml';
import { erkenneInstrument, verschiebe } from '../model/instrumente';
import type { Clef, Duration, DurationType, KeySignature, NoteEvent, Pitch, Score, Step, TimeSignature, Voice } from '../model/types';
import { measureLength, quarterLength } from '../model/duration';
import { validateScore } from '../model/validate';

export interface ImportErgebnis {
  score?: Score;
  /** Was nicht oder nur angenähert übernommen wurde */
  hinweise: string[];
  fehler?: string;
}

const TYPEN: Record<string, DurationType> = {
  whole: 'whole',
  half: 'half',
  quarter: 'quarter',
  eighth: 'eighth',
  '16th': '16th',
};

/** Alle Notenwerte, die das Modell kennt, von lang nach kurz */
const WERTE: Duration[] = (['whole', 'half', 'quarter', 'eighth', '16th'] as DurationType[])
  .flatMap((type) => [{ type, dots: 1 }, { type }] as Duration[])
  .sort((a, b) => quarterLength(b) - quarterLength(a));

/** Zerlegt eine Länge (in Vierteln) in möglichst wenige Notenwerte */
export function zerlege(viertel: number): Duration[] {
  const out: Duration[] = [];
  let rest = viertel;
  for (const w of WERTE) {
    const l = quarterLength(w);
    while (rest >= l - 1e-6) {
      out.push(w.dots ? { type: w.type, dots: w.dots } : { type: w.type });
      rest -= l;
    }
  }
  return out;
}

const kinder = (el: Element, name: string): Element[] => Array.from(el.children).filter((c) => c.localName === name);
const kind = (el: Element | undefined | null, name: string): Element | undefined => (el ? kinder(el, name)[0] : undefined);
const text = (el: Element | undefined | null, name: string): string | undefined => kind(el, name)?.textContent?.trim() || undefined;
const zahl = (el: Element | undefined | null, name: string): number | undefined => {
  const t = text(el, name);
  return t === undefined || Number.isNaN(Number(t)) ? undefined : Number(t);
};

interface StimmeBau {
  staff: number;
  voice: string;
  /** Takt → Noten */
  takte: Map<number, NoteEvent[]>;
  /** Position innerhalb des aktuellen Takts in Vierteln */
  pos: number;
  reihenfolge: number;
}

function midiAehnlich(p: Pitch): number {
  return p.octave * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 } as Record<Step, number>)[p.step] + (p.alter ?? 0);
}

/** Liest MusicXML (score-partwise) ins eigene Notenmodell */
export function importMusicXml(xml: string, dateiname = 'Import', Parser: typeof DOMParser = DOMParser): ImportErgebnis {
  const hinweise = new Set<string>();
  const doc = new Parser().parseFromString(xml, 'application/xml');
  const wurzel = doc.documentElement;
  if (!wurzel || wurzel.localName === 'parsererror' || doc.getElementsByTagName('parsererror').length) {
    return { hinweise: [], fehler: 'Die Datei ist kein gültiges XML.' };
  }
  if (wurzel.localName === 'score-timewise') {
    return { hinweise: [], fehler: 'Diese Datei ist „timewise“ gespeichert. Bitte in MuseScore als normales MusicXML exportieren.' };
  }
  if (wurzel.localName !== 'score-partwise') return { hinweise: [], fehler: 'Das ist keine MusicXML-Partitur.' };

  const titel =
    text(kind(wurzel, 'work'), 'work-title') ?? text(wurzel, 'movement-title') ?? dateiname.replace(/\.(musicxml|xml|mxl)$/i, '');
  const komponist = Array.from(wurzel.getElementsByTagName('creator')).find((c) => c.getAttribute('type') === 'composer')?.textContent?.trim();
  const tempoEl = Array.from(wurzel.getElementsByTagName('sound')).find((s) => s.getAttribute('tempo'));
  const tempo = tempoEl ? Math.round(Math.min(300, Math.max(20, Number(tempoEl.getAttribute('tempo'))))) : 80;

  const partNamen = new Map<string, string>();
  const partInstrument = new Map<string, string | undefined>();
  for (const sp of Array.from(wurzel.getElementsByTagName('score-part'))) {
    const id = sp.getAttribute('id') ?? '';
    const name = text(sp, 'part-name') ?? text(sp, 'part-abbreviation') ?? 'Stimme';
    partNamen.set(id, name);
    const si = kind(sp, 'score-instrument');
    partInstrument.set(id, erkenneInstrument(text(si, 'instrument-sound') ?? undefined, text(si, 'instrument-name') ?? name) ?? erkenneInstrument(undefined, text(sp, 'part-abbreviation') ?? undefined));
  }

  let key: KeySignature | undefined;
  let time: TimeSignature | undefined;
  const taktLaengen: number[] = [];
  const stimmen: StimmeBau[] = [];
  const schluessel = new Map<number, Clef>();
  const systemName = new Map<number, string>();
  const systemInstrument = new Map<number, string>();
  let systemOffset = 0;
  let reihenfolge = 0;

  for (const part of kinder(wurzel, 'part')) {
    const name = partNamen.get(part.getAttribute('id') ?? '') ?? 'Stimme';
    const partIns = partInstrument.get(part.getAttribute('id') ?? '');
    let divisions = 1;
    let staves = 1;
    /** Transposition der Stimme (<transpose>): notiert → klingend */
    let trans = { stufen: 0, halbtoene: 0 };
    const imPart = new Map<string, StimmeBau>();

    kinder(part, 'measure').forEach((takt, ti) => {
      let cursor = 0; // in Vierteln
      let akkordOffen: string | undefined; // Akkordsymbol für die nächste Note
      let maxPos = 0;
      let letzte: { ev: NoteEvent; bass: boolean } | null = null;

      for (const el of Array.from(takt.children)) {
        switch (el.localName) {
          case 'attributes': {
            divisions = zahl(el, 'divisions') ?? divisions;
            staves = zahl(el, 'staves') ?? staves;
            const tr = kind(el, 'transpose');
            if (tr) {
              const okt = zahl(tr, 'octave-change') ?? 0;
              trans = { stufen: (zahl(tr, 'diatonic') ?? 0) + 7 * okt, halbtoene: (zahl(tr, 'chromatic') ?? 0) + 12 * okt };
            }
            const k = kind(el, 'key');
            if (k) {
              // Bei transponierenden Stimmen die klingende Tonart zurückrechnen
              const q = (((trans.halbtoene * 7) % 12) + 12) % 12;
              let fifths = (zahl(k, 'fifths') ?? 0) + (q > 6 ? q - 12 : q);
              if (fifths > 7) fifths -= 12;
              if (fifths < -7) fifths += 12;
              const neu: KeySignature = { fifths, mode: text(k, 'mode') === 'minor' ? 'minor' : 'major' };
              if (!key) key = neu;
              else if (key.fifths !== neu.fifths || key.mode !== neu.mode) hinweise.add('Tonartwechsel im Stück werden nicht übernommen; es gilt die erste Tonart.');
            }
            const t = kind(el, 'time');
            if (t) {
              const neu = { beats: zahl(t, 'beats') ?? 4, beatType: zahl(t, 'beat-type') ?? 4 };
              if (!time) time = neu;
              else if (time.beats !== neu.beats || time.beatType !== neu.beatType) hinweise.add('Taktwechsel im Stück werden nicht unterstützt.');
            }
            for (const c of kinder(el, 'clef')) {
              const nr = Number(c.getAttribute('number') ?? 1);
              const sign = text(c, 'sign');
              // Tenorschlüssel (G mit Oktavierung nach unten) liegt im Bassschlüssel besser
              const linie = zahl(c, 'line');
              const clef: Clef =
                sign === 'C' && linie === 3 ? 'alto' : sign === 'F' || (sign === 'C' && (linie ?? 3) > 3) || (sign === 'G' && (zahl(c, 'clef-octave-change') ?? 0) < 0) ? 'bass' : 'treble';
              if (sign === 'C' && linie !== 3) hinweise.add('Tenor- und andere C-Schlüssel werden als Bassschlüssel gezeigt.');
              else if (sign !== 'G' && sign !== 'F' && sign !== 'C') hinweise.add('Schlagzeugschlüssel werden als Violinschlüssel gezeigt.');
              if (!schluessel.has(systemOffset + nr - 1)) schluessel.set(systemOffset + nr - 1, clef);
            }
            break;
          }
          case 'harmony': {
            const sym = harmonyLesen(el);
            if (sym) akkordOffen = sym;
            else hinweise.add('Ein Akkordsymbol konnte nicht gelesen werden und fehlt.');
            break;
          }
          case 'backup':
            cursor -= (zahl(el, 'duration') ?? 0) / divisions;
            break;
          case 'forward':
            cursor += (zahl(el, 'duration') ?? 0) / divisions;
            maxPos = Math.max(maxPos, cursor);
            break;
          case 'note': {
            if (kind(el, 'grace') || kind(el, 'cue')) {
              hinweise.add('Vorschläge (Verzierungsnoten) werden weggelassen.');
              break;
            }
            const istAkkord = !!kind(el, 'chord');
            const staff = zahl(el, 'staff') ?? 1;
            const sys = systemOffset + staff - 1;
            const voiceId = `${sys}|${text(el, 'voice') ?? '1'}`;
            const pitchEl = kind(el, 'pitch');
            let pitch: Pitch | undefined;
            if (pitchEl) {
              const step = text(pitchEl, 'step') as Step;
              const alter = Math.round(zahl(pitchEl, 'alter') ?? 0);
              pitch = { step, octave: zahl(pitchEl, 'octave') ?? 4 };
              if (alter) pitch.alter = alter;
              if (trans.stufen || trans.halbtoene) pitch = verschiebe(pitch, trans.stufen, trans.halbtoene);
            } else if (kind(el, 'unpitched')) {
              hinweise.add('Schlagzeugnoten werden als Pausen übernommen.');
            }

            if (istAkkord) {
              hinweise.add('Akkorde innerhalb einer Stimme: übernommen wird nur der oberste Ton (im Bassschlüssel der unterste).');
              if (letzte && pitch && letzte.ev.pitch) {
                const hoeher = midiAehnlich(pitch) > midiAehnlich(letzte.ev.pitch);
                if (hoeher !== letzte.bass) letzte.ev.pitch = pitch;
              }
              break;
            }

            const dauer = (zahl(el, 'duration') ?? 0) / divisions;
            const typ = TYPEN[text(el, 'type') ?? ''];
            const punkte = kinder(el, 'dot').length;
            let werte: Duration[];
            if (kind(el, 'time-modification')) {
              hinweise.add('Triolen und andere N-tolen werden angenähert.');
              werte = zerlege(dauer);
            } else if (typ && punkte <= 2 && Math.abs(quarterLength({ type: typ, dots: punkte }) - dauer) < 1e-6) {
              werte = [punkte ? { type: typ, dots: punkte } : { type: typ }];
            } else {
              werte = zerlege(dauer);
            }

            let bau = imPart.get(voiceId);
            if (!bau) {
              bau = { staff: sys, voice: voiceId, takte: new Map(), pos: 0, reihenfolge: reihenfolge++ };
              imPart.set(voiceId, bau);
              stimmen.push(bau);
              if (!systemName.has(sys)) systemName.set(sys, name);
              if (partIns && staves === 1 && !systemInstrument.has(sys)) systemInstrument.set(sys, partIns);
            }
            const noten = bau.takte.get(ti) ?? [];
            bau.takte.set(ti, noten);
            if (noten.length === 0) bau.pos = 0;
            // Lücke in dieser Stimme (z. B. durch <forward>) mit Pausen füllen
            if (cursor - bau.pos > 1e-6) for (const d of zerlege(cursor - bau.pos)) noten.push({ duration: d });
            bau.pos = cursor;

            const tieStart = kinder(el, 'tie').some((t) => t.getAttribute('type') === 'start');
            const notations = kind(el, 'notations');
            const fermata = !!kind(notations, 'fermata');
            const lyricEl = kinder(el, 'lyric')[0];
            let lyric: string | undefined;
            if (lyricEl) {
              const t = text(lyricEl, 'text');
              const syl = text(lyricEl, 'syllabic');
              if (t) lyric = syl === 'begin' || syl === 'middle' ? `${t}-` : t;
            }
            const istPause = !!kind(el, 'rest') || !pitch;
            werte.forEach((d, i) => {
              const ev: NoteEvent = { duration: d };
              if (i === 0 && akkordOffen) {
                ev.akkord = akkordOffen;
                akkordOffen = undefined;
              }
              if (!istPause && pitch) {
                ev.pitch = { ...pitch };
                if (i < werte.length - 1 || tieStart) ev.tie = true;
                if (i === 0 && lyric) ev.lyric = lyric;
              }
              if (fermata && i === werte.length - 1) ev.fermata = true;
              noten.push(ev);
            });
            if (kind(el, 'rest')?.getAttribute('measure') === 'yes') {
              // Ganztaktpause: Länge kommt aus der Taktart
              noten.splice(noten.length - werte.length, werte.length);
              bau.pos = cursor;
            } else {
              cursor += dauer;
              bau.pos = cursor;
            }
            maxPos = Math.max(maxPos, cursor);
            letzte = noten.length ? { ev: noten[noten.length - 1], bass: (schluessel.get(sys) ?? 'treble') === 'bass' } : null;
            break;
          }
        }
      }
      taktLaengen[ti] = Math.max(taktLaengen[ti] ?? 0, maxPos);
    });

    systemOffset += staves;
  }

  if (stimmen.length === 0) return { hinweise: [], fehler: 'In der Datei wurden keine Noten gefunden.' };
  time ??= { beats: 4, beatType: 4 };
  if (![1, 2, 4, 8, 16].includes(time.beatType)) return { hinweise: [], fehler: `Die Taktart ${time.beats}/${time.beatType} wird nicht unterstützt.` };
  key ??= { fifths: 0, mode: 'major' };
  const voll = measureLength(time);
  const anzahl = taktLaengen.length;
  // Leere Takte und Ganztaktpausen haben die volle Länge; ein kurzer erster Takt ist ein Auftakt
  const auftakt = anzahl > 1 && taktLaengen[0] > 1e-6 && taktLaengen[0] < voll - 1e-6;
  const laengen = taktLaengen.map((l, i) => {
    if (l < 1e-6) return voll;
    if (i === 0 && auftakt) return l;
    if (i === anzahl - 1 && auftakt) return Math.min(l, voll);
    return voll;
  });

  // Höchstens zwei Stimmen je System
  const jeSystem = new Map<number, StimmeBau[]>();
  for (const s of [...stimmen].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
    const l = jeSystem.get(s.staff) ?? [];
    if (l.length >= 2) {
      hinweise.add('Mehr als zwei Stimmen in einem System: weitere Stimmen werden weggelassen.');
      continue;
    }
    l.push(s);
    jeSystem.set(s.staff, l);
  }

  const voices: Voice[] = [];
  for (const sys of [...jeSystem.keys()].sort((a, b) => a - b)) {
    const liste = jeSystem.get(sys)!;
    liste.forEach((bau, i) => {
      const measures = laengen.map((laenge, ti) => {
        const noten = (bau.takte.get(ti) ?? []).filter(Boolean);
        let summe = noten.reduce((s, n) => s + quarterLength(n.duration), 0);
        if (summe > laenge + 1e-6) {
          hinweise.add('Einige Takte waren zu lang und wurden gekürzt.');
          while (noten.length && summe > laenge + 1e-6) summe -= quarterLength(noten.pop()!.duration);
        }
        if (laenge - summe > 1e-6) noten.push(...zerlege(laenge - summe).map((d) => ({ duration: d })));
        return { notes: noten };
      });
      const basis = systemName.get(sys) ?? 'Stimme';
      voices.push({
        id: `v${voices.length + 1}`,
        name: liste.length > 1 ? `${basis} ${i + 1}` : basis,
        clef: schluessel.get(sys) ?? 'treble',
        staff: sys,
        ...(liste.length > 1 ? { stem: i === 0 ? ('up' as const) : ('down' as const) } : {}),
        ...(systemInstrument.has(sys) && liste.length === 1 ? { instrument: systemInstrument.get(sys) } : {}),
        measures,
      });
    });
  }
  // Systemnummern lückenlos ab 0
  const nummern = [...new Set(voices.map((v) => v.staff!))].sort((a, b) => a - b);
  voices.forEach((v) => (v.staff = nummern.indexOf(v.staff!)));
  // Vier einzelne Stimmen (Sopran, Alt, Tenor, Bass) als Chorsatz auf zwei Systemen
  if (voices.length === 4 && !voices.some((v) => v.instrument) && voices.every((v, i) => v.staff === i && v.clef === (['treble', 'treble', 'bass', 'bass'] as Clef[])[i])) {
    voices.forEach((v, i) => {
      v.staff = i < 2 ? 0 : 1;
      v.stem = i % 2 === 0 ? 'up' : 'down';
    });
  }

  const score: Score = {
    format: 'kt-score',
    version: 1,
    title: titel,
    ...(komponist ? { composer: komponist } : {}),
    tempo,
    time,
    key,
    voices,
  };
  const geprueft = validateScore(score);
  if (!geprueft.score) return { hinweise: [...hinweise], fehler: `Die Noten ließen sich nicht übernehmen: ${geprueft.errors[0]}` };
  return { score: geprueft.score, hinweise: [...hinweise] };
}
