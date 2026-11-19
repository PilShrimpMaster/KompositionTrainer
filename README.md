# KompositionsTrainer

Eine Web-App (PWA), mit der man auf dem iPad und am Desktop das Komponieren klassischer Musik von Grund auf lernt: von Noten und Intervallen über den vierstimmigen Satz und Kontrapunkt bis zu Formenlehre, Instrumentation und eigenen Werken.

**App öffnen:** https://pilshrimpmaster.github.io/kompositiontrainer/

## Stand: M0 Fundament

- Eigenes JSON-Notenmodell ([Beschreibung](docs/notenmodell.md))
- Notenanzeige mit [VexFlow](https://www.vexflow.com), deutsche Notennamen (H, B, Fis, Es …)
- Wiedergabe mit [Tone.js](https://tonejs.github.io) und Klaviersamples (Salamander Grand Piano), die gerade klingende Note wird markiert
- Beispielmelodien, JSON-Editor und Import einer JSON-Datei
- Offline-fähig und auf dem Home-Bildschirm installierbar
- Automatisches Prüfen und Veröffentlichen über GitHub Actions und GitHub Pages

Der vollständige Plan mit allen Meilensteinen (M0 bis M6) steht in den [GitHub-Milestones](../../milestones).

## Auf dem iPad testen

1. In Safari https://pilshrimpmaster.github.io/kompositiontrainer/ öffnen.
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
