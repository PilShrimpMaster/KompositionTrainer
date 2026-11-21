// @vitest-environment happy-dom
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { CHORALSATZ, FEHLERSATZ } from '../data/saetze';
import { BEISPIELE } from '../data/melodien';
import type { Score } from '../model/types';
import { ladeNotendatei } from './datei';
import { exportMusicXml } from './export';
import { importMusicXml, zerlege } from './import';

const noten = (s: Score) => s.voices.map((v) => v.measures.map((m) => m.notes));

function rundreise(s: Score): Score {
  const r = importMusicXml(exportMusicXml(s));
  expect(r.fehler).toBeUndefined();
  return r.score!;
}

describe('MusicXML-Export und -Import', () => {
  it('der Choralsatz kommt unverändert zurück (Stimmen, Liedtext, Fermaten)', () => {
    const z = rundreise(CHORALSATZ);
    expect(z.title).toBe(CHORALSATZ.title);
    expect(z.composer).toBe(CHORALSATZ.composer);
    expect(z.tempo).toBe(CHORALSATZ.tempo);
    expect(z.key).toEqual(CHORALSATZ.key);
    expect(z.time).toEqual(CHORALSATZ.time);
    expect(z.voices.map((v) => [v.clef, v.staff, v.stem])).toEqual(CHORALSATZ.voices.map((v) => [v.clef, v.staff, v.stem]));
    expect(noten(z)).toEqual(noten(CHORALSATZ));
  });

  it('alle Beispielstücke überstehen die Rundreise', () => {
    for (const b of [...BEISPIELE.map((x) => x.score), FEHLERSATZ]) {
      expect(noten(rundreise(b)), b.title).toEqual(noten(b));
    }
  });

  it('schreibt gültiges MusicXML mit Tonart, Takt, Schlüssel und Bögen', () => {
    const xml = exportMusicXml(CHORALSATZ);
    expect(xml).toContain('<score-partwise version="3.1">');
    expect(xml).toContain('<fifths>1</fifths>');
    expect(xml).toContain('<sign>F</sign><line>4</line>');
    expect(xml).toContain('<fermata type="upright"/>');
    expect(xml).toMatch(/<syllabic>begin<\/syllabic><text>er<\/text>/);
    expect(xml).toMatch(/<syllabic>end<\/syllabic><text>klingt<\/text>/);
    expect(new DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('part')).toHaveLength(2);
  });
});

const MUSESCORE = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <work><work-title>Kleines Stück</work-title></work>
  <identification><creator type="composer">Test</creator></identification>
  <part-list><score-part id="P1"><part-name>Klavier</part-name></score-part></part-list>
  <part id="P1">
    <measure number="0" implicit="yes">
      <attributes><divisions>2</divisions><key><fifths>-1</fifths></key><time><beats>3</beats><beat-type>4</beat-type></time>
        <staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes>
      <direction><sound tempo="96"/></direction>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>quarter</type><staff>1</staff></note>
      <backup><duration>2</duration></backup>
      <forward><duration>2</duration><voice>5</voice><staff>2</staff></forward>
    </measure>
    <measure number="1">
      <note><grace/><pitch><step>E</step><octave>5</octave></pitch><voice>1</voice><type>eighth</type><staff>1</staff></note>
      <note><pitch><step>F</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><staff>1</staff></note>
      <note><pitch><step>A</step><octave>5</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><staff>1</staff><notations><fermata/></notations></note>
      <note><chord/><pitch><step>C</step><octave>6</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>F</step><octave>3</octave></pitch><duration>4</duration><voice>5</voice><type>half</type><staff>2</staff></note>
      <note><chord/><pitch><step>A</step><octave>2</octave></pitch><duration>4</duration><voice>5</voice><type>half</type><staff>2</staff></note>
      <note><pitch><step>B</step><alter>-1</alter><octave>3</octave></pitch><duration>2</duration><tie type="start"/><voice>5</voice><type>quarter</type><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification><staff>1</staff></note>
      <note><rest/><duration>5</duration><voice>1</voice><staff>1</staff></note>
      <backup><duration>6</duration></backup>
      <note><pitch><step>B</step><alter>-1</alter><octave>3</octave></pitch><duration>4</duration><tie type="stop"/><voice>5</voice><type>half</type><staff>2</staff></note>
    </measure>
  </part>
</score-partwise>`;

describe('Akkordsymbole in MusicXML', () => {
  it('überstehen die Rundreise und lesen MuseScores <harmony>', async () => {
    const { rebar } = await import('../editor/rebar');
    const { emptyDoc } = await import('../editor/state');
    const { parseNotenfolge } = await import('../lernpfad/kompakt');
    const s = rebar({ ...emptyDoc(), title: 'Leadsheet', events: parseNotenfolge('E5:2[Dm7] D5:2[G7b9] | C5:1[Cmaj7] | r:2[F#ø7] B4:2[B7#9] | E5:1[Em/G]') }).score;
    const xml = exportMusicXml(s);
    expect(xml).toContain('<harmony><root><root-step>D</root-step></root><kind text="m7">minor-seventh</kind></harmony>');
    expect(xml).toContain('<kind text="ø7">half-diminished</kind>');
    expect(noten(rundreise(s))).toEqual(noten(s));

    const ms = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Melodie</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>
      <harmony><root><root-step>B</root-step><root-alter>-1</root-alter></root><kind>dominant</kind><degree><degree-value>11</degree-value><degree-alter>1</degree-alter><degree-type>add</degree-type></degree></harmony>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note>
      <harmony><root><root-step>E</root-step><root-alter>-1</root-alter></root><kind>major-seventh</kind><bass><bass-step>G</bass-step></bass></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><type>half</type></note></measure></part></score-partwise>`;
    const r = importMusicXml(ms);
    expect(r.score!.voices[0].measures[0].notes.map((n) => n.akkord)).toEqual(['Bb7#11', 'Ebmaj7/G']);
  });
});

describe('Import aus MuseScore', () => {
  const r = importMusicXml(MUSESCORE);
  const s = r.score!;

  it('liest Titel, Komponist, Tempo, Tonart, Takt und zwei Systeme', () => {
    expect(r.fehler).toBeUndefined();
    expect(s.title).toBe('Kleines Stück');
    expect(s.composer).toBe('Test');
    expect(s.tempo).toBe(96);
    expect(s.key).toEqual({ fifths: -1, mode: 'major' });
    expect(s.time).toEqual({ beats: 3, beatType: 4 });
    expect(s.voices.map((v) => [v.name, v.clef, v.staff])).toEqual([
      ['Klavier', 'treble', 0],
      ['Klavier', 'bass', 1],
    ]);
  });

  it('behält den Auftakt, füllt Lücken mit Pausen, nimmt bei Akkorden den Außenton', () => {
    const [oben, unten] = s.voices.map((v) => v.measures);
    expect(oben[0].notes).toEqual([{ pitch: { step: 'C', octave: 5 }, duration: { type: 'quarter' } }]);
    expect(unten[0].notes).toEqual([{ duration: { type: 'quarter' } }]);
    expect(oben[1].notes.map((n) => n.pitch?.step)).toEqual(['F', 'C']); // Vorschlag weg, oberster Akkordton
    expect(oben[1].notes[1].fermata).toBe(true);
    expect(unten[1].notes.map((n) => n.pitch?.step)).toEqual(['A', 'B']); // unterster Akkordton im Bass
    expect(unten[1].notes[1].tie).toBe(true);
    expect(unten[1].notes[1].pitch).toEqual({ step: 'B', alter: -1, octave: 3 });
  });

  it('nennt, was angenähert wurde', () => {
    expect(r.hinweise.join(' ')).toMatch(/Vorschläge/);
    expect(r.hinweise.join(' ')).toMatch(/Akkorde/);
    expect(r.hinweise.join(' ')).toMatch(/Triolen/);
  });

  it('meldet kaputte Dateien verständlich', () => {
    expect(importMusicXml('<score-timewise/>').fehler).toMatch(/timewise/);
    expect(importMusicXml('<html/>').fehler).toMatch(/keine MusicXML/);
  });
});

/** Minimales ZIP mit einer komprimierten Datei je Eintrag */
function zip(dateien: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const lokal: Uint8Array[] = [];
  const zentral: Uint8Array[] = [];
  let offset = 0;
  for (const [name, inhalt] of Object.entries(dateien)) {
    const n = enc.encode(name);
    const roh = enc.encode(inhalt);
    const daten = new Uint8Array(deflateRawSync(roh));
    const kopf = new Uint8Array(30 + n.length);
    const dv = new DataView(kopf.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(8, 8, true);
    dv.setUint32(18, daten.length, true);
    dv.setUint32(22, roh.length, true);
    dv.setUint16(26, n.length, true);
    kopf.set(n, 30);
    const z = new Uint8Array(46 + n.length);
    const zv = new DataView(z.buffer);
    zv.setUint32(0, 0x02014b50, true);
    zv.setUint16(10, 8, true);
    zv.setUint32(20, daten.length, true);
    zv.setUint32(24, roh.length, true);
    zv.setUint16(28, n.length, true);
    zv.setUint32(42, offset, true);
    z.set(n, 46);
    lokal.push(kopf, daten);
    zentral.push(z);
    offset += kopf.length + daten.length;
  }
  const zLen = zentral.reduce((s, z) => s + z.length, 0);
  const ende = new Uint8Array(22);
  const ev = new DataView(ende.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, zentral.length, true);
  ev.setUint16(10, zentral.length, true);
  ev.setUint32(12, zLen, true);
  ev.setUint32(16, offset, true);
  const teile = [...lokal, ...zentral, ende];
  const out = new Uint8Array(teile.reduce((s, t) => s + t.length, 0));
  let p = 0;
  for (const t of teile) {
    out.set(t, p);
    p += t.length;
  }
  return out;
}

describe('Dateien öffnen', () => {
  it('liest komprimiertes MusicXML (.mxl) aus MuseScore', async () => {
    const mxl = zip({
      mimetype: 'application/vnd.recordare.musicxml',
      'META-INF/container.xml': '<container><rootfiles><rootfile full-path="stueck.musicxml"/></rootfiles></container>',
      'stueck.musicxml': exportMusicXml(CHORALSATZ),
    });
    const r = await ladeNotendatei('stueck.mxl', mxl);
    expect(r.fehler).toBeUndefined();
    expect(noten(r.score!)).toEqual(noten(CHORALSATZ));
  });

  it('liest weiterhin eigenes JSON und lehnt Unsinn ab', async () => {
    const enc = new TextEncoder();
    expect((await ladeNotendatei('a.json', enc.encode(JSON.stringify(CHORALSATZ)))).score?.title).toBe(CHORALSATZ.title);
    expect((await ladeNotendatei('a.txt', enc.encode('hallo'))).fehler).toMatch(/weder JSON noch MusicXML/);
  });
});

describe('Notenwerte zerlegen', () => {
  it('zerlegt Längen in wenige Notenwerte', () => {
    expect(zerlege(3)).toEqual([{ type: 'half', dots: 1 }]);
    expect(zerlege(2.5)).toEqual([{ type: 'half' }, { type: 'eighth' }]);
    expect(zerlege(7)).toEqual([{ type: 'whole', dots: 1 }, { type: 'quarter' }]);
  });
});

describe('MusicXML mit Instrumenten', () => {
  const ens: Score = {
    format: 'kt-score',
    version: 1,
    title: 'Ensemble',
    tempo: 90,
    time: { beats: 4, beatType: 4 },
    key: { fifths: -1, mode: 'major' },
    voices: [
      { id: 'a', name: 'Altsaxophon', clef: 'treble', staff: 0, instrument: 'altsax', measures: [{ notes: [{ pitch: { step: 'F', octave: 4 }, duration: { type: 'half' } }, { pitch: { step: 'B', alter: -1, octave: 4 }, duration: { type: 'half' } }] }] },
      { id: 'b', name: 'Viola', clef: 'alto', staff: 1, instrument: 'viola', measures: [{ notes: [{ pitch: { step: 'C', octave: 4 }, duration: { type: 'whole' } }] }] },
      { id: 'c', name: 'Kontrabass', clef: 'bass', staff: 2, instrument: 'kontrabass', measures: [{ notes: [{ pitch: { step: 'F', octave: 2 }, duration: { type: 'whole' } }] }] },
    ],
  };

  it('schreibt notierte Töne, Altschlüssel, Transposition und Klangkennung', () => {
    const xml = exportMusicXml(ens);
    expect(xml).toContain('<instrument-sound>wind.reed.saxophone.alto</instrument-sound>');
    expect(xml).toContain('<transpose><diatonic>-5</diatonic><chromatic>-9</chromatic></transpose>');
    expect(xml).toContain('<transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>');
    expect(xml).toContain('<sign>C</sign><line>3</line>');
    // Altsaxophon in F-Dur klingend steht in D-Dur: f′ wird d″ notiert
    expect(xml).toContain('<key><fifths>2</fifths>');
    expect(xml).toContain('<step>D</step><octave>5</octave>');
  });

  it('kommt klingend und mit Instrumenten zurück', () => {
    const z = rundreise(ens);
    expect(z.key.fifths).toBe(-1);
    expect(z.voices.map((v) => [v.instrument, v.clef])).toEqual([
      ['altsax', 'treble'],
      ['viola', 'alto'],
      ['kontrabass', 'bass'],
    ]);
    expect(noten(z)).toEqual(noten(ens));
  });

  it('erkennt Instrumente auch nur am Namen', () => {
    const xml = exportMusicXml(ens).replace(/<score-instrument.*?<\/score-instrument>/g, '').replace(/Altsaxophon/g, 'Alto Saxophone');
    expect(rundreise({ ...ens, voices: ens.voices }).voices[0].instrument).toBe('altsax');
    expect(importMusicXml(xml).score!.voices.map((v) => v.instrument)).toEqual(['altsax', 'viola', 'kontrabass']);
  });
});
