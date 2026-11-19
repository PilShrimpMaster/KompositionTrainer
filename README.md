# KompositionsTrainer

Eine Web-App (PWA), mit der man auf dem iPad und am Desktop das Komponieren klassischer Musik von Grund auf lernt: von Noten und Intervallen über den vierstimmigen Satz und Kontrapunkt bis zu Formenlehre, Instrumentation und eigenen Werken.

**App öffnen:** https://pilshrimpmaster.github.io/KompositionTrainer/

## Stand: M2 Vierstimmiger Satz (in Arbeit)

**Satz prüfen (M2):** Notenanzeige für vier Stimmen auf zwei Systemen mit Liedtext und Fermaten; die Prüf-Engine findet Quint- und Oktavparallelen (auch in Gegenbewegung und verdeckt zwischen den Außenstimmen), Fehler im Stimmumfang, zu große Abstände, Stimmkreuzungen und -überschreitungen. Dazu erkennt sie jeden Akkord mit Stufe, Umkehrung und Funktion (T, S, D, Tp …) und prüft Verdopplungen (kein verdoppelter Leitton), die Auflösung von Leitton und Septime sowie melodische Sprünge (keine übermäßigen Intervalle, nichts über die Oktave). Fehler werden rot, Stilhinweise orange im Notenbild markiert, jeweils mit Erklärung und Lexikon-Eintrag. Zum Ausprobieren unter **Hören** den Choralsatz oder den Übungssatz mit Fehlern wählen.

**Chorsatz schreiben (M2):** Unter „Stück einstellen“ die Besetzung „Chorsatz“ wählen. Stimmen über die Knöpfe oder mit Tab wechseln; ein Tipp ins andere System wechselt automatisch die Stimme. Am MIDI-Keyboard verteilt ein Akkord mit vier Tönen sich von oben nach unten auf Sopran, Alt, Tenor und Bass. Einzelne Stimmen lassen sich stumm schalten, Liedtext erscheint unter dem Sopran, und „Satz prüfen“ markiert Fehler live beim Schreiben.

## M1 Grundlagen

**Schreiben:** einstimmiger Noteneditor
- Noten mit dem Apple Pencil (oder der Maus) ins System setzen und zum Ändern der Tonhöhe ziehen; mit dem Finger wird gescrollt, außer „Mit dem Finger schreiben“ ist eingeschaltet
- Werkzeugleiste für Notenwerte, Punktierung, Vorzeichen, Haltebogen, Pausen, Löschen, Rückgängig und Wiederholen
- Bildschirmklavier mit deutschen Tastennamen, Tastenkürzel am Desktop (c d e f g a h, b = B, Ziffern 2–6 für Notenwerte)
- Taktstriche entstehen automatisch, über den Taktstrich reichende Noten werden gebunden
- Tonart, Taktart, Schlüssel und Tempo einstellbar; Export und Import als JSON
- MIDI-Keyboard über Web MIDI (Chrome am PC): wird automatisch erkannt, nimmt Tonhöhe und Anschlagstärke auf, erkennt Akkorde
- „Meine Stücke“: Stücke werden in der lokalen Datenbank (IndexedDB) gespeichert und automatisch aktualisiert

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
