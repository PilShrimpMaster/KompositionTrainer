# KompositionsTrainer

Eine Web-App (PWA), mit der man auf dem iPad und am Desktop das Komponieren klassischer Musik von Grund auf lernt: von Noten und Intervallen über den vierstimmigen Satz und Kontrapunkt bis zu Formenlehre, Instrumentation und eigenen Werken.

**App öffnen:** https://pilshrimpmaster.github.io/KompositionTrainer/

## Stand: M3 Kontrapunkt und Analyse (in Arbeit)

**Brücke zu MuseScore (M3):** Unter „Schreiben“ und „Hören“ speichert „Für MuseScore speichern“ das Stück als MusicXML (`.musicxml`), das sich direkt in MuseScore Studio 4 (und Finale, Sibelius, Dorico) öffnen lässt. „Datei öffnen“ liest MusicXML, auch komprimiert (`.mxl`, MuseScores Standard beim Export), und das eigene JSON. Übernommen werden Noten, Pausen, Punktierung, Bögen, Vorzeichen, Tonart, Taktart, Auftakt, mehrere Stimmen und Systeme, Liedtext, Fermaten und Tempo; vier einzelne Chorstimmen werden zum Chorsatz auf zwei Systemen. Was nicht ins Lernmodell passt (Akkorde in einer Stimme, Vorschläge, N-tolen, Takt- und Tonartwechsel, mehr als zwei Stimmen je System), wird angenähert und beim Öffnen genannt. So lassen sich eigene Stücke und gemeinfreie Werke hier prüfen, analysieren und anhören.

**Gattungskontrapunkt nach Fux (M3):** Neue Besetzung „Kontrapunkt“ unter „Schreiben“ → „Stück einstellen“. Der Cantus firmus ist vorgegeben und gesperrt, „Neuer Cantus firmus“ erzeugt jederzeit einen neuen in einer der sechs Kirchentonarten, oben oder unten. Die Prüfung kennt alle fünf Gattungen: Konsonanzen, Anfang und Clausula mit Leitton, offene, verdeckte und Akzentparallelen, Durchgang, Wechselnote, Cambiata, Vorhalte mit Auflösung abwärts, Rhythmus der Gattung, Melodik (verbotene Sprünge, Ausgleich, Höhepunkt) und leiterfremde Töne. Lektionen „Kirchentonarten und Cantus firmus“ und „1. bis 5. Gattung“ mit Hörbeispielen und Schreibaufgaben, Übungen „Konsonanz oder Dissonanz“ und „Fehler im Kontrapunkt finden“, Lexikon-Einträge Gattungskontrapunkt, Cantus firmus, Cambiata und Clausula.

**Invention und Motivanalyse (M3):** Besetzung „Zweistimmig frei: Invention“: beide Stimmen sind offen, die Prüfung behandelt den freien Satz im Stil Bachs (Dissonanzen auf den Zählzeiten nur als Vorhalt, Durchgang oder Wechselnote, dazwischen im Schritt; Parallelen, Akzentparallelen, Schluss). Die Motivanalyse findet das Anfangsmotiv in allen Stimmen wieder, als Imitation, Wiederkehr, Sequenz, Umkehrung, Krebs, Krebsumkehrung, Vergrößerung oder Verkleinerung, markiert es im Notenbild und lässt sich in der Länge anpassen. Lektionen „Imitation und Kanon“, „Invention“ (mit Bachs BWV 772), „Fuge“ und das Abschlussprojekt „Zweistimmige Invention“; neue Übung „Motiv, Umkehrung, Krebs“.

**Analyse und Modalität (M3):** Übung „Werke analysieren“: In Ausschnitten aus Beethoven, Petzold, Bach und einem Übungssatz markiert man Halb- und Ganzschlüsse, Sequenzen, Imitationen, Umkehrungen und Modulationen durch Tippen ins Notenbild. Seitenblick „Modalität heute“ mit modalen Vamps aus Jazz, Rock und Film, der Hörübung „Modi hören“ und einer Schreibaufgabe in D-Dorisch (Prüfkriterien `modus`, `charakterton`, `finalis`).

**Lexikon (M3):** 190 Einträge, darunter Komponisten von Josquin bis Bartók, Zwölftonmusik, Minimal Music und eine eigene Kategorie „Jazz, Pop & Film“ (Blues, Swing, II–V–I, Optionstöne, Voicing, modaler Jazz, Songform, Akkordschema, Filmmusik, Leitmotiv).

## M2 Vierstimmiger Satz

**Satz prüfen (M2):** Notenanzeige für vier Stimmen auf zwei Systemen mit Liedtext und Fermaten; die Prüf-Engine findet Quint- und Oktavparallelen (auch in Gegenbewegung und verdeckt zwischen den Außenstimmen), Fehler im Stimmumfang, zu große Abstände, Stimmkreuzungen und -überschreitungen. Dazu erkennt sie jeden Akkord mit Stufe, Umkehrung und Funktion (T, S, D, Tp …) und prüft Verdopplungen (kein verdoppelter Leitton), die Auflösung von Leitton und Septime sowie melodische Sprünge (keine übermäßigen Intervalle, nichts über die Oktave). Fehler werden rot, Stilhinweise orange im Notenbild markiert, jeweils mit Erklärung und Lexikon-Eintrag. Zum Ausprobieren unter **Hören** den Choralsatz oder den Übungssatz mit Fehlern wählen.

**Stufe 2 (M2):** acht Lektionen zu Funktionen und Kadenz, vierstimmigem Satz, Umkehrungen und Generalbass, Septakkorden, Nebenfunktionen, Modulation, Singbarkeit mit Textunterlegung und Choralanalyse, dazu das Abschlussprojekt „Choralsatz im Stil Bachs“. Satzaufgaben öffnen den Editor mit vorgegebenen Stimmen (Ergänzen, Aussetzen) und prüfen Funktionen, Kadenzen und Satzfehler. Neue Übungen: Funktionen bestimmen, Satzfehler finden, Umkehrungen bestimmen, Schlüsse hören. Beispiele in Lektionen zeigen auf Wunsch ihre Akkordanalyse.

**Chorsatz schreiben (M2):** Unter „Stück einstellen“ die Besetzung „Chorsatz“ wählen. Stimmen über die Knöpfe oder mit Tab wechseln; ein Tipp ins andere System wechselt automatisch die Stimme. Am MIDI-Keyboard verteilt ein Akkord mit vier Tönen sich von oben nach unten auf Sopran, Alt, Tenor und Bass. Einzelne Stimmen lassen sich stumm schalten, Liedtext erscheint unter dem Sopran, und „Satz prüfen“ markiert Fehler live beim Schreiben.

**Erklär mir das (M2, KI):** Neben jedem Befund der Satzprüfung und unter jeder Übungsaufgabe fragt „✨ Erklär mir das“ Claude (Anthropic API, Modell Claude Opus 5.5). Claude erklärt, warum es die Regel gibt, und schlägt zwei bis drei Korrekturen vor, die als Noten erscheinen und sich anhören lassen; die eigene Prüf-Engine kontrolliert jeden Vorschlag noch einmal. Dafür braucht man einen eigenen API-Schlüssel aus der [Anthropic Console](https://console.anthropic.com/settings/keys). Er wird unter „KI-Einstellungen“ (unten auf der Seite oder beim ersten Klick) eingegeben, **nur im Browser (localStorage) gespeichert** und nur an api.anthropic.com geschickt, nie ins Repository. Ein Zähler zeigt Anfragen und geschätzte Kosten im laufenden Monat; ein monatliches Ausgabenlimit stellt man in der Console unter „Limits“ ein.

## M1 Grundlagen

**Schreiben:** einstimmiger Noteneditor
- Noten mit dem Apple Pencil (oder der Maus) ins System setzen und zum Ändern der Tonhöhe ziehen; mit dem Finger wird gescrollt, außer „Mit dem Finger schreiben“ ist eingeschaltet
- Werkzeugleiste für Notenwerte, Punktierung, Vorzeichen, Haltebogen, Pausen, Löschen, Rückgängig und Wiederholen
- Bildschirmklavier mit deutschen Tastennamen, Tastenkürzel am Desktop (c d e f g a h, b = B, Ziffern 2–6 für Notenwerte)
- Taktstriche entstehen automatisch, über den Taktstrich reichende Noten werden gebunden
- Tonart, Taktart, Schlüssel und Tempo einstellbar; Export und Import als JSON
- MIDI-Keyboard über Web MIDI (Chrome am PC): wird automatisch erkannt, nimmt Tonhöhe und Anschlagstärke auf, erkennt Akkorde
- „Meine Stücke“: Stücke werden in der lokalen Datenbank (IndexedDB) gespeichert und automatisch aktualisiert

**Wiederholung (M2):** Ein Planer nach dem SM-2-Verfahren berechnet aus den Übungsergebnissen für jeden Übungstyp, wann er wieder dran ist. Unter **Lernen** startet die tägliche Wiederholung mit etwa 15 gemischten Aufgaben; schwache Themen bekommen mehr Aufgaben und kommen schon am nächsten Tag wieder.

**Lernen:** Lernpfad mit Fortschritt je Modul; Sicherung aller Daten als Datei, um sie zwischen iPad und PC abzugleichen
- Übungen der Stufe 1 in Runden zu 10 Aufgaben: Noten lesen, Notenwerte, Intervalle bestimmen, Tonarten an den Vorzeichen, Paralleltonarten, Dreiklänge bestimmen
- Gehörübungen: Intervalle (mit Liedanfängen als Hörhilfe), Dreiklangsarten, Melodiediktat auf dem Bildschirmklavier
- Aufgaben werden zufällig erzeugt und schwerer, je sicherer man im Modul ist; jede Antwort wird erklärt

**Lektionen:** zu jedem Modul der Stufe 1 eine Lektion in fünf Schritten (Erklären, Hören, Üben, Schreiben, Freie Aufgabe) mit klingenden Notenbeispielen
- Schreibaufgaben öffnen den Editor mit passenden Vorgaben und prüfen die Lösung automatisch (z. B. Tonleiter richtig, endet auf dem Grundton)
- Abschlussprojekt: achttaktige Melodie in Dur mit klarem Schluss
- Fachbegriffe sind automatisch ins Lexikon verlinkt; wie man Lektionen schreibt, steht in [docs/lektionen.md](docs/lektionen.md)

**Einstufungstest:** 30 Fragen (Lesen und Hören) zu den sechs Modulen der Stufe 1; wer in einem Modul 4 von 5 schafft, überspringt es. Jederzeit wiederholbar.

**Lexikon:** über 150 Begriffe in zehn Kategorien, von Grundbegriffen über Harmonik und Satztechnik bis zu Formen, Instrumenten und Musikgeschichte, mit Notenbeispiel zum Anhören und Querverweisen
- Fehlertolerante Suche (auch Synonyme, Tippfehler und Wortformen wie „neapolitanisch“), Filter nach Kategorie
- Aus jeder Übungsrückmeldung direkt zum passenden Eintrag; neue Einträge sind Markdown-Dateien in `src/lexikon/eintraege/`

## M0 Fundament

- Eigenes JSON-Notenmodell ([Beschreibung](docs/notenmodell.md))
- Notenanzeige mit [VexFlow](https://www.vexflow.com), deutsche Notennamen (H, B, Fis, Es …)
- Wiedergabe mit [Tone.js](https://tonejs.github.io) und Klaviersamples (Salamander Grand Piano), die gerade klingende Note wird markiert
- Beispielmelodien, JSON-Editor und Import einer JSON-Datei
- Offline-fähig und auf dem Home-Bildschirm installierbar
- Automatisches Prüfen und Veröffentlichen über GitHub Actions und GitHub Pages

Der vollständige Plan mit allen Meilensteinen (M0 bis M6) steht in den [GitHub-Milestones](../../milestones).

## Auf dem iPad testen

1. In Safari https://pilshrimpmaster.github.io/KompositionTrainer/ öffnen.
2. Teilen-Symbol → „Zum Home-Bildschirm“ → „Hinzufügen“.
3. Die App vom Home-Bildschirm starten, eine Melodie wählen und auf „Abspielen“ tippen. Ton kommt erst nach dem ersten Antippen, das ist eine Vorgabe von Safari.

## Entwicklung

```bash
npm install
npm run dev        # Entwicklungsserver
npm test           # Tests (Vitest)
npm run typecheck  # TypeScript prüfen
npm run build      # Produktionsversion nach dist/
```

Jeder Push auf `main` wird getestet, gebaut und auf GitHub Pages veröffentlicht. Pull Requests werden nur getestet und gebaut.

## Lizenzen

- Code: MIT, siehe [LICENSE](LICENSE)
- Klaviersamples: Salamander Grand Piano von Alexander Holm, CC BY 3.0, siehe [public/samples/piano/LIZENZ.txt](public/samples/piano/LIZENZ.txt)
- Beispielmelodien: gemeinfreie Werke
