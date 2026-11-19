# Das Notenmodell

Alle Teile der App arbeiten auf demselben JSON-Format: die Notenanzeige, die Wiedergabe und ab M2 die Prüf-Engine. Die Typen stehen in [`src/model/types.ts`](../src/model/types.ts), die Prüfung in [`src/model/validate.ts`](../src/model/validate.ts).

## Beispiel

```json
{
  "format": "kt-score",
  "version": 1,
  "title": "Kleine Melodie",
  "tempo": 96,
  "time": { "beats": 3, "beatType": 4 },
  "key": { "fifths": -1, "mode": "major" },
  "voices": [
    {
      "id": "v1",
      "name": "Melodie",
      "clef": "treble",
      "measures": [
        {
          "notes": [
            { "pitch": { "step": "F", "octave": 4 }, "duration": { "type": "quarter" } },
            { "pitch": { "step": "A", "octave": 4 }, "duration": { "type": "quarter" } },
            { "pitch": { "step": "C", "octave": 5 }, "duration": { "type": "quarter" } }
          ]
        },
        {
          "notes": [
            { "pitch": { "step": "B", "alter": -1, "octave": 4 }, "duration": { "type": "half", "dots": 1 } }
          ]
        }
      ]
    }
  ]
}
```

## Felder

| Feld | Bedeutung |
| --- | --- |
| `format`, `version` | immer `"kt-score"` und `1` |
| `tempo` | Viertelnoten pro Minute |
| `time` | Taktart, z. B. `{ "beats": 6, "beatType": 8 }` |
| `key.fifths` | Vorzeichen: `2` = zwei Kreuze (D-Dur/h-Moll), `-3` = drei Bs (Es-Dur/c-Moll) |
| `key.mode` | `"major"` (Dur) oder `"minor"` (Moll) |
| `voices[].clef` | `"treble"` (Violinschlüssel) oder `"bass"` (Bassschlüssel) |
| `pitch.step` | Stammton `C D E F G A B` |
| `pitch.alter` | `1` = Kreuz, `-1` = b, `2`/`-2` = doppelt |
| `pitch.octave` | `4` = eingestrichene Oktave (c′ = mittleres C) |
| `duration.type` | `whole`, `half`, `quarter`, `eighth`, `16th` |
| `duration.dots` | Punktierungen, 0 bis 2 |
| `tie` | `true` = Haltebogen zur nächsten Note |
| `velocity` | Anschlagstärke 1–127, z. B. vom MIDI-Keyboard (optional) |
| `lyric` | Silbe des Liedtexts unter der Note (optional) |
| `fermata` | `true` = Fermate über der Note (optional) |
| `voices[].staff` | Nummer des Notensystems; Stimmen mit gleicher Nummer teilen sich ein System (optional) |
| `voices[].stem` | `"up"` oder `"down"`: Halsrichtung auf einem geteilten System (optional) |

Eine Note ohne `pitch` ist eine Pause. Der erste Takt darf kürzer sein (Auftakt); dann darf auch der letzte Takt kürzer sein. Alle anderen müssen genau voll sein.

## Vierstimmiger Satz

Ein Chorsatz hat vier Stimmen in der Reihenfolge Sopran, Alt, Tenor, Bass. Sopran und Alt stehen mit `"staff": 0` gemeinsam im Violinschlüssel, Tenor und Bass mit `"staff": 1` im Bassschlüssel. Die Prüf-Engine ([`src/satz/regeln.ts`](../src/satz/regeln.ts)) erwartet die Stimmen von oben nach unten.

## Warum „B“ für H?

Intern speichert das Modell Tonhöhen wie MusicXML, also international: `"step": "B"` ist das deutsche **H**, `"step": "B", "alter": -1` das deutsche **B**. So bleiben der spätere MusicXML-Import und -Export (M4) verlustfrei. Die Oberfläche zeigt immer deutsche Namen.

Die Tonhöhe wird außerdem immer klingend angegeben, also mit dem Vorzeichen, auch wenn es schon in der Tonart steht. Fis in G-Dur ist `{ "step": "F", "alter": 1 }`; die Anzeige lässt das Kreuz dann automatisch weg.
