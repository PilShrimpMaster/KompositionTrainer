import { describe, expect, it } from 'vitest';
import { menuettMitTrio } from '../data/formbeispiele';
import { FORTSPINNUNG } from '../data/stilbeispiele';
import { emptyDoc } from '../editor/state';
import { rebar } from '../editor/rebar';
import { parseNotenfolge } from '../lernpfad/kompakt';
import { FEEDBACK_SCHEMA, feedbackAnfrage, feedbackLesen } from './feedback';

describe('KI-Feedback zu eigenen Stücken', () => {
  it('schickt das ganze Stück mit Analyse und Schwerpunkt', () => {
    const text = feedbackAnfrage(menuettMitTrio(), { besetzung: 'Klaviersatz', befunde: [], fokus: 'form', aufgabe: 'Schreib ein Menuett mit Trio.' });
    expect(text).toContain('Klaviersatz, C-Dur, 3/4-Takt');
    expect(text).toContain('32 Takte');
    expect(text).toContain('Melodie: E5:4 C5:4 G4:4 | F5:4');
    expect(text).toContain('Begleitung: C3:2.');
    expect(text).toContain('Form: Menuett mit Trio');
    expect(text).toContain('Takt 8: Halbschluss auf G-Dur');
    expect(text).toContain('Harmonien: 1:T');
    expect(text).toContain('Lösung dieser Aufgabe');
    expect(text).toContain('Konzentriere dich auf die Form');
    expect(text).not.toMatch(/sk-ant/);
  });

  it('nennt im Stil-Schwerpunkt den gewählten Stil und die Stilmerkmale', () => {
    const score = { ...FORTSPINNUNG(), stil: 'barock' };
    const text = feedbackAnfrage(score, { besetzung: 'Klaviersatz', befunde: [], fokus: 'stil' });
    expect(text).toContain('Ich schreibe im Stil: Barock');
    expect(text).toContain('Stilmerkmale: Sequenzen');
    expect(text).toContain('passt am ehesten zu: Barock');
    expect(text).toContain('Konzentriere dich auf den Stil');
  });

  it('schickt bei Leadsheets Akkordsymbole, Stufen und Jazzmuster mit', () => {
    const score = rebar({ ...emptyDoc(), events: parseNotenfolge('F4:1[Dm7] | F4:1[G7] | E4:1[Cmaj7] | E4:1[Cmaj7]') }).score;
    const text = feedbackAnfrage(score, { besetzung: 'Leadsheet', befunde: [], fokus: 'harmonie' });
    expect(text).toContain('F4:1[Dm7]');
    expect(text).toContain('Leadsheet: T1 Dm7=IIm7');
    expect(text).toContain('II–V–I nach');
  });

  it('liest die Antwort robust', () => {
    const f = feedbackLesen(
      JSON.stringify({
        einordnung: ' Ein klassisches Menuett. ',
        staerken: ['Klarer Halbschluss in Takt 8', 3, ''],
        verbesserungen: [{ takte: 'Takt 9–12', beobachtung: 'Die Sequenz bleibt stehen.', vorschlag: 'Führe sie abwärts.', beispiel: 'G5:4 F5 E5 | F5:4 E5 D5' }, null, { takte: 'x', beobachtung: 'y', beispiel: 'Unsinn' }],
        naechsterSchritt: 'Schreib ein Trio in Moll.',
      }),
    );
    expect(f.einordnung).toBe('Ein klassisches Menuett.');
    expect(f.staerken).toEqual(['Klarer Halbschluss in Takt 8']);
    expect(f.verbesserungen).toHaveLength(2);
    expect(f.verbesserungen[0].beispiel).toBeNull();
    const mitVorlage = feedbackLesen(
      JSON.stringify({ einordnung: '', staerken: [], naechsterSchritt: '', verbesserungen: [{ takte: 'Takt 9–10', beobachtung: 'a', vorschlag: 'b', beispiel: 'G5:4 F5 E5 | F5:4 E5 D5' }, { takte: 'x', beobachtung: 'y', vorschlag: 'z', beispiel: 'Unsinn' }] }),
      menuettMitTrio(),
    );
    expect(mitVorlage.verbesserungen[0].beispiel?.voices[0].measures).toHaveLength(2);
    expect(mitVorlage.verbesserungen[0].beispiel?.time.beats).toBe(3);
    expect(mitVorlage.verbesserungen[1].beispiel).toBeNull();
    expect(f.naechsterSchritt).toContain('Trio');
    expect(FEEDBACK_SCHEMA.required).toContain('verbesserungen');
  });
});
