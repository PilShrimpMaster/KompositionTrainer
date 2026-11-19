import type { Duration, DurationType, TimeSignature } from './types';

const QUARTERS: Record<DurationType, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
  '16th': 0.25,
};

const VEX: Record<DurationType, string> = {
  whole: 'w',
  half: 'h',
  quarter: 'q',
  eighth: '8',
  '16th': '16',
};

export const DURATION_TYPES = Object.keys(QUARTERS) as DurationType[];

/** Länge in Viertelnoten, inklusive Punktierung */
export function quarterLength(d: Duration): number {
  const base = QUARTERS[d.type];
  let total = base;
  let add = base;
  for (let i = 0; i < (d.dots ?? 0); i++) {
    add /= 2;
    total += add;
  }
  return total;
}

/** Länge eines vollen Takts in Viertelnoten */
export function measureLength(t: TimeSignature): number {
  return (t.beats * 4) / t.beatType;
}

export function toVexDuration(d: Duration, rest: boolean): string {
  return VEX[d.type] + 'd'.repeat(d.dots ?? 0) + (rest ? 'r' : '');
}
