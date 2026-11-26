---
modul: s8-mastering
titel: Mastering und Export
dauer: 45 Minuten
---

## Erklären

**Mastering** ist der letzte Arbeitsschritt: Der fertige Mix wird als Ganzes bearbeitet, damit er auf allen Anlagen gut klingt, eine passende Lautheit hat und zu anderen Songs eines Albums oder einer Playlist passt. Im Mix bearbeitest du einzelne Spuren, im Mastering nur noch die Summe.

**Die typische Kette auf dem Master:**

1. **EQ**: kleine Korrekturen am Gesamtklang (etwas mehr Luft, etwas weniger Mulm), meist nur 1 bis 2 dB.
2. **Kompressor** (Bus-Kompressor): klebt den Mix sanft zusammen, Ratio 2:1, nur 1 bis 3 dB Pegelreduktion.
3. **Stereo-Bearbeitung**: vorsichtig, die Tiefen bleiben mono.
4. **Limiter**: am Ende der Kette, setzt eine harte Obergrenze und macht den Song lauter, ohne dass er übersteuert.

In FL Studio stehen dafür **Fruity Parametric EQ 2**, **Fruity Compressor**, **Maximus** (Mehrband-Kompressor und Limiter) und **Fruity Limiter** zur Verfügung.

**Lautheit in LUFS.** Wie laut ein Song empfunden wird, misst man in **LUFS** (Loudness Units relative to Full Scale). Streamingdienste gleichen alle Songs auf einen Zielwert an. Spotify und YouTube liegen bei etwa **−14 LUFS**. Ein lauter gemasterter Song wird dort einfach leiser abgespielt, verliert aber durch das starke Limiting seine Dynamik. Für Streaming ist ein Master um −14 bis −10 LUFS sinnvoll, Club-Musik wird oft lauter gemastert.

**True Peak.** Lass am Limiter mindestens **−1 dB** Luft (Ceiling −1 dBTP). Beim Umwandeln in MP3 oder AAC können sonst neue Übersteuerungen entstehen.

## Vertiefen

**Referenz und Kontrolle.** Lade einen professionellen Song deines Genres ins Projekt und vergleiche bei **gleicher Lautheit**. Lauter klingt immer erst einmal besser, deshalb täuscht ein Vergleich ohne Pegelausgleich. Hör den Master auf mehreren Systemen: Kopfhörer, Handylautsprecher, Auto, Bluetooth-Box. Ein kostenloses Lautheits-Messgerät wie der Youlean Loudness Meter zeigt dir LUFS und True Peak.

**Exportformate:**

| Format | Wofür |
| --- | --- |
| **WAV, 24 Bit, 44,1 oder 48 kHz** | Master zum Hochladen, Archiv, Weitergabe |
| **WAV, 16 Bit, 44,1 kHz** | CD; beim Reduzieren auf 16 Bit **Dithering** einschalten |
| **MP3, 320 kbit/s** | zum Verschicken und Probehören |
| **Stems** | Einzelspuren oder Gruppen (Drums, Bass, Akkorde, Gesang) für Remixe oder ein externes Mastering |
| **MIDI** | Noten ohne Klang, zum Weiterbearbeiten in einer anderen DAW |

In FL Studio exportierst du über **Datei > Exportieren** (WAV mit Strg+R). Für Stems setzt du im Exportfenster das Häkchen bei „Mixer-Spuren aufteilen“ (Split mixer tracks).

**Vor dem Export prüfen:**

- Beginnt der Song ohne Stille und endet er mit vollständig ausgeklungenem Hall?
- Übersteuert nichts (Master unter 0 dB, True Peak unter −1 dB)?
- Ist der Song in Mono noch gut?
- Stimmen Titel und Dateiname (Künstler – Titel – Master v1)?

**Eigenes Mastering oder extern?** Für Demos und erste Veröffentlichungen reicht ein eigenes, zurückhaltendes Mastering. Für wichtige Veröffentlichungen lohnt sich ein Mastering-Engineer: frische Ohren in einem guten Raum hören Dinge, die du nach Wochen am Song nicht mehr bemerkst.

## Hören

Ein fertig gemischter Loop als Ausgangspunkt fürs Mastering: alle Elemente stehen, nichts übersteuert. Öffne ihn im Beat-Baukasten und hör auf Balance und Breite.

```beat
titel: Mix vor dem Mastering
bpm: 122
kick: x... x... x... x...
clap: .... x... .... x...
hihat: o.o. o.o. o.o. o.o.
openhat: ..x. ..x. ..x. ..x.
perc: .-.- .-.- .-.- .-.-
pan: hihat -0.3, perc 0.4
hall: clap 0.2, openhat 0.15
```

## Üben

```uebungen
eq-hoeren tempo-schaetzen
```

## Schreiben

```aufgabe
titel: Ein fertiger Loop zum Exportieren
text: Bau einen Loop, der bereit für den Export ist: mindestens fünf Spuren, die Hi-Hat mit unterschiedlichen Anschlagstärken, mindestens zwei Spuren im Panorama verteilt und Hall auf der Clap. Exportiere ihn danach als MIDI, lade ihn in FL Studio, setze einen Limiter auf den Master und exportiere eine WAV-Datei.
beat: ja
bpm: 122
pruefung: spuren 5, dynamik hihat, panorama 2, hall clap
```

## Freie Aufgabe

Master deinen Track aus der Mixing-Lektion: EQ, sanfter Kompressor und Limiter mit −1 dB Ceiling auf dem Master. Miss die Lautheit und ziele auf etwa −14 bis −10 LUFS. Exportiere eine WAV in 24 Bit, eine MP3 mit 320 kbit/s und die Stems (Drums, Bass, Akkorde, Melodie). Hör dir den Master auf drei verschiedenen Geräten an und notiere, was dir auffällt.

## Quiz

? Was ist Mastering?
+ Der letzte Arbeitsschritt, bei dem der fertige Mix als Ganzes bearbeitet wird
- Das Aufnehmen der ersten Spur
- Das Programmieren der Drums
- Das Schreiben der Melodie

? Was steht in der Mastering-Kette meistens ganz am Ende?
+ Der Limiter
- Der Hall
- Ein Synthesizer
- Ein Hochpass auf 1 kHz

? Was misst LUFS?
+ Die empfundene Lautheit eines Songs
- Das Tempo
- Die Tonart
- Die Anzahl der Spuren

? Auf welchen Wert gleichen Spotify und YouTube die Lautheit etwa an?
+ Etwa −14 LUFS
- 0 LUFS
- −40 LUFS
- +6 LUFS

? Warum lässt man am Limiter etwa −1 dB True Peak frei?
+ Damit bei der Umwandlung in MP3 oder AAC keine neuen Übersteuerungen entstehen
- Damit der Song leiser klingt
- Weil Streamingdienste sonst das Tempo ändern
- Damit der Hall besser klingt

? Was passiert mit einem sehr laut gemasterten Song auf Spotify?
+ Er wird leiser abgespielt und hat durch das starke Limiting weniger Dynamik
- Er wird noch lauter abgespielt
- Er wird abgelehnt
- Er klingt automatisch besser

? Wann braucht man Dithering?
+ Beim Reduzieren der Bittiefe, zum Beispiel von 24 auf 16 Bit
- Beim Export als MIDI
- Beim Hinzufügen von Hall
- Beim Ändern des Tempos

? Was sind Stems?
+ Einzelspuren oder Gruppen wie Drums, Bass und Gesang als eigene Audiodateien
- Die Noten eines Songs
- Die Effekte auf dem Master
- Ein Format für Videos

? Warum vergleicht man bei gleicher Lautheit mit einem Referenztrack?
+ Weil lauter immer besser wirkt und der Vergleich sonst täuscht
- Weil die DAW es verlangt
- Damit der Referenztrack leiser ist
- Weil man sonst das Tempo nicht hört

? Welches Format eignet sich als Master zum Hochladen?
+ WAV mit 24 Bit
- MIDI
- MP3 mit 96 kbit/s
- Ein Screenshot der Playlist
