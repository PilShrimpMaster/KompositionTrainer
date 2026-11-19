/** Module des Lernpfads. Lektionen und Übungen hängen sich später über die id an. */
export interface Modul {
  id: string;
  stufe: number;
  titel: string;
  ziel: string;
}

export interface Stufe {
  nummer: number;
  titel: string;
  abschluss: string;
}

export const STUFEN: Stufe[] = [
  { nummer: 1, titel: 'Grundlagen', abschluss: '8-taktige Melodie in Dur mit klarem Schluss' },
  { nummer: 2, titel: 'Harmonielehre und Stimmführung', abschluss: 'Choralsatz im Stil Bachs' },
  { nummer: 3, titel: 'Kontrapunkt', abschluss: 'Zweistimmige Invention' },
  { nummer: 4, titel: 'Melodik und Formenlehre', abschluss: 'Menuett mit Trio für Klavier' },
  { nummer: 5, titel: 'Instrumentation', abschluss: 'Satz für Streichquartett' },
  { nummer: 6, titel: 'Stil und eigene Werke', abschluss: 'Eigenes mehrsätziges Stück' },
];

export const MODULE: Modul[] = [
  { id: 's1-noten', stufe: 1, titel: 'Noten und Schlüssel', ziel: 'Töne im Violin- und Bassschlüssel sicher lesen und schreiben' },
  { id: 's1-rhythmus', stufe: 1, titel: 'Rhythmus und Takt', ziel: 'Notenwerte, Pausen, Punktierungen und Taktarten' },
  { id: 's1-intervalle', stufe: 1, titel: 'Intervalle', ziel: 'Intervalle sehen, hören und benennen' },
  { id: 's1-tonleitern', stufe: 1, titel: 'Tonleitern und Tonarten', ziel: 'Dur und Moll, Vorzeichen' },
  { id: 's1-quintenzirkel', stufe: 1, titel: 'Quintenzirkel', ziel: 'Verwandte Tonarten finden' },
  { id: 's1-dreiklaenge', stufe: 1, titel: 'Dreiklänge', ziel: 'Dur, Moll, vermindert, übermäßig' },
];
