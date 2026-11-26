---
modul: s8-pianoroll
titel: Piano Roll und MIDI
dauer: 60 Minuten
---

## Erklären

Die **Piano Roll** ist das Notenblatt der DAW. Senkrecht steht eine Klaviertastatur, waagerecht läuft die Zeit. Jede Note ist ein Balken: Wo er beginnt, wie lang er ist und wie hoch er liegt, siehst du sofort. Wer Noten lesen kann, hat einen großen Vorteil: Du weißt, welche Töne in einen Akkord gehören und wie eine Stimme sinnvoll weitergeht.

Jede Note in der Piano Roll ist ein **MIDI-Ereignis** mit vier Werten:

| Wert | Bedeutung | In Noten |
| --- | --- | --- |
| **Tonhöhe** | MIDI-Nummer 0–127, c′ = 60 | die Note im System |
| **Start** | Position im Raster | Takt und Zählzeit |
| **Länge** | wie lange die Taste gehalten wird | Notenwert, Artikulation |
| **Velocity** | Anschlagstärke 1–127 | Dynamik und Akzente |

**Raster und Snap.** Oben in der Piano Roll stellst du ein, auf welches Raster Noten einrasten: ein Takt, ein Viertel, eine Sechzehntel, eine Triole. Für Melodien ist meist 1/4 Schritt (eine Sechzehntel) richtig.

**Quantisieren** schiebt eingespielte Noten auf das Raster. Mit einem MIDI-Keyboard spielst du nie ganz genau. Volles Quantisieren macht alles maschinell exakt, teilweises Quantisieren (etwa 50 %) zieht die Noten nur in Richtung Raster und lässt Gefühl übrig. Das Gegenteil heißt **Humanize**: kleine Zufallsabweichungen in Zeit und Velocity, damit programmierte Noten lebendig klingen.

**Der Weg vom Trainer nach FL Studio.** Im Editor dieses Trainers schreibst du in Noten, mit Akkordsymbolen, mehrstimmig oder für Klavier. Mit **„Als MIDI speichern“** wird daraus eine Standard-MIDI-Datei: jede Stimme eine Spur, die Akkordsymbole als eigene Akkordspur. In FL Studio ziehst du die Datei in die Playlist oder öffnest sie in der Piano Roll über das Menü (Datei > MIDI-Datei importieren). Danach wählst du für jede Spur ein Instrument.

## Vertiefen

**Akkorde in der Piano Roll.** Pop-Produzenten legen Akkorde meist in **enger Lage** in die Mitte (um c′) und spielen den Grundton getrennt im Bass. Das ist dieselbe Arbeitsteilung wie in deinen Klaviersätzen: Begleitung oben, Bass unten. Achte auf gute **Stimmführung**: Statt jeden Akkord in Grundstellung zu springen, nimm Umkehrungen, damit die Töne nah beieinander bleiben. Aus C – G – Am – F wird so c-e-g, h-d-g, c-e-a, c-f-a.

**Basslines.** Die einfachste Bassline spielt den **Grundton** jedes Akkords in Achteln. Lebendiger wird sie durch:

- **Oktavsprünge** (Disco, Funk): Grundton und Oktave im Wechsel.
- **Durchgangstöne** zum nächsten Grundton, wie im Walking Bass.
- **Pausen und Synkopen**, die mit der Kick zusammengehen oder ihr bewusst ausweichen.
- **Lange Noten** unter Pads (Ballade, Ambient).

**Die Hook.** Die Hook ist der Teil, den man nach dem ersten Hören mitsingt. Sie ist kurz (zwei bis vier Takte), wiederholt ein Motiv und hat einen klaren Rhythmus. Alles, was du über Motive, Sequenz und Periode gelernt hast, gilt hier genauso.

**Velocity musikalisch einsetzen.** Viele Instrumente klingen bei hoher Velocity nicht nur lauter, sondern auch heller. Betone die Hook-Töne, nimm Durchgangstöne zurück und lass Akkorde nicht alle exakt gleichzeitig anschlagen (ein paar Millisekunden Versatz, der sogenannte Strum).

**Ein MIDI-Keyboard** macht das Einspielen viel schneller. In FL Studio unter Optionen > MIDI-Einstellungen das Gerät aktivieren, dann im Transport die Aufnahme starten. Auch im Synth-Labor dieses Trainers kannst du ein MIDI-Keyboard anschließen.

## Hören

Ein Akkord-Loop als Leadsheet: Melodie mit Akkordsymbolen. Gespeichert als MIDI, landet die Melodie auf Spur 1 und die Akkorde auf einer eigenen Spur.

```noten
titel: Loop: Am – F – C – G
tonart: 0 moll
tempo: 96
A4:4[Am] C5 E5 C5 | F5:2[F] E5:4 C5 | G5:4[C] E5 C5:2 | B4:2[G] D5:2
```

Eine Bassline in Achteln mit Oktavsprüngen unter einer einfachen Melodie. Schalte „Harmonien zeigen“ ein.

```zweistimmig
titel: Übung: Bassline mit Oktaven
klavier: ja
tempo: 100
oben: E5:2 G5:2 | C5:2 E5:2 | F5:2 A5:2 | D5:2 B4:2 | C5:1
unten: C3:8 C3 C2 C3 C3 C3 C2 C3 | A2:8 A2 A1 A2 A2 A2 A1 A2 | F2:8 F2 F1 F2 F2 F2 F1 F2 | G2:8 G2 G1 G2 G2 G2 G1 G2 | C2:1
```

## Üben

```uebungen
akkordsymbol-lesen begleitmuster-bestimmen
```

## Schreiben

```aufgabe
titel: Eine Bassline unter dem Loop
text: Die Melodie in C-Dur ist vorgegeben, die Akkorde sind C – Am – F – G und am Schluss C. Schreib eine Bassline in Achteln: den Grundton des Akkords, ab und zu die Oktave oder die Quinte. Im letzten Takt ein langer Grundton. Speichere das Ergebnis danach als MIDI und hör es in FL Studio mit einem Bass-Instrument.
tonart: 0
klavier: ja
melodie: E5:2 G5:2 | C5:2 E5:2 | F5:2 A5:2 | D5:2 B4:2 | C5:1
pruefung: vollstaendig, fehlerfrei, begleitung-noten 28, ganzschluss
```

```aufgabe
titel: Eine Hook über vier Akkorde
text: Schreib eine Hook von acht Takten in a-Moll als Leadsheet über den Loop Am – F – C – G, ein Akkord pro Takt. Takt 5 bis 8 wiederholen den Anfang und enden mit G und Am (a im letzten Takt). Lange Töne gehören zum Akkord, Durchgangstöne dürfen kurz sein.
tonart: 0 moll
pruefung: takte 8, akkordsymbole 8, leadsheet-fehlerfrei, endet-grundton
```

## Freie Aufgabe

Nimm einen eigenen Akkord-Loop, schreib ihn im Editor mit Akkordsymbolen und einer Melodie und speichere ihn als MIDI. Öffne die Datei in FL Studio, gib den Akkorden ein Pad, der Melodie einen Lead-Sound und schreib in der Piano Roll eine Bassline. Probiere danach, die Melodie mit einem MIDI-Keyboard selbst einzuspielen, und vergleiche: ohne Quantisieren, mit 50 % und mit 100 %.

## Quiz

? Welche vier Werte hat jede Note in der Piano Roll?
+ Tonhöhe, Start, Länge und Velocity
- Tonart, Takt, Tempo und Lautstärke
- Instrument, Hall, Panorama und EQ
- Notenname, Oktave, Farbe und Kanal

? Welche MIDI-Nummer hat das eingestrichene c (c′)?
+ 60
- 0
- 48
- 127

? Was macht Quantisieren?
+ Es schiebt Noten auf das eingestellte Raster
- Es macht Noten lauter
- Es transponiert in eine andere Tonart
- Es löscht doppelte Noten

? Wozu dient Humanize?
+ Kleine Abweichungen in Zeit und Velocity machen programmierte Noten lebendiger
- Es entfernt den Gesang
- Es macht alle Noten gleich laut
- Es setzt Akkordsymbole

? Wie liegen Akkorde in Pop-Produktionen meistens?
+ In enger Lage in der Mitte, der Grundton getrennt im Bass
- Immer in Grundstellung über drei Oktaven verteilt
- Nur im Bass
- Ohne Terz

? Warum nimmt man bei Akkordwechseln Umkehrungen?
+ Damit die Töne nah beieinander bleiben, wie bei guter Stimmführung
- Weil Grundstellungen in MIDI nicht erlaubt sind
- Damit der Akkord lauter klingt
- Damit die Tonart wechselt

? Was ist die einfachste Form einer Bassline?
+ Der Grundton jedes Akkords, zum Beispiel in Achteln
- Eine Tonleiter von unten nach oben
- Der höchste Ton des Akkords
- Ein Cluster

? Was entsteht beim MIDI-Export aus einem Leadsheet in diesem Trainer?
+ Eine Melodiespur und eine eigene Akkordspur
- Eine WAV-Datei
- Nur die Melodie, ohne Akkorde
- Ein Notenbild als PDF

? Was ist eine Hook?
+ Ein kurzer, einprägsamer Teil, meist zwei bis vier Takte, den man mitsingt
- Der Schlussakkord
- Ein Effekt im Mixer
- Ein langes Intro

? Was bewirkt eine höhere Velocity bei vielen Instrumenten außer mehr Lautstärke?
+ Einen helleren Klang
- Eine tiefere Tonhöhe
- Ein langsameres Tempo
- Mehr Hall
