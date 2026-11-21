/**
 * Mengenlehre der Neuen Musik (Pitch-Class-Sets nach Allen Forte):
 * Tonklassen 0–11 (c = 0), Normalform, Primform und Intervallvektor.
 * Tonhöhen und Oktavlagen spielen keine Rolle, nur die Tonklassen.
 */

const mod = (x: number) => ((x % 12) + 12) % 12;

/** Normalform: die kompakteste Anordnung der Tonklassen, aufsteigend (Rahn) */
export function normalform(pcs: number[]): number[] {
  const s = [...new Set(pcs.map(mod))].sort((a, b) => a - b);
  if (s.length <= 1) return s;
  const rotationen = s.map((_, i) => [...s.slice(i), ...s.slice(0, i).map((x) => x + 12)]);
  // Kleinster Umfang, dann kleinste Abstände vom ersten Ton zum vorletzten, vorvorletzten …
  rotationen.sort((a, b) => {
    for (let k = a.length - 1; k >= 1; k--) {
      const d = a[k] - a[0] - (b[k] - b[0]);
      if (d !== 0) return d;
    }
    return a[0] - b[0];
  });
  return rotationen[0].map(mod);
}

/** Primform: Normalform oder ihre Umkehrung, auf 0 transponiert, die kompaktere von beiden */
export function primform(pcs: number[]): number[] {
  const nf = normalform(pcs);
  if (!nf.length) return [];
  const auf0 = (xs: number[]) => xs.map((x) => mod(x - xs[0]));
  const a = auf0(nf);
  const b = auf0(normalform(nf.map((x) => -x)));
  for (let k = a.length - 1; k >= 1; k--) {
    if (a[k] !== b[k]) return a[k] < b[k] ? a : b;
  }
  return a;
}

/** Intervallvektor: wie oft kommen die Intervallklassen 1–6 zwischen allen Tonpaaren vor */
export function intervallvektor(pcs: number[]): number[] {
  const s = [...new Set(pcs.map(mod))];
  const v = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j < s.length; j++) {
      const d = mod(s[j] - s[i]);
      v[Math.min(d, 12 - d) - 1]++;
    }
  return v;
}

/** Schreibweise wie in der Literatur: [0,1,4] → „(014)“, 10 und 11 als T und E */
export const mengeText = (pcs: number[]) => `(${pcs.map((x) => (x === 10 ? 'T' : x === 11 ? 'E' : String(x))).join('')})`;

/** Bekannte Mengen mit Namen */
export const BEKANNT: Record<string, string> = {
  '(012)': 'chromatischer Cluster',
  '(024)': 'Ganztonausschnitt',
  '(027)': 'Quartenklang',
  '(036)': 'verminderter Dreiklang',
  '(037)': 'Dur- oder Molldreiklang',
  '(048)': 'übermäßiger Dreiklang',
  '(016)': 'Wiener Trichord',
  '(0258)': 'Dominantseptakkord oder halbverminderter Septakkord',
  '(0369)': 'verminderter Septakkord',
  '(0358)': 'Moll-Septakkord oder Dur-Sextakkord',
  '(0158)': 'großer Septakkord',
  '(0167)': 'Tritonus-Doppelquarte',
  '(0257)': 'Quartenakkord',
  '(02479)': 'Pentatonik',
  '(02468T)': 'Ganztonleiter',
};

/** Reihenformen der Zwölftontechnik, transponiert auf den Anfangston t */
export function reihenform(reihe: number[], form: 'P' | 'I' | 'R' | 'RI', t = reihe[0]): number[] {
  const p = reihe.map((x) => mod(x - reihe[0] + t));
  const i = reihe.map((x) => mod(reihe[0] - x + t));
  if (form === 'P') return p;
  if (form === 'I') return i;
  if (form === 'R') return [...p].reverse();
  return [...i].reverse();
}
