import { describe, expect, it } from 'vitest';
import { LEKTIONEN } from './lektionen';
import { parseQuiz, quizFuer, uebungenDer } from './quiz';

describe('Quiz nach jeder Lektion', () => {
  it('liest Fragen, Antworten und Erklärungen', () => {
    const q = parseQuiz('? Wie viele Linien?\n- 4\n+ 5\n- 6\n= Fünf Linien.\n\n? Ja?\n+ ja\n- nein', 'x');
    expect(q).toHaveLength(2);
    expect(q[0]).toMatchObject({ frage: 'Wie viele Linien?', antworten: ['4', '5', '6'], richtig: 1, erklaerung: 'Fünf Linien.' });
    expect(() => parseQuiz('? A\n+ a\n+ b', 'x')).toThrow(/mehr als eine/);
    expect(() => parseQuiz('? A\n- a\n- b', 'x')).toThrow(/keine richtige/);
  });

  it('jede Lektion hat mindestens vier Fragen', () => {
    for (const l of LEKTIONEN) expect(l.quiz.length, l.modul).toBeGreaterThanOrEqual(4);
  });

  it('ein Quiz fragt alles ab: eigene Fragen und die Übungen der Lektion', () => {
    const l = LEKTIONEN.find((x) => x.modul === 's1-intervalle')!;
    const q = quizFuer(l, LEKTIONEN);
    expect(q.fragen).toHaveLength(l.quiz.length);
    expect(new Set(q.praxis)).toEqual(new Set(uebungenDer(l)));
  });

  it('das Quiz eines Abschlussprojekts fragt die ganze Stufe ab', () => {
    const l = LEKTIONEN.find((x) => x.modul === 's1-abschluss')!;
    const stufe1 = LEKTIONEN.filter((x) => x.modul.startsWith('s1-') && x !== l);
    const q = quizFuer(l, LEKTIONEN);
    for (const x of stufe1) expect(q.fragen.some((f) => f.modul === x.modul), x.modul).toBe(true);
    expect(q.praxis.length).toBe(new Set(stufe1.flatMap(uebungenDer)).size);
  });
});
