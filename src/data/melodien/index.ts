import type { Score } from '../../model/types';
import ode from './ode-an-die-freude.json';
import menuett from './menuett-g-dur.json';
import tonleiter from './b-dur-tonleiter.json';

export interface Beispiel {
  id: string;
  score: Score;
}

/** Mitgelieferte Beispielmelodien (alle gemeinfrei) */
export const BEISPIELE: Beispiel[] = [
  { id: 'ode-an-die-freude', score: ode as Score },
  { id: 'menuett-g-dur', score: menuett as Score },
  { id: 'b-dur-tonleiter', score: tonleiter as Score },
];
