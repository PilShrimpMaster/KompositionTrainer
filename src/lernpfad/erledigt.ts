/** Kleine Merkliste im Browser: gelesene Lektionen und gelöste Schreibaufgaben */
const KEY = 'kt-erledigt-v1';

function lesen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function istErledigt(id: string): boolean {
  return lesen().has(id);
}

export function erledigt(id: string) {
  const s = lesen();
  if (s.has(id)) return;
  s.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    /* ignorieren */
  }
}
