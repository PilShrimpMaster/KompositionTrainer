import { useEffect, useMemo, useRef, useState } from 'react';
import { initAudio, play } from './audio/player';
import { BEISPIELE } from './data/melodien';
import { germanKeyName } from './model/pitch';
import type { Score } from './model/types';
import { validateScore } from './model/validate';
import { ScoreView } from './ScoreView';

type AudioState = 'aus' | 'lädt' | 'bereit' | 'fehler';

export function App() {
  const [beispielId, setBeispielId] = useState(BEISPIELE[0].id);
  const [score, setScore] = useState<Score>(BEISPIELE[0].score);
  const [tempo, setTempo] = useState(BEISPIELE[0].score.tempo);
  const [showNames, setShowNames] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audio, setAudio] = useState<AudioState>('aus');
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState(() => JSON.stringify(BEISPIELE[0].score, null, 2));
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const stopRef = useRef<(() => void) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const info = useMemo(
    () => `${germanKeyName(score.key)} · ${score.time.beats}/${score.time.beatType}-Takt`,
    [score],
  );

  useEffect(() => () => stopRef.current?.(), []);

  function loadScore(s: Score, id = 'eigene') {
    stopRef.current?.();
    setBeispielId(id);
    setScore(s);
    setTempo(s.tempo);
    setJsonText(JSON.stringify(s, null, 2));
    setJsonErrors([]);
  }

  async function handlePlay() {
    if (playing) {
      stopRef.current?.();
      return;
    }
    try {
      if (audio !== 'bereit') setAudio('lädt');
      await initAudio();
      setAudio('bereit');
      setPlaying(true);
      stopRef.current = await play(score, tempo, {
        onEvent: setActiveId,
        onEnd: () => {
          setPlaying(false);
          setActiveId(null);
          stopRef.current = null;
        },
      });
    } catch (e) {
      console.error(e);
      setAudio('fehler');
      setPlaying(false);
    }
  }

  function applyJson(text: string) {
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch (e) {
      setJsonErrors([`Kein gültiges JSON: ${e instanceof Error ? e.message : e}`]);
      return;
    }
    const result = validateScore(data);
    if (result.score) loadScore(result.score);
    else setJsonErrors(result.errors);
  }

  async function handleFile(file: File) {
    const text = await file.text();
    setJsonText(text);
    setJsonOpen(true);
    applyJson(text);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>KompositionsTrainer</h1>
        <span className="badge">M0 · Fundament</span>
      </header>

      <main>
        <section className="controls" aria-label="Steuerung">
          <label className="field">
            <span>Melodie</span>
            <select
              value={beispielId}
              onChange={(e) => {
                const b = BEISPIELE.find((x) => x.id === e.target.value);
                if (b) loadScore(b.score, b.id);
              }}
            >
              {BEISPIELE.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.score.title}
                </option>
              ))}
              {beispielId === 'eigene' && <option value="eigene">Eigene: {score.title}</option>}
            </select>
          </label>

          <button className={`play ${playing ? 'is-on' : ''}`} onClick={handlePlay} disabled={audio === 'lädt'}>
            {audio === 'lädt' ? 'Klavier lädt …' : playing ? '■ Stopp' : '▶ Abspielen'}
          </button>

          <label className="field tempo">
            <span>Tempo: {tempo} ♩/min</span>
            <input
              type="range"
              min={40}
              max={200}
              value={tempo}
              disabled={playing}
              onChange={(e) => setTempo(Number(e.target.value))}
            />
          </label>

          <label className="check">
            <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} />
            <span>Notennamen</span>
          </label>
        </section>

        {audio === 'fehler' && (
          <p className="error">
            Der Klang konnte nicht gestartet werden. Prüfe die Lautstärke und tippe erneut auf „Abspielen“.
          </p>
        )}

        <section className="sheet" aria-label="Noten">
          <div className="sheet-head">
            <h2>{score.title}</h2>
            {score.composer && <p className="composer">{score.composer}</p>}
            <p className="meta">{info}</p>
          </div>
          <ScoreView score={score} showNoteNames={showNames} activeId={activeId} />
        </section>

        <section className="json">
          <button className="link" onClick={() => setJsonOpen((o) => !o)} aria-expanded={jsonOpen}>
            {jsonOpen ? '▾' : '▸'} Noten als JSON bearbeiten
          </button>
          {jsonOpen && (
            <div className="json-body">
              <textarea
                value={jsonText}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                onChange={(e) => setJsonText(e.target.value)}
                aria-label="JSON der Noten"
              />
              <div className="json-actions">
                <button onClick={() => applyJson(jsonText)}>Übernehmen</button>
                <button className="secondary" onClick={() => fileRef.current?.click()}>
                  JSON-Datei öffnen …
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                  }}
                />
              </div>
              {jsonErrors.length > 0 && (
                <ul className="error-list">
                  {jsonErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>

      <footer>
        Klavierklang: Salamander Grand Piano von Alexander Holm (CC BY 3.0). Version {__APP_VERSION__}
      </footer>
    </div>
  );
}
