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
  { nummer: 7, titel: 'Jenseits der Klassik: Jazz, Pop, Film, Neue Musik', abschluss: 'Reharmonisiertes Leadsheet und ein Film-Cue mit Leitmotiv' },
  { nummer: 8, titel: 'Musikproduktion mit der DAW', abschluss: 'Ein eigener Track in FL Studio: Beat, Harmonie, Hook, Arrangement und Mix' },
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
  { id: 's4-melodiebau', stufe: 4, titel: 'Melodiebau', ziel: 'Bogen, Höhepunkt, Motiv und Spannung in einer Melodie' },
  { id: 's4-periode', stufe: 4, titel: 'Periode und Satz', ziel: 'Die zwei Grundformen des klassischen Themas bauen und erkennen' },
  { id: 's4-begleitung', stufe: 4, titel: 'Begleitmuster im Klaviersatz', ziel: 'Eine Melodie mit Bass, Alberti-Bass oder gebrochenen Akkorden begleiten' },
  { id: 's4-liedform', stufe: 4, titel: 'Liedform', ziel: 'A B A: Wiederkehr und Kontrast' },
  { id: 's4-menuett', stufe: 4, titel: 'Menuett und Trio', ziel: 'Die Tanzform der Klassik mit ihren zwei Teilen und dem Trio' },
  { id: 's4-rondo-variation', stufe: 4, titel: 'Rondo und Variation', ziel: 'Ein Thema wiederkehren lassen und verändern' },
  { id: 's4-sonatensatz', stufe: 4, titel: 'Einblick: Sonatensatz', ziel: 'Exposition, Durchführung und Reprise im Überblick' },
  { id: 's4-instrumente', stufe: 4, titel: 'Instrumente und Transposition', ziel: 'Transponierende Instrumente lesen, Tonumfänge kennen und für ein Instrument schreiben' },
  { id: 's4-songformen', stufe: 4, titel: 'Seitenblick: Songformen und Blues', ziel: 'Strophe, Refrain, Bridge, AABA und der 12-Takt-Blues' },
  { id: 's5-streicher', stufe: 5, titel: 'Streicher', ziel: 'Violine, Viola, Violoncello und Kontrabass: Saiten, Lagen, Spielweisen und der Altschlüssel' },
  { id: 's5-holz', stufe: 5, titel: 'Holzbläser', ziel: 'Flöte, Oboe, Klarinette und Fagott: Register, Atem und Klangfarben' },
  { id: 's5-blech', stufe: 5, titel: 'Blechbläser', ziel: 'Horn, Trompete, Posaune und Tuba: Naturtöne, Kraft und Ausdauer' },
  { id: 's5-streichquartett', stufe: 5, titel: 'Streichquartett', ziel: 'Vom Chorsatz zum Quartett: Lage, Stimmführung und Begleitfiguren' },
  { id: 's5-orchestrieren', stufe: 5, titel: 'Orchestrieren', ziel: 'Einen Satz auf Instrumente verteilen: verdoppeln, Farben mischen, Tutti und Solo' },
  { id: 's5-bigband-film', stufe: 5, titel: 'Seitenblick: Big Band und Filmorchester', ziel: 'Saxophonsatz in Drop-2, Bläserriffs und die Klangfarben der Filmmusik' },
  { id: 's6-renaissance', stufe: 6, titel: 'Mittelalter und Renaissance: Organum, Motette, Madrigal', ziel: 'Wie Mehrstimmigkeit entstand: Organum, Fauxbourdon, Imitationsmotette und Madrigalismen' },
  { id: 's6-barock', stufe: 6, titel: 'Barock: Fortspinnung und Suite', ziel: 'Sequenz, Fortspinnung, Generalbass und die Tänze der Suite' },
  { id: 's6-barock-formen', stufe: 6, titel: 'Barock: Ostinato, Concerto und Figurenlehre', ziel: 'Variationen über einem Basso ostinato, Ritornellform und musikalisch-rhetorische Figuren' },
  { id: 's6-klassik', stufe: 6, titel: 'Klassik: die Sonatine', ziel: 'Klare Perioden, Alberti-Bass und der kleine Sonatensatz im Stil Mozarts und Clementis' },
  { id: 's6-klassik-arbeit', stufe: 6, titel: 'Klassik: motivisch-thematische Arbeit', ziel: 'Abspaltung, Liquidation und Durchführungstechnik, dazu die Effekte der Mannheimer Schule' },
  { id: 's6-romantik', stufe: 6, titel: 'Romantik: Chromatik und alterierte Akkorde', ziel: 'Neapolitaner, verminderter Septakkord, übermäßiger Sextakkord und Medianten' },
  { id: 's6-romantik-ausdruck', stufe: 6, titel: 'Romantik: Lied, Charakterstück und Leitmotiv', ziel: 'Kunstlied, Nocturne, Programmmusik, Leitmotiv und Modulation mit dem verminderten Septakkord' },
  { id: 's6-impressionismus', stufe: 6, titel: 'Impressionismus: Klangfarbe', ziel: 'Ganzton, Pentatonik, Parallelverschiebung und Nonakkorde wie bei Debussy' },
  { id: 's6-moderne', stufe: 6, titel: 'Moderne: freie Tonalität', ziel: 'Quarten, Cluster, Bitonalität und ein Einblick in die Zwölftontechnik' },
  { id: 's6-moderne-rhythmus', stufe: 6, titel: 'Moderne: Rhythmus, Zufall und neue Einfachheit', ziel: 'Additive Rhythmen, Polyrhythmik, Aleatorik und Pärts Tintinnabuli' },
  { id: 's6-werkanalyse', stufe: 6, titel: 'Werkanalyse und Stilbestimmung', ziel: 'Ein unbekanntes Stück analysieren und seine Epoche begründen' },
  { id: 's6-film', stufe: 6, titel: 'Seitenblick: Epochenstile im Film', ziel: 'Wie Filmmusik Barock, Romantik und Moderne als Farben einsetzt' },
  { id: 's7-akkordsymbole', stufe: 7, titel: 'Akkordsymbole und Leadsheet', ziel: 'Akkordsymbole lesen und schreiben, ein Leadsheet anlegen und hören' },
  { id: 's7-zwei-fuenf-eins', stufe: 7, titel: 'II–V–I und Jazzkadenzen', ziel: 'Die wichtigste Akkordfolge des Jazz in Dur und Moll, Turnarounds' },
  { id: 's7-voicings', stufe: 7, titel: 'Optionstöne und Voicings', ziel: 'Tensions und Avoid Notes, Shell- und Drop-2-Voicings' },
  { id: 's7-reharmonisation', stufe: 7, titel: 'Reharmonisierung', ziel: 'Zwischendominanten, Tritonus-Substitution und eingeschobene II–V' },
  { id: 's7-blues', stufe: 7, titel: 'Blues und Songformen im Jazz', ziel: 'Jazz-Blues mit II–V, AABA und Rhythm Changes' },
  { id: 's7-pop', stufe: 7, titel: 'Popharmonik und Songwriting', ziel: 'Loops, modale Mischung, Hook und Songaufbau' },
  { id: 's7-film', stufe: 7, titel: 'Filmmusik: Leitmotiv und Underscore', ziel: 'Leitmotiv, Ostinato, Pedal, chromatische Mediantik und Spannung unter dem Bild' },
  { id: 's7-neue-musik', stufe: 7, titel: 'Neue Musik: Reihen, Mengen, Minimal Music', ziel: 'Zwölftontechnik, Pitch-Class-Sets und die Prozesse der Minimal Music' },
  { id: 's8-daw', stufe: 8, titel: 'DAW-Grundlagen: So arbeitet FL Studio', ziel: 'Channel Rack, Pattern, Piano Roll, Playlist und Mixer kennen und ein erstes Projekt anlegen' },
  { id: 's8-beats', stufe: 8, titel: 'Beats programmieren', ziel: 'Kick, Snare und Hi-Hat, Genre-Grooves, Swing, Velocity und Ghost Notes' },
  { id: 's8-pianoroll', stufe: 8, titel: 'Piano Roll und MIDI', ziel: 'Akkorde, Bassline und Hook als MIDI: Velocity, Quantisierung und der Weg nach FL Studio' },
  { id: 's8-sounddesign', stufe: 8, titel: 'Sounddesign: Synthesizer verstehen', ziel: 'Oszillator, Filter, Hüllkurve und LFO; Bass, Pad, Lead und Pluck selbst bauen' },
  { id: 's8-arrangement', stufe: 8, titel: 'Arrangement: vom Loop zum Song', ziel: 'Formteile, Energiekurve, Build-up und Drop, Übergänge und Automation' },
  { id: 's8-mixing', stufe: 8, titel: 'Mixing', ziel: 'Gain-Staging, EQ, Kompression, Hall und Delay, Panorama und Sidechain' },
  { id: 's8-mastering', stufe: 8, titel: 'Mastering und Export', ziel: 'Limiter, Lautheit in LUFS, Referenztracks, Stems und der fertige Export' },
];
