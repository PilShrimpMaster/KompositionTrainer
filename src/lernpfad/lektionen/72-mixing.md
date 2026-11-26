---
modul: s8-mixing
titel: Mixing
dauer: 60 Minuten
---

## Erklären

**Mixing** heißt: alle Spuren so zusammenbringen, dass jede gehört wird und das Ganze nach einem Song klingt statt nach einem Haufen Klänge. Ein Orchestrator verteilt Instrumente auf Lagen; ein Mixer verteilt Klänge auf drei Dimensionen:

- **Lautstärke** (vorne und hinten): Was ist wichtig, was begleitet?
- **Frequenz** (oben und unten): Wer bekommt die Bässe, wer die Mitten, wer die Höhen?
- **Panorama und Raum** (links, rechts, Tiefe): Wo steht ein Klang, wie nah ist er?

**Die Werkzeuge im Mixer:**

| Werkzeug | Was es macht | Typischer Einsatz |
| --- | --- | --- |
| **Fader** (Lautstärke) | regelt den Pegel einer Spur | Balance zwischen den Spuren |
| **Panorama** | verteilt eine Spur zwischen links und rechts | Hi-Hats, Percussion, Doppelungen zur Seite |
| **EQ** (Equalizer) | hebt Frequenzbereiche an oder senkt sie ab | Platz schaffen, Klangfarbe formen |
| **Kompressor** | macht laute Stellen leiser und den Pegel gleichmäßiger | Gesang, Bass, Drums zusammenhalten |
| **Hall** (Reverb) | simuliert einen Raum | Tiefe, Atmosphäre |
| **Delay** | wiederholt den Klang als Echo | Breite, rhythmische Effekte |

**Gain-Staging.** Bevor du irgendetwas mit Effekten machst, stell die Pegel vernünftig ein: Keine Spur und nicht der Master dürfen rot werden (über 0 dB, „Clipping“). Ein guter Richtwert: einzelne Spuren mit Spitzen um −10 bis −6 dB, der Master mit etwa 6 dB Luft nach oben (**Headroom**) für das Mastering. Fang mit der wichtigsten Spur an (meist Kick oder Gesang) und mische die anderen dazu.

## Vertiefen

**EQ: erst absenken, dann anheben.** Die wichtigste Regel: Schaffe Platz, indem du wegnimmst, was stört, statt alles lauter zu machen.

| Bereich | Was dort liegt | typische Maßnahme |
| --- | --- | --- |
| unter 30–40 Hz | unhörbares Rumpeln | Hochpass auf fast allen Spuren außer Kick und Bass |
| 50–100 Hz | Fundament von Kick und Bass | entscheiden, wer hier führt |
| 200–500 Hz | „Mulm“, Pappe | oft etwas absenken |
| 1–3 kHz | Kern von Stimme und Instrumenten, Präsenz | vorsichtig anheben für Deutlichkeit |
| 5–10 kHz | Glanz, Luft, Zischlaute | anheben für Brillanz, bei Schärfe absenken |

**Kompression.** Ein Kompressor arbeitet ab einer Schwelle (**Threshold**): Was darüber liegt, wird im Verhältnis (**Ratio**, etwa 4:1) leiser gemacht. **Attack** bestimmt, wie schnell er zupackt (langsam lässt den Anschlag der Snare durch), **Release**, wie schnell er wieder loslässt. Mit dem **Make-up Gain** holt man die verlorene Lautstärke zurück.

**Sidechain.** Kick und Bass streiten sich um die Tiefen. Beim Sidechaining steuert die Kick einen Kompressor auf dem Bass (oder auf Pads): Bei jedem Kick-Schlag duckt sich der Bass kurz weg. Das schafft Platz und erzeugt im House das typische **Pumpen**. In FL Studio leitest du dazu im Mixer den Kick-Insert per Rechtsklick auf den Routing-Pfeil als Sidechain zum Bass-Insert und wählst im **Fruity Limiter** (Modus COMP) diesen Sidechain-Eingang. Einfacher geht es mit einem Volume-Shaper-Plugin, das die Lautstärke im Takt absenkt.

**Hall und Delay als Send.** Statt in jede Spur einen eigenen Hall zu setzen, legt man einen Hall auf einen eigenen Insert (**Send** oder **Bus**) und schickt von mehreren Spuren einen Anteil hinein. Das spart Rechenleistung und lässt alles im selben Raum klingen. Der Beat-Baukasten macht es genauso: Der Hall-Regler jeder Spur ist ein Send.

**Panorama.** Kick, Snare, Bass und Hauptstimme gehören in die Mitte. Hi-Hats, Percussion, Gitarren, Backing Vocals und doppelte Spuren verteilt man nach links und rechts. Prüfe den Mix zwischendurch in **Mono**: Klingt er dann noch gut, ist er auch auf Handys und in Clubs sicher.

**Ohren und Referenz.** Mische in mittlerer Lautstärke, mach Pausen, und vergleiche mit einem professionellen Song aus deinem Genre (**Referenztrack**), den du in dieselbe Session lädst.

## Hören

Ein **Beat im Stereobild**: Die Hi-Hat steht etwas links, der Shaker rechts, die Clap hat einen Hauch Hall. Hör über Kopfhörer.

```beat
titel: Beat mit Panorama und Hall
bpm: 120
kick: x... x... x... x...
clap: .... x... .... x...
hihat: ..x. ..x. ..x. ..x.
perc: .o.o .o.o .o.o .o.o
pan: hihat -0.4, perc 0.5
hall: clap 0.3
```

## Üben

```uebungen
eq-hoeren instrument-hoeren
```

## Schreiben

```aufgabe
titel: Ein Beat im Stereobild
text: Die Vorgabe ist ein House-Beat, der noch ganz in der Mitte steht. Misch ihn im Beat-Baukasten: Verteile mindestens zwei Spuren im Panorama (etwa Hi-Hat leicht links, Open Hat oder Shaker rechts; Kick und Clap bleiben in der Mitte) und gib der Clap etwas Hall. Hör über Kopfhörer, wie der Beat breiter wird.
beat: ja
bpm: 124
kick: x... x... x... x...
clap: .... x... .... x...
hihat: o.o. o.o. o.o. o.o.
openhat: ..x. ..x. ..x. ..x.
pruefung: spuren 4, panorama 2, hall clap, spur kick 1 5 9 13
```

## Freie Aufgabe

Mische deinen Track aus der Arrangement-Lektion in FL Studio: Erst alle Fader auf null und Pegel nach Gain-Staging einstellen, dann für jede Spur außer Kick und Bass einen Hochpass, dann Panorama, dann einen gemeinsamen Hall als Send. Setze ein Sidechain vom Kick auf den Bass. Exportiere vorher und nachher eine Version und vergleiche beide mit einem Referenztrack.

## Quiz

? Was ist das Ziel des Mixings?
+ Alle Spuren so zusammenbringen, dass jede gehört wird und das Ganze als Song klingt
- Den Song so laut wie möglich machen
- Die Melodie verändern
- Das Tempo anpassen

? Was bedeutet Gain-Staging?
+ Die Pegel aller Spuren so einstellen, dass nichts übersteuert und genug Headroom bleibt
- Den Hall auf allen Spuren gleich einstellen
- Das Tempo stufenweise erhöhen
- Spuren zu Gruppen zusammenfassen

? Wie viel Headroom sollte der Master vor dem Mastering etwa haben?
+ Etwa 6 dB
- 0 dB
- 30 dB
- Gar keinen

? Was ist die wichtigste EQ-Regel?
+ Erst störende Bereiche absenken, dann vorsichtig anheben
- Immer alle Höhen anheben
- Nie einen Hochpass verwenden
- Jede Spur auf 100 Hz anheben

? Wo liegt der „Mulm“, der einen Mix pappig macht?
+ Etwa bei 200 bis 500 Hz
- Unter 20 Hz
- Bei 8 kHz
- Über 15 kHz

? Was macht ein Kompressor?
+ Er macht laute Stellen leiser und den Pegel gleichmäßiger
- Er erzeugt Echos
- Er verschiebt eine Spur nach links
- Er verändert die Tonhöhe

? Was bewirkt Sidechaining vom Kick auf den Bass?
+ Der Bass duckt sich bei jedem Kick-Schlag kurz weg
- Der Bass wird bei jedem Kick lauter
- Kick und Bass werden gleich gestimmt
- Der Bass spielt nur noch auf dem Kick

? Warum legt man Hall gern auf einen Send statt auf jede Spur?
+ Alle Spuren klingen im selben Raum und es spart Rechenleistung
- Weil Hall auf Spuren verboten ist
- Damit der Hall nicht zu hören ist
- Weil Sends lauter sind

? Was gehört im Panorama normalerweise in die Mitte?
+ Kick, Snare, Bass und Hauptstimme
- Hi-Hats und Percussion
- Nur der Hall
- Gar nichts

? Wozu dient ein Referenztrack?
+ Zum Vergleich mit einer professionellen Produktion aus demselben Genre
- Als Hintergrundmusik beim Mischen
- Um Samples zu stehlen
- Um das Tempo festzulegen
