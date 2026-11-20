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
  { id: 's2-funktionen', stufe: 2, titel: 'Funktionen und Kadenz', ziel: 'Tonika, Subdominante, Dominante und ihr Zusammenspiel' },
  { id: 's2-satz', stufe: 2, titel: 'Vierstimmiger Satz', ziel: 'Akkorde verbinden, ohne Parallelen und mit guter Stimmführung' },
  { id: 's2-umkehrungen', stufe: 2, titel: 'Umkehrungen und Generalbass', ziel: 'Sextakkord, Quartsextakkord und bezifferten Bass aussetzen' },
  { id: 's2-septakkorde', stufe: 2, titel: 'Septakkorde', ziel: 'Dominantseptakkord und Auflösung der Septime' },
  { id: 's2-nebenfunktionen', stufe: 2, titel: 'Nebenfunktionen', ziel: 'Parallelklänge, Trugschluss, Doppel- und Zwischendominante' },
  { id: 's2-modulation', stufe: 2, titel: 'Modulation', ziel: 'In verwandte Tonarten wechseln' },
  { id: 's2-singbarkeit', stufe: 2, titel: 'Singbarkeit und Text', ziel: 'Gut singbare Stimmen und Text richtig unterlegen' },
  { id: 's2-choralanalyse', stufe: 2, titel: 'Choräle analysieren', ziel: 'Funktionen und Stimmführung in Choralsätzen erkennen' },
  { id: 's3-kirchentonarten', stufe: 3, titel: 'Kirchentonarten und Cantus firmus', ziel: 'Die Modi hören und eine gute Linie in ganzen Noten schreiben' },
  { id: 's3-gattung1', stufe: 3, titel: '1. Gattung: Note gegen Note', ziel: 'Konsonanzen, Gegenbewegung, Anfang und Schluss' },
  { id: 's3-gattung2', stufe: 3, titel: '2. Gattung: zwei gegen eine', ziel: 'Der Durchgang als erste Dissonanz' },
  { id: 's3-gattung3', stufe: 3, titel: '3. Gattung: vier gegen eine', ziel: 'Durchgang, Wechselnote und Cambiata in fließender Bewegung' },
  { id: 's3-gattung4', stufe: 3, titel: '4. Gattung: Synkopen', ziel: 'Vorhalte vorbereiten, betonen und auflösen' },
  { id: 's3-gattung5', stufe: 3, titel: '5. Gattung: floride', ziel: 'Alle Gattungen in einer lebendigen Linie verbinden' },
  { id: 's3-imitation', stufe: 3, titel: 'Imitation und Kanon', ziel: 'Ein Motiv in der anderen Stimme nachahmen' },
  { id: 's3-invention', stufe: 3, titel: 'Invention', ziel: 'Motiv, Umkehrung und Sequenz im zweistimmigen Satz' },
  { id: 's3-fuge', stufe: 3, titel: 'Fuge', ziel: 'Thema, Antwort und Exposition verstehen' },
  { id: 's3-modal-heute', stufe: 3, titel: 'Seitenblick: Modalität heute', ziel: 'Kirchentonarten in Jazz, Pop und Filmmusik' },
];
