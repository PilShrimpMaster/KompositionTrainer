import { keyAlter } from './pitch';
import type { KeySignature, Step } from './types';

const STEPS: Step[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Grundton einer Tonart (ohne Oktave) */
export function grundton(key: KeySignature): { step: Step; alter: number } {
  const dur = (((key.fifths * 4) % 7) + 7) % 7;
  const idx = key.mode === 'minor' ? (dur + 5) % 7 : dur;
  const step = STEPS[idx];
  return { step, alter: keyAlter(step, key.fifths) };
}
