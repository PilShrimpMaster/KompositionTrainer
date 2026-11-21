import type { Befund } from './regeln';

/** Stilprofile: Welche Satzregeln in einer Epoche bewusst gebrochen werden dürfen */
export type Stil = 'streng' | 'barock' | 'klassik' | 'romantik' | 'impressionismus' | 'moderne';

export interface StilProfil {
  id: Stil;
  name: string;
  /** Zeitraum und Vorbilder in einem Satz */
  epoche: string;
  /** Lexikon-Eintrag zur Epoche */
  begriff: string;
  /** Regel-Id → warum der Regelbruch hier nur ein Hinweis ist */
  locker: Record<string, string>;
}

const LEITTON_FREI = 'In Mittelstimmen darf der Leitton hier frei weitergehen, wenn die Oberstimme die Auflösung hört.';

export const STILE: StilProfil[] = [
  {
    id: 'streng',
    name: 'Strenger Satz',
    epoche: 'Choralsatz nach den Regeln der Harmonielehre: alle Regeln gelten.',
    begriff: 'vierstimmiger-satz',
    locker: {},
  },
  {
    id: 'barock',
    name: 'Barock',
    epoche: 'Etwa 1600 bis 1750, Bach, Händel, Vivaldi: Generalbass, Fortspinnung, Sequenzen.',
    begriff: 'barock',
    locker: {
      spruenge: 'Instrumentale Linien im Barock springen weiter als Chorstimmen, etwa in gebrochenen Akkorden.',
      abstand: 'In der Instrumentalmusik des Barock liegen die Stimmen oft weiter auseinander als im Chorsatz.',
      'kl-fremdton': 'Vorhalte und Durchgänge auf schwerer Zeit sind im Barock ein wichtiges Ausdrucksmittel.',
    },
  },
  {
    id: 'klassik',
    name: 'Klassik',
    epoche: 'Etwa 1750 bis 1820, Haydn, Mozart, Beethoven: Periodik, klare Kadenzen, Melodie mit Begleitung.',
    begriff: 'klassik',
    locker: {
      spruenge: 'Klassische Instrumentalmelodien springen gern im Dreiklang.',
      abstand: 'Im Klaviersatz der Klassik liegen Melodie und Begleitung oft weit auseinander.',
      verdopplung: 'In der Klassik entscheidet der Klang am Instrument, nicht die strenge Verdopplungsregel.',
      'kl-quartsext': 'Der Kadenz-Quartsextakkord vor der Dominante ist ein Markenzeichen der Klassik.',
    },
  },
  {
    id: 'romantik',
    name: 'Romantik',
    epoche: 'Etwa 1820 bis 1900, Schubert, Chopin, Schumann, Brahms: Chromatik, alterierte Akkorde, ausdrucksvolle Vorhalte.',
    begriff: 'romantik',
    locker: {
      'verdeckte-parallelen': 'Im vollen romantischen Satz sind verdeckte Parallelen kaum hörbar und üblich.',
      verdopplung: 'Romantische Klaviersätze verdoppeln frei, auch Terz und Leitton, um den Klang zu füllen.',
      abstand: 'Romantische Sätze nutzen weite Lagen bewusst für einen vollen Klang.',
      spruenge: 'Große, expressive Sprünge gehören zur romantischen Melodik.',
      leitton: LEITTON_FREI,
      septime: 'Die Septime darf sich in der Romantik auch chromatisch oder verzögert auflösen.',
      'kl-fremdton': 'Lange, betonte Vorhalte und chromatische Durchgänge sind ein Kennzeichen der Romantik.',
      'kl-quartsext': 'Quartsextakkorde sind in der Romantik auch außerhalb der Kadenz üblich.',
    },
  },
  {
    id: 'impressionismus',
    name: 'Impressionismus',
    epoche: 'Etwa 1890 bis 1920, Debussy, Ravel: Klangfarbe statt Funktion, Parallelverschiebung, Ganzton und Pentatonik.',
    begriff: 'impressionismus',
    locker: {
      parallelen: 'Parallel verschobene Klänge sind im Impressionismus ein bewusstes Stilmittel (Planing).',
      'verdeckte-parallelen': 'Klangflächen bewegen sich im Impressionismus oft gemeinsam in eine Richtung.',
      verdopplung: 'Im Impressionismus zählt der Klang, nicht die Verdopplungsregel.',
      abstand: 'Weite Lagen und Klangflächen gehören zum impressionistischen Satz.',
      spruenge: 'Melodien im Impressionismus folgen oft Klangfarben statt Gesanglichkeit.',
      leitton: 'Im Impressionismus müssen Leittöne nicht aufgelöst werden; oft gibt es gar keinen.',
      septime: 'Septimen und Nonen sind im Impressionismus Farbe und lösen sich nicht auf.',
      'kl-parallelen': 'Parallel verschobene Klänge sind im Impressionismus ein bewusstes Stilmittel (Planing).',
      'kl-fremdton': 'Zusatztöne wie Sexte, Septime und None klingen im Impressionismus als Farbe mit.',
      'kl-harmonie': 'Klänge wie Quartenakkorde oder Ganztonklänge passen nicht in die Funktionsharmonik und sind hier gewollt.',
      'kl-quartsext': 'Im Impressionismus gibt es keine Funktionsregeln für Quartsextakkorde.',
      'kl-schluss': 'Impressionistische Stücke enden oft offen oder auf einem Farbklang.',
    },
  },
  {
    id: 'moderne',
    name: 'Moderne',
    epoche: 'Ab etwa 1910, Strawinsky, Bartók, Schönberg: freie Tonalität, Quarten, Bitonalität, Zwölftontechnik.',
    begriff: 'moderne',
    locker: {
      parallelen: 'In der freien Tonalität gibt es keine Parallelenregel; Mixturen sind ein Stilmittel.',
      'verdeckte-parallelen': 'In der freien Tonalität gelten die Regeln für verdeckte Parallelen nicht.',
      abstand: 'Die Lage der Stimmen ist in der Moderne frei wählbar.',
      kreuzung: 'Stimmen dürfen sich in der Moderne frei kreuzen, wenn die Linien hörbar bleiben.',
      verdopplung: 'Ohne Grundton und Terz im tonalen Sinn gibt es keine Verdopplungsregel.',
      leitton: 'In der freien Tonalität gibt es keine Pflicht, Leittöne aufzulösen.',
      septime: 'Dissonanzen sind in der Moderne emanzipiert und müssen sich nicht auflösen.',
      spruenge: 'Große Sprünge, auch übermäßige, gehören zur Melodik der Moderne.',
      'kl-parallelen': 'In der freien Tonalität gibt es keine Parallelenregel.',
      'kl-fremdton': 'Dissonanzen sind in der Moderne emanzipiert.',
      'kl-harmonie': 'Freie Klänge sind in der Moderne gewollt.',
      'kl-quartsext': 'In der Moderne gibt es keine Funktionsregeln für Quartsextakkorde.',
      'kl-schluss': 'Moderne Stücke brauchen keinen Ganzschluss.',
      'kl-kreuzung': 'Melodie und Begleitung dürfen sich in der Moderne kreuzen.',
    },
  },
];

export const stilProfil = (id: Stil | string | undefined): StilProfil => STILE.find((s) => s.id === id) ?? STILE[0];

/** Erkennt einen Stilnamen aus Aufgabentexten: „romantik“, „Impressionismus“ … */
export function liesStil(text: string): Stil | undefined {
  const t = text.trim().toLowerCase();
  return STILE.find((s) => s.id === t || s.name.toLowerCase() === t)?.id;
}

/**
 * Stuft Fehler, die im gewählten Stil üblich sind, zu Stilhinweisen herab
 * und ergänzt die Begründung. Regel-Ids der Befunde: siehe REGELN und KLAVIER_REGELN.
 */
export function stilAnwenden(befunde: Befund[], stil: Stil | undefined): Befund[] {
  const p = stilProfil(stil);
  if (!Object.keys(p.locker).length) return befunde;
  return befunde.map((b) => {
    const grund = p.locker[b.regel];
    if (!grund) return b;
    return { ...b, art: 'hinweis', text: b.art === 'fehler' ? `${b.text} ${p.name}: ${grund}` : b.text, stil: p.id };
  });
}
