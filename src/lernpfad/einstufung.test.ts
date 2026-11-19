import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../speicher/db';
import { auswerten, BESTANDEN_AB, einstufungAnwenden, erstelleTest, FRAGEN_JE_MODUL } from './einstufung';
import { MODULE } from './module';

const stufe1 = MODULE.filter((m) => m.stufe === 1);

describe('Einstufungstest', () => {
  beforeEach(async () => {
    await db.fortschritt.clear();
    await db.ergebnisse.clear();
  });

  it('hat je Modul fünf Fragen mit Lesen und Hören', () => {
    const t = erstelleTest();
    expect(t).toHaveLength(stufe1.length * FRAGEN_JE_MODUL);
    for (const m of stufe1) expect(t.filter((f) => f.modul === m.id)).toHaveLength(FRAGEN_JE_MODUL);
    expect(t.some((f) => f.hoeren)).toBe(true);
    expect(t.some((f) => !f.hoeren)).toBe(true);
    expect(t.every((f) => f.aufgabe.optionen.includes(f.aufgabe.loesung))).toBe(true);
  });

  it('wertet je Modul aus', () => {
    const t = erstelleTest();
    const antworten = t.map((f) => (f.modul === 's1-noten' ? f.aufgabe.loesung : null));
    const e = auswerten(t, antworten);
    expect(e.find((x) => x.modul === 's1-noten')).toMatchObject({ richtig: 5, bestanden: true });
    expect(e.filter((x) => x.bestanden)).toHaveLength(1);
    expect(BESTANDEN_AB).toBeLessThanOrEqual(FRAGEN_JE_MODUL);
  });

  it('überspringt bestandene Module und nimmt es bei Nichtbestehen zurück', async () => {
    await db.fortschritt.put({ modul: 's1-intervalle', status: 'sicher', sicherheit: 0.9, geaendert: 1 });
    const ergebnis = stufe1.map((m) => ({ modul: m.id, titel: m.titel, richtig: 5, gesamt: 5, bestanden: m.id !== 's1-rhythmus' }));
    await einstufungAnwenden(ergebnis);
    expect((await db.fortschritt.get('s1-noten'))?.status).toBe('uebersprungen');
    expect((await db.fortschritt.get('s1-intervalle'))?.status).toBe('sicher');
    expect(await db.fortschritt.get('s1-rhythmus')).toBeUndefined();

    await einstufungAnwenden([{ modul: 's1-noten', titel: '', richtig: 1, gesamt: 5, bestanden: false }]);
    expect((await db.fortschritt.get('s1-noten'))?.status).toBe('offen');
  });
});
