import { useEffect, useMemo, useRef, useState } from 'react';
import { initAudio, play } from './audio/player';
import { BEISPIELE } from './data/melodien';
import { germanKeyName } from './model/pitch';
import type { Score } from './model/types';
import { validateScore } from './model/validate';
import { ScoreView } from './ScoreView';
import { markierungenFuer, PruefPanel, usePruefung } from './satz/PruefPanel';
import { ladeDatei, NOTENDATEIEN, speichereMusicXml } from './musicxml/datei';

type AudioState = 'aus' | 'lädt' | 'bereit' | 'fehler';

export function PlayerView() {
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
  const [geprueft, setGeprueft] = useState(false);
  const [auswahl, setAuswahl] = useState<number | null>(null);
  const pruefung = usePruefung(score);
  const markierungen = useMemo(
    () => (geprueft ? markierungenFuer(pruefung.befunde, auswahl) : undefined),
    [geprueft, pruefung.befunde, auswahl],
  );
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
    setGeprueft(false);
    setAuswahl(null);
    if (id !== 'eigene') setDateiHinweis(null);
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

  const [dateiHinweis, setDateiHinweis] = useState<{ fehler?: string; hinweise: string[] } | null>(null);

  async function handleFile(file: File) {
    const r = await ladeDatei(file);
    setDateiHinweis({ fehler: r.fehler, hinweise: r.hinweise });
    if (r.score) loadScore(r.score);
  }

  return (
    <>
      <div className="player">
        <section className="controls" aria-label="Steuerung">
          <label className="field">
            <span>Stück</span>
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

        <div className="json-actions file-actions">
          <button className="secondary" onClick={() => fileRef.current?.click()}>
            Datei öffnen (MusicXML aus MuseScore, JSON) …
          </button>
          <button className="secondary" onClick={() => speichereMusicXml(score)} title="MusicXML öffnet sich direkt in MuseScore Studio 4">
            Für MuseScore speichern
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={NOTENDATEIEN}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
        </div>
        {dateiHinweis && (dateiHinweis.fehler || dateiHinweis.hinweise.length > 0) && (
          <div className={dateiHinweis.fehler ? 'error' : 'notice'} role="status" onClick={() => setDateiHinweis(null)}>
            {dateiHinweis.fehler ?? (
              <>
                Übernommen, mit kleinen Einschränkungen:
                <ul>
                  {dateiHinweis.hinweise.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <section className="sheet" aria-label="Noten">
          <div className="sheet-head">
            <h2>{score.title}</h2>
            {score.composer && <p className="composer">{score.composer}</p>}
            <p className="meta">{info}</p>
          </div>
          <ScoreView score={score} showNoteNames={showNames} activeId={activeId} markierungen={markierungen} />
        </section>

        {score.voices.length > 1 && (
          <section className="pruefung">
            {!geprueft ? (
              <button onClick={() => setGeprueft(true)}>Satz prüfen</button>
            ) : (
              <PruefPanel
                befunde={pruefung.befunde}
                score={score}
                auswahl={auswahl}
                onAuswahl={setAuswahl}
                hinweise={pruefung.hinweise}
                onHinweise={(v) => {
                  setAuswahl(null);
                  pruefung.setHinweise(v);
                }}
              />
            )}
          </section>
        )}

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
      </div>

    </>
  );
}
