---
modul: s2-choralanalyse
titel: Choräle analysieren
dauer: 45 Minuten
---

## Erklären

Johann Sebastian Bach hat rund 400 vierstimmige Choralsätze hinterlassen. Sie sind seit über 200 Jahren das wichtigste Lehrmaterial für den vierstimmigen Satz. Wenn du einen Choral analysierst, gehst du am besten in vier Schritten vor:

1. **Tonart und Zeilen**: Wo stehen die Fermaten? Jede Fermate beendet eine Textzeile und eine harmonische Einheit.
2. **Kadenzen an den Fermaten**: Ganzschluss, Halbschluss oder Trugschluss? In welcher Tonart? Mittlere Zeilen weichen oft in die Dominanttonart oder die Paralleltonart aus.
3. **Funktionen** Akkord für Akkord, mit Umkehrungen.
4. **Stimmführung**: Wo bleiben Töne liegen, wo laufen Durchgangsnoten, wie bewegen sich Sopran und Bass zueinander?

Die folgenden Beispiele sind Choralzeilen im Stil Bachs, die für den KompositionsTrainer geschrieben wurden. Wie du echte Bach-Choräle über den MusicXML-Import lädst, steht weiter unten unter „Vertiefen“.

```satz
titel: Choralzeilen in G-Dur
tonart: 1
tempo: 66
analyse: ja
text: Hell er- klingt der Chor im Saal, al- le stim- men fröh- lich ein
S: B4:4 A4 G4 A4 | B4 B4 A4:2^ | B4:4 C5 D5 C5 | B4 A4 G4:2^
A: G4:4 F#4 G4 F#4 | G4 F#4 F#4:2 | G4:4 G4 G4 A4 | G4 F#4 G4:2
T: D4:4 D4 B3 D4 | D4 D4 D4:2 | D4:4 E4 D4 E4 | D4 D4 B3:2
B: G3:4 D3 E3 D3 | G3 B2 D3:2 | G3:4 C3 B2 A2 | D3 D3 G2:2
```

Die erste Zeile endet mit einem **Halbschluss** auf D-Dur, die zweite mit einem **Ganzschluss**. Achte auf den Bass: Er springt in der zweiten Zeile zur Subdominante C und läuft dann stufenweise abwärts (C – H – A) zur Dominante D. So bereitet er die Kadenz vor.

## Hören

Ein Choral in Moll. Bach beendet Mollchoräle sehr oft mit einem Durakkord, der **pikardischen Terz**. Die Analyse zeigt den Schlussakkord deshalb als T statt t.

```satz
titel: Zeile in a-Moll mit pikardischer Terz
tonart: 0 moll
analyse: ja
S: C5:4 D5 B4 C#5^
A: A4:4 A4 G#4 A4
T: E4:4 F4 E4 E4
B: A2:4 D3 E3 A2
```

## Vertiefen

**Was Bachs Choräle so lebendig macht:**
- **Durchgangsnoten in Achteln** zwischen zwei Akkordtönen, besonders im Alt, Tenor und Bass. Sie füllen Terzsprünge aus und lassen die Mittelstimmen fließen.
- **Vorhalte an den Kadenzen**, besonders der Quartvorhalt 4–3 über der Dominante: Der Grundton der Tonika wird in die Dominante hinübergehalten und löst sich dann abwärts zum Leitton auf.
- **Zwischendominanten** fast in jeder Zeile, oft zur Dominante oder zur Tp.
- **Ein melodischer Bass**, der oft eine eigene Gegenstimme zum Sopran bildet, mit Sextakkorden statt reiner Grundtöne.
- **Kadenzen in vielen Tonarten:** In einem Choral mit sechs Zeilen kommen leicht vier verschiedene Zieltonarten vor.

**Wie du echte Bach-Choräle analysierst:** Über den MusicXML-Import im Editor kannst du Choräle aus freien Notenausgaben oder aus MuseScore laden. Die Prüfung im Editor zeigt dir die Funktionen. Vergleiche dann, wo Bach selbst gegen die Lehrbuchregeln verstößt, und überlege, warum: Meist steckt eine Textausdeutung oder eine besonders gute Linie dahinter.

**Ein Analyseprotokoll** hilft beim Lernen. Notiere pro Zeile: Zieltonart, Schlussart, auffällige Akkorde (Zwischendominanten, Septakkorde, Trugschlüsse) und eine Beobachtung zur Stimmführung. Nach zehn Chorälen kennst du Bachs Vokabular.

## Üben

Bestimme Funktionen und Schlüsse. Je sicherer du sie erkennst, desto schneller liest du einen Choral.

```uebungen
funktion-bestimmen kadenz-hoeren
```

## Schreiben

```aufgabe
titel: Choralzeile ergänzen
text: Sopran und Bass einer Choralzeile in G-Dur sind vorgegeben, so wie Bach oft zuerst die Außenstimmen festlegte. Schreib Alt und Tenor dazu. Analysiere vorher, welche Funktion jeder Akkord hat.
tonart: 1
satz: ja
sopran: B4:4 A4 G4 A4 | B4 B4 A4:2^
bass: G3:4 D3 E3 D3 | G3 B2 D3:2
pruefung: vierstimmig, fehlerfrei
```

```aufgabe
titel: Zweite Choralzeile ergänzen
text: Eine weitere Zeile in G-Dur: Sopran und Bass sind vorgegeben. Analysiere zuerst: T₃ – S – T – D | T – D – T. Schreib dann Alt und Tenor. Achtung beim letzten Akkord: Der Leitton im Alt geht aufwärts zum G, darum fehlt dort die Quinte.
tonart: 1
satz: ja
sopran: D5:4 C5 B4 A4 | B4 A4 G4:2^
bass: B2:4 C3 G2 D3 | G2 D3 G2:2
pruefung: vierstimmig, fehlerfrei, ganzschluss
```

## Freie Aufgabe

Öffne unter **Hören** den Choralsatz und lass ihn mit „Satz prüfen“ laufen. Schreib dir zu jedem Akkord die Funktion auf und vergleiche sie mit der Analyse in dieser Lektion.

## Quiz

? Was markieren die Fermaten in einem Choral?
+ Das Ende einer Textzeile und einer harmonischen Einheit
- Besonders laute Stellen
- Den Beginn eines neuen Verses
- Stellen, an denen die Tonart wechselt

? Was ist die pikardische Terz?
+ Ein Mollstück endet mit einem Durakkord
- Die Terz wird im Schlussakkord weggelassen
- Eine Terz im Bass
- Ein Durstück endet in Moll

? In welche Tonarten weichen mittlere Choralzeilen oft aus?
+ In die Dominanttonart oder die Paralleltonart
- In weit entfernte Tonarten
- In die Tonart einen Halbton höher
- Sie bleiben immer in der Haupttonart

? Was ist der erste Schritt einer Choralanalyse?
+ Tonart und Zeilen bestimmen: Wo stehen die Fermaten?
- Jeden Akkord sofort benennen
- Die Altstimme singen
- Nach Parallelen suchen

? Mit welchem Schluss endet eine Zeile, die auf der Dominante stehen bleibt?
+ Halbschluss
- Ganzschluss
- Trugschluss
- Plagalschluss

? Was ist ein Quartvorhalt 4–3?
+ Statt der Terz erklingt erst die Quarte über dem Bass und löst sich dann abwärts zur Terz auf
- Ein Akkord aus Quarten
- Ein Sprung von der Quarte zur Terz im Bass
- Ein Quartsextakkord vor der Dominante

? Wozu dienen Durchgangsnoten in Bachs Chorälen?
+ Sie füllen Sprünge zwischen Akkordtönen aus und lassen die Stimmen fließen
- Sie ersetzen den Schlussakkord
- Sie markieren das Zeilenende
- Sie verdoppeln den Leitton

? Was notierst du in einem Analyseprotokoll pro Choralzeile?
+ Zieltonart, Schlussart, auffällige Akkorde und eine Beobachtung zur Stimmführung
- Nur die Anzahl der Noten
- Die Tempoangabe
- Nur den Text
