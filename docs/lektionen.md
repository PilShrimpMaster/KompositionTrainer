# Lektionen und Lexikon schreiben

## Lektionen

Jede Lektion ist eine Markdown-Datei in [`src/lernpfad/lektionen/`](../src/lernpfad/lektionen). Die Kopfzeilen nennen das Modul aus [`module.ts`](../src/lernpfad/module.ts), den Titel und die ungefähre Dauer. Jede Überschrift `## …` ist ein Schritt; der Ablauf ist immer Erklären → Hören → Üben → Schreiben → Freie Aufgabe. Fachbegriffe werden automatisch ins Lexikon verlinkt, je Schritt einmal. Ausdrücklich geht es mit `[Text](lexikon:id)`.

Bausteine stehen in Code-Blöcken:

````markdown
```noten
titel: G-Dur
tonart: 1
takt: 4/4
schluessel: treble
G4:4 A4 B4 C5 | D5:2 D5
```
````

Noten in Kurzform: Ton (`C4`, `F#4`, `Bb3`, `r` = Pause), Doppelpunkt, Notenwert (`1 2 4 8 16`, Punkte mit `.`), `~` für einen Haltebogen. Ohne Notenwert gilt der vorige. Taktstriche `|` sind nur zur Übersicht, der Editor-Algorithmus setzt sie selbst. Statt der Kurzform geht auch ein vollständiges [kt-score-JSON](notenmodell.md). `tonart` ist die Zahl der Vorzeichen (negativ = Bs), mit `moll` dahinter für Moll.

````markdown
```akkorde
klang: zusammen
C4 E4 G4 | A3 C4 E4
```

```uebungen
intervall-lesen intervall-hoeren
```

```aufgabe
titel: G-Dur-Tonleiter
text: Schreibe die G-Dur-Tonleiter von g′ bis g″.
tonart: 1
takt: 4/4
pruefung: tonleiter
```
````

Prüfkriterien (kommagetrennt, siehe [`pruefung.ts`](../src/lernpfad/pruefung.ts)): `takte N`, `noten N`, `dur`, `moll`, `beginnt-grundton`, `endet-grundton`, `schluss-lang`, `schritt-zum-schluss`, `umfang N` (in Stufen, 8 = Oktave), `sprung-max N`, `leitereigen`, `tonleiter`, `dreiklaenge N`, `nur-terzen`, `hoechster-ton-einmal`.

Das Abschlussprojekt einer Stufe hat das Modul `sN-abschluss`.

### Vierstimmige Sätze

Ein `satz`-Block zeigt einen Chorsatz (Sopran und Alt oben, Tenor und Bass unten). `analyse: ja` blendet auf Wunsch die erkannten Akkorde mit Funktion ein, `text:` legt Silben unter den Sopran:

````markdown
```satz
titel: Kadenz in C-Dur
tonart: 0
analyse: ja
S: G4:4 A4 G4 G4
A: E4:4 F4 D4 E4
T: C4:4 C4 B3 C4
B: C3:4 F3 G3 C3
```
````

Eine Satzaufgabe hat `satz: ja` und optional Vorgaben je Stimme (`sopran:`, `alt:`, `tenor:`, `bass:`) sowie `liedtext:`. Leere Stimmen schreibt man selbst. Zusätzliche Prüfkriterien: `vierstimmig`, `fehlerfrei` (keine Fehler der Satzprüfung), `funktionen T S D7 T` (Folge der Funktionen; `D` passt auch auf `D⁷`), `ganzschluss`, `enthaelt Tp` (oder `Sextakkord`, `Quartsextakkord`), `endet-in 1` (Kadenz in der Tonart mit dieser Vorzeichenzahl), `liedtext` (eine Silbe pro Sopran-Note).

Beispiele in Lektionen müssen fehlerfrei sein, es sei denn, ihr Titel beginnt mit „Mit Fehler“. Jede Satzaufgabe braucht eine Musterlösung in [`stufe2.test.ts`](../src/lernpfad/stufe2.test.ts); beides prüfen die Tests.

## Lexikon

Einträge liegen in [`src/lexikon/eintraege/`](../src/lexikon/eintraege). Kopfzeilen: `id`, `titel`, `kategorie`, `kurz` (ein, zwei Sätze), optional `synonyme` und `siehe` (kommagetrennt), `beispiel` (Töne wie bei `akkorde`), `klang` (`nacheinander` oder `zusammen`), `schluessel`, `tonart`. Die Tests prüfen, dass alle Verweise auf vorhandene Einträge zeigen.
