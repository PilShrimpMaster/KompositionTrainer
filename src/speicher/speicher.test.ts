import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDoc } from '../editor/state';
import { pruefeSicherung, zusammenfuehren, type Sicherung } from './backup';
import { alleStuecke, db, sicherungEinlesen, sicherungErstellen, stueckSpeichern } from './db';

const leer = { stuecke: [], fortschritt: [], ergebnisse: [] };

describe('Sicherung zusammenführen', () => {
  it('behält jeweils den neueren Stand', () => {
    const doc = emptyDoc();
    const lokal = {
      ...leer,
      stuecke: [{ id: 'x', titel: 'alt', doc, erstellt: 1, geaendert: 10 }],
      fortschritt: [{ modul: 's1-noten', status: 'sicher' as const, sicherheit: 0.9, geaendert: 50 }],
    };
    const fremd = {
      ...leer,
      stuecke: [
        { id: 'x', titel: 'neu', doc, erstellt: 1, geaendert: 20 },
        { id: 'y', titel: 'anderes', doc, erstellt: 5, geaendert: 5 },
      ],
      fortschritt: [{ modul: 's1-noten', status: 'begonnen' as const, sicherheit: 0.2, geaendert: 30 }],
    };
    const m = zusammenfuehren(lokal, fremd);
    expect(m.stuecke.map((s) => s.titel).sort()).toEqual(['anderes', 'neu']);
    expect(m.fortschritt[0].status).toBe('sicher');
  });

  it('lehnt fremde Dateien mit deutscher Meldung ab', () => {
    expect(() => pruefeSicherung({ format: 'kt-score' })).toThrow('keine Sicherung');
    expect(() => pruefeSicherung({ format: 'kt-sicherung', version: 9 })).toThrow('Unbekannte Version');
  });
});

describe('Lokale Datenbank', () => {
  beforeEach(async () => {
    await db.stuecke.clear();
    await db.fortschritt.clear();
    await db.ergebnisse.clear();
  });

  it('speichert, aktualisiert und listet Stücke', async () => {
    const warte = () => new Promise((r) => setTimeout(r, 3)); // verschiedene Zeitstempel
    const a = await stueckSpeichern({ ...emptyDoc(), title: 'Erstes' });
    await warte();
    await stueckSpeichern({ ...emptyDoc(), title: 'Erstes, verbessert' }, a.id);
    await warte();
    await stueckSpeichern({ ...emptyDoc(), title: 'Zweites' });
    const liste = await alleStuecke();
    expect(liste.map((s) => s.titel)).toEqual(['Zweites', 'Erstes, verbessert']);
    expect(liste[1].erstellt).toBe(a.erstellt);
  });

  it('übersteht Export und Import', async () => {
    await stueckSpeichern({ ...emptyDoc(), title: 'Lied' });
    const sicherung: Sicherung = JSON.parse(JSON.stringify(await sicherungErstellen()));
    await db.stuecke.clear();
    const r = await sicherungEinlesen(sicherung);
    expect(r.stuecke).toBe(1);
    expect((await alleStuecke())[0].titel).toBe('Lied');
  });
});

describe('Fassungen und Portfolio', () => {
  beforeEach(async () => {
    await db.stuecke.clear();
  });

  it('sichert Fassungen, holt sie zurück und behält sie beim automatischen Speichern', async () => {
    const { versionSichern, versionZurueckholen, insPortfolio } = await import('./db');
    const doc1 = { ...emptyDoc(), title: 'Menuett', events: [{ pitch: { step: 'C' as const, octave: 4 }, duration: { type: 'quarter' as const } }] };
    const s = await stueckSpeichern(doc1);
    await versionSichern(s.id, doc1, 'Erste Idee');
    const doc2 = { ...doc1, events: [...doc1.events, ...doc1.events] };
    await stueckSpeichern(doc2, s.id);
    let gespeichert = (await alleStuecke())[0];
    expect(gespeichert.versionen?.map((v) => v.name)).toEqual(['Erste Idee']);
    expect(gespeichert.doc.events).toHaveLength(2);

    const zurueck = await versionZurueckholen(s.id, gespeichert.versionen![0].id, doc2);
    expect(zurueck.events).toHaveLength(1);
    gespeichert = (await alleStuecke())[0];
    expect(gespeichert.versionen?.map((v) => v.name)).toEqual(['Erste Idee', 'Stand vor „Erste Idee“']);
    expect(gespeichert.doc.events).toHaveLength(1);

    const p = await insPortfolio(doc2, null, 'Aufgabe gelöst');
    expect(p.portfolio).toBe(true);
    expect(p.versionen?.[0].name).toBe('Aufgabe gelöst');
    expect(await alleStuecke()).toHaveLength(2);
  });
});
