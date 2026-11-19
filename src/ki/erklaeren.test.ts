import { beforeEach, describe, expect, it } from 'vitest';
import { CHORALSATZ, FEHLERSATZ } from '../data/saetze';
import { pruefeSatz } from '../satz/regeln';
import { erzeugeAufgabe } from '../uebungen/aufgaben';
import { kiZaehler, kostenSchaetzung, monat, setKiSchluessel, kiSchluessel, zaehle } from './einstellungen';
import { antwortLesen, ausschnitt, bereich, noteKurz, SCHEMA, satzAnfrage, stimmeKurz, uebungAnfrage } from './erklaeren';

// Einfacher Ersatz für localStorage in der Node-Testumgebung
const speicher = new Map<string, string>();
beforeEach(() => {
  speicher.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => void speicher.set(k, v),
    removeItem: (k: string) => void speicher.delete(k),
  };
});

describe('Kurzform aus dem Satz', () => {
  it('schreibt Noten mit Vorzeichen, Punkt, Bogen und Fermate', () => {
    expect(noteKurz({ pitch: { step: 'F', alter: 1, octave: 4 }, duration: { type: 'quarter', dots: 1 }, tie: true })).toBe('F#4:4.~');
    expect(noteKurz({ pitch: { step: 'B', alter: -1, octave: 3 }, duration: { type: 'half' }, fermata: true })).toBe('Bb3:2^');
    expect(noteKurz({ duration: { type: 'eighth' } })).toBe('r:8');
  });

  it('ein Ausschnitt ergibt wieder dieselben Noten', () => {
    const a = ausschnitt(CHORALSATZ, 2, 3);
    for (let i = 0; i < 4; i++) expect(stimmeKurz(a, i)).toBe(stimmeKurz(CHORALSATZ, i, 2, 3));
    expect(a.voices[0].measures).toHaveLength(2);
    expect(a.key).toEqual(CHORALSATZ.key);
  });
});

describe('Anfrage zu einem Befund', () => {
  const befund = pruefeSatz(FEHLERSATZ).find((b) => b.art === 'fehler')!;

  it('nimmt einen Takt vor und nach dem Fehler mit', () => {
    const [von, bis] = bereich(FEHLERSATZ, befund);
    expect(von).toBe(Math.max(1, befund.takt - 1));
    expect(bis).toBeLessThanOrEqual(3);
    expect(bis).toBeGreaterThanOrEqual(befund.bisTakt ?? befund.takt);
  });

  it('enthält Satz, Befund und Ausschnitt', () => {
    const { text } = satzAnfrage(befund, FEHLERSATZ);
    expect(text).toContain('C-Dur');
    expect(text).toContain(befund.text);
    expect(text).toContain('Sopran: E5:4 F5:4 G5:4 A5:4');
    expect(text).toMatch(/Ausschnitt Takt \d–\d/);
  });

  it('das Schema verlangt Erklärung und vier Stimmen je Vorschlag', () => {
    expect(SCHEMA.required).toEqual(['erklaerung', 'vorschlaege']);
    expect(SCHEMA.properties.vorschlaege.items.required).toEqual(['beschreibung', 'sopran', 'alt', 'tenor', 'bass']);
  });
});

describe('Antwort lesen', () => {
  it('baut aus Vorschlägen abspielbare Sätze und prüft sie', () => {
    const json = JSON.stringify({
      erklaerung: 'Parallele Quinten klingen hohl.',
      vorschlaege: [
        { beschreibung: 'Kadenz', sopran: 'E5:4 F5 D5 C5', alt: 'G4:4 A4 G4 G4', tenor: 'C4:4 C4 B3 E4', bass: 'C3:4 F3 G3 C3' },
        { beschreibung: 'Kaputt', sopran: 'X9', alt: '', tenor: '', bass: '' },
      ],
    });
    const e = antwortLesen(json, FEHLERSATZ);
    expect(e.erklaerung).toBe('Parallele Quinten klingen hohl.');
    expect(e.vorschlaege).toHaveLength(2);
    expect(e.vorschlaege[0].score?.voices).toHaveLength(4);
    expect(e.vorschlaege[0].score?.key).toEqual(FEHLERSATZ.key);
    expect(e.vorschlaege[0].restfehler).toBe(0);
    expect(e.vorschlaege[1].score).toBeNull();
  });

  it('meldet Fehler, die im Vorschlag stecken', () => {
    const json = JSON.stringify({
      erklaerung: 'x',
      vorschlaege: [{ beschreibung: 'mit Quinten', sopran: 'G4:2 A4', alt: 'E4:2 F4', tenor: 'C4:2 D4', bass: 'C3:2 D3' }],
    });
    expect(antwortLesen(json, FEHLERSATZ).vorschlaege[0].restfehler).toBeGreaterThan(0);
  });

  it('ohne Vorlage gibt es keine Noten, höchstens drei Vorschläge', () => {
    const v = { beschreibung: 'b', sopran: 'C5:1', alt: 'G4:1', tenor: 'E4:1', bass: 'C3:1' };
    const e = antwortLesen(JSON.stringify({ erklaerung: 'e', vorschlaege: [v, v, v, v] }), null);
    expect(e.vorschlaege).toHaveLength(3);
    expect(e.vorschlaege.every((x) => x.score === null)).toBe(true);
  });
});

describe('Übungsfragen', () => {
  it('nennt Frage, Lösung und die falsche Antwort', () => {
    const a = erzeugeAufgabe('intervall-lesen', 1);
    const falsch = a.optionen.find((o) => o !== a.loesung)!;
    const t = uebungAnfrage(a, falsch);
    expect(t).toContain(a.frage);
    expect(t).toContain(`Richtige Lösung: ${a.loesung}`);
    expect(t).toContain(`Gewählt wurde: ${falsch}`);
    expect(t).toContain('Vorschläge leer');
  });

  it('bei Satzaufgaben kommt der Satz mit', () => {
    const a = erzeugeAufgabe('satzfehler-finden', 1);
    expect(uebungAnfrage(a, a.loesung)).toContain('Sopran: ');
  });
});

describe('Schlüssel und Zähler', () => {
  it('speichert den Schlüssel nur im localStorage', () => {
    expect(kiSchluessel()).toBeNull();
    setKiSchluessel('  sk-ant-test ');
    expect(kiSchluessel()).toBe('sk-ant-test');
    setKiSchluessel(null);
    expect(kiSchluessel()).toBeNull();
  });

  it('zählt Anfragen je Monat und fängt im neuen Monat bei null an', () => {
    const nov = new Date(2026, 10, 19);
    zaehle(1000, 500, nov);
    zaehle(2000, 500, nov);
    expect(kiZaehler(nov)).toEqual({ monat: monat(nov), anfragen: 2, eingabe: 3000, ausgabe: 1000 });
    expect(kiZaehler(new Date(2026, 11, 1)).anfragen).toBe(0);
    expect(kostenSchaetzung({ eingabe: 1_000_000, ausgabe: 100_000 })).toBeCloseTo(6);
  });
});
