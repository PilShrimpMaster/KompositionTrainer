const SCHLUESSEL = 'kt-produktion-aufgabe';

/**
 * Meldet, ob eine Produktionsaufgabe zum ersten Mal geöffnet wird. Dann startet das Werkzeug mit
 * der Vorgabe; öffnet man dieselbe Aufgabe erneut, bleibt der bisherige Stand erhalten.
 */
export function aufgabeNeuGestartet(id: string): boolean {
  try {
    if (localStorage.getItem(SCHLUESSEL) === id) return false;
    localStorage.setItem(SCHLUESSEL, id);
  } catch {
    /* ohne Speicher: immer mit der Vorgabe starten */
  }
  return true;
}
