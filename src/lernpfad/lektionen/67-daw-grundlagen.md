---
modul: s8-daw
titel: DAW-Grundlagen: So arbeitet FL Studio
dauer: 60 Minuten
---

## Erklären

Eine **DAW** (Digital Audio Workstation) ist das Tonstudio im Computer: Sequencer, Instrumente, Effekte, Mischpult und Aufnahme in einem Programm. Bekannte DAWs sind **FL Studio**, Ableton Live, Logic Pro, Cubase, Reaper und GarageBand. Alles, was du bisher in Noten geschrieben hast, kannst du dort hörbar machen, mit Sounds veredeln und als fertigen Song exportieren.

FL Studio ist um **Patterns** herum gebaut. Ein Pattern ist ein kurzer Baustein, etwa ein Drumbeat von einem Takt oder eine Akkordfolge von vier Takten. Patterns baust du einzeln und setzt sie dann in der Playlist zu einem Song zusammen. Die fünf wichtigsten Fenster:

| Fenster | Taste | Wofür |
| --- | --- | --- |
| **Channel Rack** | F6 | Alle Instrumente und Samples des Projekts, je ein Kanal pro Zeile. Mit dem Step-Sequencer programmierst du hier Drums in 16 Schritten. |
| **Piano Roll** | F7 | Noten eines Kanals bearbeiten: Tonhöhe, Länge, Lautstärke (Velocity). Hier entstehen Melodien, Akkorde und Basslines. |
| **Playlist** | F5 | Die Zeitleiste des Songs. Hier ordnest du Patterns, Audio-Clips und Automationen an. |
| **Mixer** | F9 | Jeder Kanal läuft auf einen Mixer-Insert mit Lautstärke, Panorama und bis zu zehn Effekten. Alles endet im Master. |
| **Browser** | Alt+F8 | Sounds, Samples, Plugins und Projektdateien. Von hier ziehst du Klänge ins Channel Rack. |

Oben in der Transportleiste schaltest du zwischen **PAT** (nur das aktuelle Pattern spielt in Schleife) und **SONG** (die Playlist spielt von vorn) um. Die Leertaste startet und stoppt, daneben stellst du das **Tempo in BPM** ein (Beats per Minute, also Viertel pro Minute).

In diesem Trainer gibt es dafür den Bereich **Produzieren**: Der **Beat-Baukasten** funktioniert wie das Channel Rack, das **Synth-Labor** zeigt, wie ein Synthesizer arbeitet, und im Editor kannst du jedes Stück **als MIDI speichern** und in FL Studio weiterbearbeiten.

## Vertiefen

**Dein erstes Projekt in sieben Schritten:**

1. **Datei > Neu aus Vorlage**, zum Beispiel „Basic“. Tempo einstellen.
2. Im **Browser** unter „Packs“ eine Kick, eine Clap und eine Hi-Hat ins **Channel Rack** ziehen.
3. Im Channel Rack einen Beat programmieren: Kick auf jedem Viertel (Schritt 1, 5, 9, 13), Clap auf 2 und 4 (Schritt 5 und 13).
4. Einen Synthesizer hinzufügen (zum Beispiel **FLEX** oder **3x Osc**) und in der **Piano Roll** eine Akkordfolge schreiben. Für jedes neue Element ein **neues Pattern** anlegen.
5. In der **Playlist** die Patterns nebeneinander und übereinander malen: erst nur Drums, dann Drums und Akkorde.
6. Jeden Kanal einem eigenen **Mixer-Insert** zuweisen (Kanal wählen, Insert wählen, Strg+L) und die Lautstärken grob ausgleichen.
7. **Exportieren**: Datei > Exportieren > WAV (Strg+R).

**MIDI und Audio.** In der Piano Roll stehen keine Klänge, sondern **MIDI-Daten**: welche Taste, wann, wie lang und wie stark. Erst das Instrument macht daraus Klang. Deshalb kannst du denselben Akkord-Loop mit einem Klavier, einem Pad oder einem Bass hören. **Audio** dagegen ist aufgenommener Klang: eine Gesangsspur, ein Sample, ein gerenderter Loop.

**Speichern.** Projekte sind `.flp`-Dateien. Speichere oft und unter neuen Namen (Song_v1, Song_v2). Mit „Datei > Speichern als neue Version“ (Strg+N) geht das schnell. In der kostenlosen Testversion von FL Studio kannst du Projekte speichern, aber erst nach dem Kauf wieder öffnen. Für den Anfang reicht es, jede Sitzung als WAV zu exportieren.

## Hören

Ein Pattern im Channel Rack: Kick auf jedem Viertel, Clap auf 2 und 4, Hi-Hat auf den Achteln dazwischen. Das ist der Grundbaustein fast aller Dance-Produktionen.

```beat
titel: Pattern im Channel Rack
bpm: 122
kick: x... x... x... x...
clap: .... x... .... x...
hihat: ..x. ..x. ..x. ..x.
```

Derselbe Akkord-Loop klingt mit jedem Instrument anders, weil MIDI nur die Noten speichert. Hier mit einem Pad und dann mit einem Pluck.

```synth
titel: MIDI mit einem Pad
vorlage: Pad
noten: C4 E4 G4 B4
```

```synth
titel: Dieselben Noten mit einem Pluck
vorlage: Pluck
noten: C4 E4 G4 B4 C5 B4 G4 E4
```

## Üben

```uebungen
tempo-schaetzen groove-erkennen
```

## Schreiben

```aufgabe
titel: Dein erstes Pattern
text: Bau im Beat-Baukasten dein erstes Pattern wie im Channel Rack: Kick auf jedem Viertel (Schritt 1, 5, 9 und 13), Clap auf Zählzeit 2 und 4 (Schritt 5 und 13) und mindestens vier Hi-Hats. Stell das Tempo auf 118 bis 128 BPM. Exportiere den Beat danach als MIDI und bau ihn in FL Studio nach.
beat: ja
bpm: 100
pruefung: spur kick 1 5 9 13, spur clap 5 13, mindestens hihat 4, bpm 118 128
```

```aufgabe
titel: Eine Akkordfolge für die Piano Roll
text: Die Melodie ist vorgegeben. Setz über jeden Takt ein Akkordsymbol, so dass die Folge C – G – Am – F entsteht, die meistgespielte Akkordfolge der Popmusik. Speichere das Stück danach mit „Als MIDI speichern“ und zieh die Datei in FL Studio in die Playlist: Melodie und Akkorde landen auf eigenen Spuren.
tonart: 0
leadsheet: E5:2 G5:2 | D5:2 B4:2 | C5:2 E5:2 | C5:2 A4:2
pruefung: akkordsymbole 4, leadsheet-fehlerfrei
```

## Freie Aufgabe

Installiere FL Studio (die Testversion genügt) oder öffne die DAW, die du hast. Leg ein Projekt mit 120 BPM an, bau den Beat aus der ersten Aufgabe im Channel Rack nach, füge einen Synthesizer mit der Akkordfolge C – G – Am – F hinzu und arrangiere in der Playlist 16 Takte: vier Takte nur Drums, dann alles zusammen. Exportiere das Ergebnis als WAV und hör es auf Kopfhörern und auf einem Handy-Lautsprecher.

## Quiz

? Was ist eine DAW?
+ Ein Programm, das Sequencer, Instrumente, Effekte, Mischpult und Aufnahme vereint
- Ein spezielles MIDI-Keyboard
- Ein Dateiformat für Audio
- Ein Lautsprecher für Tonstudios

? Wofür ist das Channel Rack in FL Studio da?
+ Es enthält alle Instrumente und Samples; mit dem Step-Sequencer programmiert man dort Drums
- Es mischt die fertigen Spuren
- Es zeigt die Zeitleiste des ganzen Songs
- Es exportiert den Song als MP3

? Wo bearbeitest du in FL Studio Melodien und Akkorde Note für Note?
+ In der Piano Roll
- Im Mixer
- Im Browser
- In der Transportleiste

? Was macht die Playlist?
+ Sie ordnet Patterns, Audio-Clips und Automationen auf der Zeitleiste zum Song an
- Sie listet alle installierten Plugins auf
- Sie spielt fertige Songs aus dem Internet ab
- Sie speichert die Tonart

? Was ist ein Pattern in FL Studio?
+ Ein kurzer Baustein aus Noten oder Steps, der in der Playlist mehrfach verwendet wird
- Eine fertige Audiodatei
- Ein Effekt im Mixer
- Eine Vorlage für das Tempo

? Was bedeutet BPM?
+ Beats per Minute: Schläge (Viertel) pro Minute, also das Tempo
- Bass pro Minute
- Die Lautstärke des Masters
- Die Anzahl der Spuren

? Was speichert MIDI?
+ Welche Taste wann, wie lang und wie stark gespielt wird, aber keinen Klang
- Den fertigen Klang als Welle
- Nur die Lautstärke
- Die Effekte eines Kanals

? Was passiert im Modus PAT?
+ Nur das aktuelle Pattern spielt in Schleife
- Die ganze Playlist spielt von vorn
- Das Projekt wird gespeichert
- Der Mixer wird stumm geschaltet

? Wohin läuft jeder Kanal, bevor er im Master ankommt?
+ Auf einen Mixer-Insert mit Lautstärke, Panorama und Effekten
- Direkt in den Browser
- In die Piano Roll
- In eine MIDI-Datei

? Wie viele Schritte hat ein Takt im Step-Sequencer normalerweise?
+ 16, also Sechzehntel eines 4/4-Takts
- 4
- 8
- 12
