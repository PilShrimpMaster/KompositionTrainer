import { describe, expect, it } from 'vitest';
import { parsePitch } from '../lexikon/parse';
import { erkenneAkkord, istLeitton } from './akkorde';
import type { KeySignature } from '../model/types';
import { satz } from './kurzform';
import { pruefeSatz } from './regeln';

const C: KeySignature = { fifths: 0, mode: 'major' };
const a: KeySignature = { fifths: 0, mode: 'minor' };
const ak = (t: string, key = C) => erkenneAkkord(t.split(' ').map(parsePitch), key)!;
const s = (S: string, A: string, T: string, B: string, tonart = '0') => satz({ titel: 'Test', tonart, stimmen: [S, A, T, B] });
const regeln = (sc: ReturnType<typeof s>) => pruefeSatz(sc).map((b) => `${b.regel}:${b.art}:${b.takt}`);

describe('Akkorderkennung', () => {
  it('erkennt Art, Umkehrung und Funktion', () => {
    expect(ak('C5 G4 E4 C3')).toMatchObject({ name: 'C-Dur', funktion: 'T', umkehrung: 0 });
    expect(ak('C5 A4 F4 F3')).toMatchObject({ name: 'F-Dur', funktion: 'S' });
    expect(ak('F4 D4 B3 G2')).toMatchObject({ name: 'G⁷', funktion: 'D⁷', sept: 'Dominantseptakkord' });
    expect(ak('C5 G4 C4 E3')).toMatchObject({ name: 'C-Dur', umkehrung: 1 });
    expect(ak('A4 F4 D4 D3')).toMatchObject({ name: 'd-Moll', funktion: 'Sp' });
    expect(ak('D5 B4 F4 B2')).toMatchObject({ name: 'H vermindert', funktion: 'D⁷ verkürzt' });
    expect(ak('E5 C5 A4 A2', a)).toMatchObject({ name: 'a-Moll', funktion: 't' });
    expect(ak('B4 G#4 E4 E3', a)).toMatchObject({ name: 'E-Dur', funktion: 'D' });
    expect(ak('A4 F#4 D4 D3')).toMatchObject({ funktion: 'DD' });
  });

  it('erkennt alterierte Akkorde der Romantik', () => {
    // Neapolitaner in a-Moll und C-Dur, als Sextakkord
    expect(ak('Bb4 F4 D4 D3', a)).toMatchObject({ funktion: 'sN', alteriert: 'neapolitaner', umkehrung: 1 });
    expect(ak('Db5 Ab4 F4 F3')).toMatchObject({ funktion: 'sN' });
    // Übermäßige Sextakkorde vor der Dominante in a-Moll
    expect(ak('D#4 B3 A3 F3', a)).toMatchObject({ name: 'Französischer Sextakkord', alteriert: 'uebermaessig' });
    expect(ak('D#4 C4 A3 F2', a)).toMatchObject({ name: 'Deutscher Sextakkord' });
    expect(ak('F#4 C4 Eb4 Ab3')).toMatchObject({ name: 'Deutscher Sextakkord', funktion: 'DD⁷>', grundton: { step: 'D' } });
    expect(ak('D#4 C4 A3 F2', a).grundton).toMatchObject({ step: 'B' });
    expect(ak('F#4 C4 C4 Ab3')).toMatchObject({ name: 'Italienischer Sextakkord', funktion: 'DD>' });
    // Zwischendominanten
    expect(ak('G#4 E4 B3 E3')).toMatchObject({ funktion: '(D)Tp', alteriert: 'zwischendominante' });
    expect(ak('Bb4 E4 G4 C3')).toMatchObject({ funktion: '(D⁷)S' });
    expect(ak('C#5 A4 E4 A2')).toMatchObject({ funktion: '(D)Sp' });
    // Medianten aus Moll
    expect(ak('G4 Eb4 Bb3 Eb3')).toMatchObject({ funktion: 'tP', alteriert: 'mediante' });
    expect(ak('C5 Eb4 Ab3 Ab2')).toMatchObject({ funktion: 'sP' });
    // Dominantnonakkord, groß und klein
    expect(ak('A4 F4 B3 G2')).toMatchObject({ funktion: 'D⁹', none: 'groß' });
    expect(ak('F4 Ab4 B3 G2')).toMatchObject({ funktion: 'D⁹>', none: 'klein' });
    // Ohne Septime bleibt die None ein Vorhalt: kein Akkord
    expect(erkenneAkkord(['D5', 'G4', 'E4', 'C3'].map(parsePitch), C)).toBeNull();
  });

  it('kennt den Leitton, in Moll erhöht', () => {
    expect(istLeitton(parsePitch('B3'), C)).toBe(true);
    expect(istLeitton(parsePitch('G#4'), a)).toBe(true);
    expect(istLeitton(parsePitch('G4'), a)).toBe(false);
  });
});

describe('Regeln zu Verdopplung, Auflösung und Sprüngen', () => {
  it('Leittonverdopplung ist ein Fehler, Terzverdopplung in Dur ein Hinweis', () => {
    expect(regeln(s('B4:1', 'G4:1', 'B3:1', 'G2:1'))).toContain('verdopplung:fehler:1');
    expect(regeln(s('E5:1', 'C5:1', 'E4:1', 'C3:1'))).toContain('verdopplung:hinweis:1');
    expect(regeln(s('E5:1', 'C5:1', 'G4:1', 'C3:1'))).not.toContain('verdopplung:hinweis:1');
  });

  it('Leitton im Sopran muss aufwärts', () => {
    expect(regeln(s('B4:4 G4', 'G4:4 E4', 'D4:4 C4', 'G3:4 C3'))).toContain('leitton:fehler:1');
    expect(regeln(s('B4:4 C5', 'G4:4 G4', 'D4:4 E4', 'G3:4 C3'))).not.toContain('leitton:fehler:1');
    // freier Leitton im Alt nur als Hinweis
    expect(regeln(s('D5:4 C5', 'B4:4 G4', 'G4:4 E4', 'G3:4 C3'))).toContain('leitton:hinweis:1');
  });

  it('Septime muss abwärts', () => {
    expect(regeln(s('F5:4 E5', 'B4:4 C5', 'D4:4 G4', 'G3:4 C3'))).not.toContain('septime:fehler:1');
    expect(regeln(s('F5:4 G5', 'B4:4 C5', 'D4:4 E4', 'G3:4 C3'))).toContain('septime:fehler:1');
  });

  it('findet übermäßige und zu große Sprünge', () => {
    expect(regeln(s('C5:4 C5', 'F4:4 G#4', 'A3:4 B3', 'D3:4 E3', '0 moll'))).toContain('spruenge:fehler:1');
    expect(regeln(s('C5:4 C5', 'G4:4 G4', 'E4:4 E4', 'C3:4 D4'))).toContain('spruenge:fehler:1');
    expect(regeln(s('C5:4 B5', 'G4:4 G4', 'E4:4 E4', 'C3:4 C3'))).toContain('spruenge:hinweis:1');
  });
});
