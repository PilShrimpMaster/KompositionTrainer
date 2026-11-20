import { diatonicIndex, fromDiatonic, toMidi } from '../model/pitch';
import type { NoteEvent, Pitch, Step } from '../model/types';

/** Die sechs Kirchentonarten (authentisch) auf den weißen Tasten */
export const MODI: { id: string; name: string; finalis: Step }[] = [
  { id: 'dorisch', name: 'Dorisch', finalis: 'D' },
  { id: 'phrygisch', name: 'Phrygisch', finalis: 'E' },
  { id: 'lydisch', name: 'Lydisch', finalis: 'F' },
  { id: 'mixolydisch', name: 'Mixolydisch', finalis: 'G' },
  { id: 'aeolisch', name: 'Äolisch', finalis: 'A' },
  { id: 'ionisch', name: 'Ionisch', finalis: 'C' },
];

type Rng = () => number;

const ton = (d: number): Pitch => fromDiatonic(d, 0);
const halb = (a: number, b: number) => toMidi(ton(b)) - toMidi(ton(a));

/** Prüft einen Cantus firmus (als diatonische Indizes) auf die üblichen Regeln */
export function guterCantus(cf: number[]): boolean {
  const n = cf.length;
  if (n < 8) return false;
  const f = cf[0];
  if (cf[n - 1] !== f || cf[n - 2] !== f + 1) return false; // Schluss 2–1
  const hoch = Math.max(...cf);
  if (cf.filter((x) => x === hoch).length !== 1) return false; // ein Höhepunkt
  if (cf.indexOf(hoch) < 2 || cf.indexOf(hoch) > n - 3) return false;
  if (hoch - Math.min(...cf) > 7 || Math.min(...cf) < f - 2) return false; // Umfang bis zur Oktave, kaum unter die Finalis
  let spruenge = 0;
  for (let i = 1; i < n; i++) {
    const d = cf[i] - cf[i - 1];
    if (d === 0) return false; // keine Tonwiederholung
    const h = Math.abs(halb(cf[i - 1], cf[i]));
    if (h === 6 || Math.abs(d) > 4 || (Math.abs(d) === 4 && h !== 7) || Math.abs(d) === 3 && h !== 5) return false; // keine Tritoni, nichts über die Quinte
    if (Math.abs(d) >= 2) {
      spruenge++;
      const weiter = cf[i + 1] - cf[i];
      // Nach einem Sprung ab der Quarte schrittweise in die Gegenrichtung
      if (Math.abs(d) >= 3 && i + 1 < n && !(Math.sign(weiter) === -Math.sign(d) && Math.abs(weiter) === 1)) return false;
      // keine zwei Sprünge in dieselbe Richtung
      if (i + 1 < n && Math.abs(weiter) >= 2 && Math.sign(weiter) === Math.sign(d)) return false;
    }
  }
  if (spruenge < 1 || spruenge > n / 3) return false;
  // Kein Tritonus als Rahmen zwischen Wendepunkten
  const wende = cf.filter((x, i) => i === 0 || i === n - 1 || Math.sign(x - cf[i - 1]) !== Math.sign(cf[i + 1] - x));
  for (let i = 1; i < wende.length; i++) if (Math.abs(halb(wende[i - 1], wende[i])) === 6) return false;
  return true;
}

/** Erzeugt einen Cantus firmus in einem Modus (8–12 ganze Noten) */
export function erzeugeCantus(modus: string, rng: Rng = Math.random, oktave = 3): NoteEvent[] {
  const m = MODI.find((x) => x.id === modus) ?? MODI[0];
  const f = diatonicIndex({ step: m.finalis, octave: oktave });
  for (let versuch = 0; versuch < 5000; versuch++) {
    const n = 8 + Math.floor(rng() * 5);
    const cf = [f];
    while (cf.length < n - 2) {
      const r = rng();
      const schritt = r < 0.7 ? 1 : r < 0.85 ? 2 : r < 0.95 ? 3 : 4;
      cf.push(cf[cf.length - 1] + (rng() < 0.5 ? -schritt : schritt));
    }
    cf.push(f + 1, f);
    if (guterCantus(cf)) return cf.map((d) => ({ pitch: ton(d), duration: { type: 'whole' as const } }));
  }
  // Notfall: ein bewährter Cantus firmus
  return [0, 2, 1, 0, 3, 2, 4, 3, 2, 1, 0].map((s) => ({ pitch: ton(f + s), duration: { type: 'whole' as const } }));
}
