---
modul: s8-beats
titel: Beats programmieren
dauer: 60 Minuten
---

## Erklären

Ein Beat besteht fast immer aus drei Grundrollen:

| Rolle | Klang | Aufgabe |
| --- | --- | --- |
| **Kick** (Bassdrum) | tief, kurz, druckvoll | markiert die schweren Zeiten und trägt den Groove zusammen mit dem Bass |
| **Snare** oder **Clap** | mittelhoch, knallend | der **Backbeat** auf Zählzeit 2 und 4; gibt dem Beat das Rückgrat |
| **Hi-Hat** | hoch, zischend | zählt das Raster aus (Achtel oder Sechzehntel) und bestimmt die Bewegung |

Dazu kommen Open Hat, Toms, Rimshot, Shaker und andere Percussion als Würze.

**Das Raster.** Ein 4/4-Takt hat im Step-Sequencer 16 Sechzehntel. Gezählt wird „1 e + a, 2 e + a, 3 e + a, 4 e + a“. Die Zählzeiten liegen auf den Schritten **1, 5, 9 und 13**, die Achtel-Offbeats („+“) auf **3, 7, 11 und 15**.

**Die wichtigsten Grundmuster:**

- **Four-on-the-floor**: Kick auf jedem Viertel (1, 5, 9, 13). House, Techno, Disco, viel Pop.
- **Backbeat**: Snare oder Clap auf 2 und 4 (5 und 13). Fast jede Pop-, Rock- und Hip-Hop-Produktion.
- **Offbeat-Hats**: offene Hi-Hat genau zwischen den Kicks (3, 7, 11, 15). Das typische „Pumpen“ im House.
- **Halftime**: Die Snare kommt nur auf Zählzeit 3 (Schritt 9). Das Tempo fühlt sich halb so schnell an. Trap, Dubstep.
- **Dembow**: Snare im Rhythmus 3+3+2 über einer geraden Kick. Reggaeton und Dancehall.

| Genre | Tempo (BPM) | Merkmale |
| --- | --- | --- |
| Hip-Hop (Boom Bap) | 85–95 | Swing, Kick und Snare im Dialog |
| Reggaeton | 90–100 | Dembow |
| Pop | 95–125 | Backbeat, oft Clap und Snare zusammen |
| House | 120–128 | Four-on-the-floor, Offbeat-Hats |
| Techno | 125–140 | gerade, hypnotisch, wenig Melodie |
| Trap | 130–150 | Halftime, schnelle Hi-Hat-Rolls, 808-Bass |
| Drum & Bass | 170–176 | gebrochene Kick, Snare auf 2 und 4 |

## Vertiefen

**Velocity: nicht jeder Schlag ist gleich laut.** Ein echter Drummer spielt die Hi-Hat auf den Zählzeiten etwas lauter als dazwischen. Programmierst du alle Schläge gleich stark, klingt der Beat wie eine Maschine. Abhilfe: Betone die Achtel und mach die Sechzehntel dazwischen leiser. Im Beat-Baukasten schaltest du dazu auf „Velocity“, in FL Studio ziehst du die Balken unten in der Piano Roll.

**Ghost Notes** sind sehr leise Zwischenschläge, meist auf der Snare. Man hört sie kaum einzeln, aber sie machen den Groove lebendig. Funk und Boom Bap leben davon.

**Swing** verschiebt jede zweite Sechzehntel ein wenig nach hinten. Bei 0 % ist alles gerade, bei etwa 50 bis 60 % klingt es nach Triolen. Hip-Hop mit 20 bis 40 % Swing wirkt sofort lockerer. In FL Studio findest du den Swing-Regler oben im Channel Rack.

**Variation.** Ein Beat, der sich 64 Takte lang nicht ändert, ermüdet. Typische Mittel:

- Alle vier oder acht Takte ein **Fill**: eine Snare- oder Tom-Folge im letzten Viertel.
- Eine **Crash** oder ein Effekt auf der Eins des neuen Teils.
- Elemente **weglassen**: vor dem Refrain die Kick für einen Takt rausnehmen, damit sie danach umso stärker kommt.
- Zweites Pattern mit kleinen Änderungen (andere Kick-Position, zusätzliche Percussion) und in der Playlist abwechseln.

**Die Kick und der Bass.** Kick und Bass teilen sich die tiefen Frequenzen. Lass die Bassline oft mit der Kick zusammen anschlagen oder bewusst dazwischen. Wie man beide im Mix trennt (Sidechain), lernst du in der Lektion Mixing.

## Hören

**Boom Bap**: Snare auf 2 und 4, die Kick antwortet frei, Hi-Hats mit Swing und Betonung.

```beat
titel: Hip-Hop (Boom Bap)
bpm: 90
swing: 35
kick: x... ...x ..x. ....
snare: .... x... .... x..-
hihat: x.o. x.o. x.o. x.o.
```

**Trap** im Halftime-Feeling: Die Clap kommt erst auf Zählzeit 3, die Hi-Hats laufen in Sechzehnteln mit einem kleinen Roll.

```beat
titel: Trap
bpm: 140
kick: x... .... ..x. ..x.
clap: .... .... x... ....
hihat: xoxo xoxo xxxx x-x-
openhat: .... ...x .... ....
```

**Dembow**: Die Snare spielt 3+3+2 über der geraden Kick.

```beat
titel: Reggaeton (Dembow)
bpm: 95
kick: x... x... x... x...
snare: ...x ..x. ...x ..x.
hihat: x.x. x.x. x.x. x.x.
```

**Funk** mit Ghost Notes auf der Snare: die leisen Schläge erkennst du an den blassen Feldern.

```beat
titel: Funk mit Ghost Notes
bpm: 104
kick: x..x ..x. ..x. .x..
snare: ..-. x..- .-.. x.-.
hihat: x-o- x-o- x-o- x-o-
```

## Üben

```uebungen
groove-erkennen tempo-schaetzen
```

## Schreiben

```aufgabe
titel: Ein Boom-Bap-Beat mit Swing
text: Bau einen Hip-Hop-Beat mit 85 bis 95 BPM. Die Snare liegt auf 2 und 4 (Schritt 5 und 13), die Kick hat mindestens drei Schläge und antwortet der Snare. Gib der Hi-Hat unterschiedliche Anschlagstärken, setz mindestens eine Ghost Note auf die Snare und stell den Swing auf mindestens 20 %.
beat: ja
bpm: 90
pruefung: bpm 85 95, spur snare 5 13, mindestens kick 3, dynamik hihat, ghost snare, swing 20
```

```aufgabe
titel: Ein Dembow-Groove
text: Die Kick läuft schon gerade auf jedem Viertel. Setz die Snare im Dembow-Rhythmus 3+3+2: Schritt 4, 7, 12 und 15, sonst nirgends. Ergänze mindestens vier Hi-Hats und stell das Tempo auf 88 bis 100 BPM.
beat: ja
bpm: 120
kick: x... x... x... x...
pruefung: spur kick 1 5 9 13, genau snare 4 7 12 15, mindestens hihat 4, bpm 88 100
```

## Freie Aufgabe

Such dir einen Song aus deinem Lieblingsgenre und hör nur auf das Schlagzeug: Wo liegt die Kick, wo die Snare, was machen die Hi-Hats? Bau das Pattern im Beat-Baukasten nach, so gut es geht, und vergleich es mit dem Original. Bau dann in FL Studio zwei Varianten desselben Beats (Strophe und Refrain) und ein Fill, das alle acht Takte erscheint.

## Quiz

? Auf welchen Schritten im 16er-Raster liegen die vier Zählzeiten?
+ 1, 5, 9 und 13
- 1, 2, 3 und 4
- 4, 8, 12 und 16
- 1, 3, 5 und 7

? Was ist der Backbeat?
+ Snare oder Clap auf Zählzeit 2 und 4
- Die Kick auf der Eins
- Ein Beat, der rückwärts läuft
- Eine Hi-Hat auf jeder Sechzehntel

? Was bedeutet Four-on-the-floor?
+ Die Kick schlägt auf jedes Viertel
- Vier Snares hintereinander
- Ein Beat mit vier Spuren
- Ein Beat im 4/4-Takt mit 4 BPM

? Wie wirkt ein Halftime-Beat, bei dem die Snare nur auf Zählzeit 3 liegt?
+ Er fühlt sich halb so schnell an wie das eigentliche Tempo
- Doppelt so schnell
- Wie ein Walzer
- Er hat keinen Puls

? Welches Muster ist typisch für Reggaeton?
+ Dembow: Snare im Rhythmus 3+3+2 über gerader Kick
- Snare nur auf Zählzeit 3
- Kick und Snare gleichzeitig auf jedem Schritt
- Offene Hi-Hat auf jedem Viertel

? Was sind Ghost Notes?
+ Sehr leise Zwischenschläge, meist auf der Snare
- Noten, die man nicht hört, weil sie stumm geschaltet sind
- Töne über der höchsten Taste
- Gelöschte Noten in der Piano Roll

? Was macht Swing?
+ Er verschiebt jede zweite Sechzehntel etwas nach hinten
- Er macht den Beat lauter
- Er verdoppelt das Tempo
- Er fügt Hall hinzu

? Was ist die Velocity?
+ Die Anschlagstärke einer Note
- Das Tempo des Songs
- Die Länge eines Patterns
- Die Tonhöhe eines Drums

? In welchem Tempobereich liegt House meistens?
+ 120–128 BPM
- 70–80 BPM
- 160–180 BPM
- 200–220 BPM

? Wie verhinderst du, dass ein Beat über viele Takte ermüdet?
+ Mit Fills, Variationen und Weglassen von Elementen
- Indem man das Tempo ständig ändert
- Indem man alle Schläge gleich laut macht
- Indem man mehr Hall benutzt
