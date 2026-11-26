---
modul: s8-sounddesign
titel: Sounddesign: Synthesizer verstehen
dauer: 60 Minuten
---

## Erklären

Jeder Klang besteht aus einem **Grundton** und vielen **Obertönen** darüber. Welche Obertöne wie stark mitklingen, bestimmt die **Klangfarbe**: Darum klingt ein a′ auf der Flöte anders als auf der Geige, obwohl beide 440 Hz spielen. Ein Synthesizer baut Klänge, indem er diese Obertöne gezielt erzeugt und formt.

Die verbreitetste Methode ist die **subtraktive Synthese**. Sie arbeitet wie ein Bildhauer: Man beginnt mit einem obertonreichen Klang und nimmt weg, was man nicht braucht.

1. **Oszillator**: erzeugt die Grundwelle.
2. **Filter**: schneidet Obertöne ab.
3. **Verstärker mit Hüllkurve**: formt den Lautstärkeverlauf.
4. **LFO**: bewegt einen dieser Werte langsam hin und her.

**Die vier Grundwellen:**

| Welle | Obertöne | Klang | typisch für |
| --- | --- | --- | --- |
| **Sinus** | keine | rund, weich, rein | Sub-Bass, 808, Flötenartiges |
| **Dreieck** | wenige ungerade, schwach | weich, etwas heller | sanfte Leads |
| **Sägezahn** | alle | hell, scharf, voll | Leads, Pads, Streicher, Supersaw |
| **Rechteck** | nur ungerade, stark | hohl, nasal | Chiptune, Klarinettenartiges, Bässe |

**Das Filter.** Ein **Tiefpass** (Low Pass) lässt die Tiefen durch und schneidet die Höhen ab: Je niedriger die Grenzfrequenz (**Cutoff**), desto dumpfer der Klang. Ein **Hochpass** macht es umgekehrt. Die **Resonanz** hebt die Frequenzen genau an der Grenze an; hoch eingestellt pfeift das Filter.

**Die Hüllkurve (ADSR):**

- **Attack**: wie schnell der Ton nach dem Anschlag voll da ist. Kurz für Plucks und Bässe, lang für Pads, die einschweben.
- **Decay**: wie schnell er danach auf den Haltepegel fällt.
- **Sustain**: der Pegel, solange die Taste gedrückt bleibt.
- **Release**: wie lange er nach dem Loslassen ausklingt.

**Der LFO** (Low Frequency Oscillator) schwingt so langsam, dass man ihn nicht als Ton hört, sondern als Bewegung. Auf dem Filter erzeugt er das „Wobbeln“ eines Dubstep-Basses, auf der Tonhöhe ein Vibrato, auf der Lautstärke ein Tremolo.

## Vertiefen

**Klangrezepte.** Probiere sie im Synth-Labor aus und bau sie danach in FL Studio mit **3x Osc**, **FLEX** oder **Sytrus** nach:

| Klang | Welle | Filter | Hüllkurve | Extras |
| --- | --- | --- | --- | --- |
| **Sub-Bass** | Sinus | Tiefpass, tief | Attack kurz, Sustain hoch, Release kurz | mono, eine Oktave unter dem Bass |
| **Pad** | Sägezahn, zwei verstimmte | Tiefpass, mittel | Attack lang (0,5–2 s), Release lang | Hall, langsamer LFO |
| **Pluck** | Rechteck oder Sägezahn | Tiefpass mit etwas Resonanz | Attack 0, Decay kurz, Sustain 0 | Delay |
| **Lead** | Sägezahn, leicht verstimmt | Tiefpass offen | Attack kurz, Sustain hoch | Vibrato über den LFO |
| **Wobble-Bass** | Sägezahn | Tiefpass, viel Resonanz | Sustain voll | LFO auf den Cutoff, im Songtempo |

**Verstimmen (Detune).** Zwei gleiche Oszillatoren, einer um ein paar Cent verstimmt, schweben gegeneinander. Der Klang wird breiter und lebendiger. Viele verstimmte Sägezähne übereinander ergeben die **Supersaw** des Trance und EDM.

**Die 808.** Ursprünglich die Bassdrum der Roland TR-808, heute ein eigenes Instrument: ein Sinuston mit kurzem Tonhöhen-Abfall am Anfang und langem Ausklang, oft leicht verzerrt. Er spielt gleichzeitig Kick und Bassline, deshalb muss er in der Tonart des Songs gestimmt sein.

**Sampling.** Statt Klänge zu synthetisieren, kann man Aufnahmen verwenden: einen Drum-Hit, eine Gesangsphrase, einen Akkord. In FL Studio spielen der **Sampler**-Kanal, **FPC** (für Drums) und **Slicex** (zerschneidet Loops) Samples ab. Vieles in Hip-Hop und House entsteht aus Samples.

**Layering.** Gute Sounds bestehen oft aus Schichten: ein Pluck für den Anschlag, ein Pad für den Körper, ein Sub für das Fundament. Jede Schicht übernimmt einen Frequenzbereich.

## Hören

Ein **Sub-Bass**: Sinus, nur Grundton. Auf Handylautsprechern hört man ihn kaum, im Club spürt man ihn.

```synth
titel: Sub-Bass
vorlage: Sub-Bass
noten: C2 C2 G1 A#1
```

Ein **Pad**: langer Attack, langer Release, Hall. Der Klang schwebt ein und klingt aus.

```synth
titel: Pad
vorlage: Pad
noten: A3 C4 E4
```

Ein **Pluck**: kein Sustain, kurzer Decay. Jeder Ton ist ein kurzer Zupfer.

```synth
titel: Pluck
vorlage: Pluck
noten: A4 C5 E5 A5 G5 E5 C5 E5
```

Ein **Wobble-Bass**: Der LFO öffnet und schließt das Filter.

```synth
titel: Wobble-Bass
vorlage: Wobble-Bass
noten: E2 E2 E2 G2
```

## Üben

```uebungen
wellenform-hoeren instrument-hoeren
```

## Schreiben

```aufgabe
titel: Ein Sub-Bass
text: Bau im Synth-Labor einen Sub-Bass: Sinuswelle, Tiefpass mit einem Cutoff von höchstens 600 Hz, kurzer Attack (höchstens 20 ms) und ein Sustain von mindestens 70 %, damit lange Basstöne stehen bleiben. Spiel tiefe Töne um C2 und hör dir das Spektrum an: nur ein einziger Balken.
synth: ja
pruefung: welle sine, filter lowpass, cutoff-max 600, attack-max 0.02, sustain-min 0.7
```

```aufgabe
titel: Ein Pad
text: Bau ein schwebendes Pad: Sägezahn, leicht verstimmt (mindestens 5 Cent), Tiefpass mit höchstens 2,5 kHz, ein langer Attack von mindestens einer halben Sekunde, Release mindestens 1,5 Sekunden und mindestens 30 % Hall. Halte einen Akkord und hör, wie der Klang einschwebt.
synth: ja
pruefung: welle sawtooth, detune-min 5, cutoff-max 2500, attack-min 0.5, release-min 1.5, hall-min 0.3
```

```aufgabe
titel: Ein Pluck
text: Bau einen Pluck, der wie gezupft klingt: Attack höchstens 10 ms, Decay höchstens 400 ms, Sustain höchstens 10 %. Wähle die Welle selbst und dreh etwas Resonanz dazu (mindestens 2), damit der Anschlag „ploppt“.
synth: ja
pruefung: attack-max 0.01, decay-max 0.4, sustain-max 0.1, resonanz-min 2
```

## Freie Aufgabe

Öffne in FL Studio den Synthesizer **3x Osc** und bau die drei Klänge aus den Aufgaben nach: Wellenform wählen, dann in den Kanaleinstellungen im Register für Hüllkurven und LFO (INS) die Ziele Lautstärke (VOL) und Filter (CUT) einstellen. Schreib eine Akkordfolge mit dem Pad, eine Melodie mit dem Pluck und eine Bassline mit dem Sub-Bass. Hör dir an, wie sich die drei Klänge im Frequenzbereich aufteilen.

## Quiz

? Was bestimmt die Klangfarbe eines Tons?
+ Welche Obertöne wie stark mitklingen
- Nur die Lautstärke
- Nur die Tonhöhe
- Die Länge der Note

? Wie arbeitet die subtraktive Synthese?
+ Ein obertonreicher Klang wird mit einem Filter beschnitten
- Viele Sinustöne werden addiert
- Aufnahmen werden zerschnitten
- Der Klang wird rückwärts gespielt

? Welche Welle hat keine Obertöne?
+ Sinus
- Sägezahn
- Rechteck
- Dreieck

? Welche Welle enthält alle Obertöne und klingt hell und scharf?
+ Sägezahn
- Sinus
- Dreieck
- Rauschen ohne Ton

? Was macht ein Tiefpassfilter?
+ Es lässt die Tiefen durch und schneidet die Höhen ab
- Es lässt nur die Höhen durch
- Es macht den Klang lauter
- Es verändert das Tempo

? Was bedeutet ein langer Attack?
+ Der Ton schwebt langsam ein, statt sofort da zu sein
- Der Ton klingt nach dem Loslassen lange nach
- Der Ton ist besonders laut
- Der Ton wird höher

? Was steuert der Release?
+ Wie lange der Ton nach dem Loslassen der Taste ausklingt
- Wie schnell der Ton einsetzt
- Die Tonhöhe
- Die Wellenform

? Was macht ein LFO auf dem Filter-Cutoff?
+ Er öffnet und schließt das Filter rhythmisch, der Klang „wobbelt“
- Er stimmt den Synthesizer
- Er erzeugt einen zusätzlichen Ton
- Er schaltet das Filter ab

? Was entsteht, wenn man zwei Oszillatoren leicht gegeneinander verstimmt?
+ Ein breiterer, schwebender Klang
- Ein Akkord
- Völlige Stille
- Ein Rauschen

? Was ist eine 808 in modernen Produktionen?
+ Ein Sinus-Bass mit Tonhöhen-Abfall, der Kick und Bassline zugleich ist
- Eine Snare
- Ein Hall-Effekt
- Ein Tempo von 808 BPM
