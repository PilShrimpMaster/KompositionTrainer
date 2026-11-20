import { useEffect, useMemo, useRef, useState } from 'react';
import { initAudio, play, playChord, playSequence } from '../audio/player';
import { toToneName } from '../model/pitch';
import type { Clef, KeySignature, Pitch, Score } from '../model/types';
import { ScoreView } from '../ScoreView';
import { analysiere, funktionMitBass } from '../satz/analyse';
import { renderNotes } from './renderNotes';
import { motivMarkierungen, MotivPanel, useMotive } from '../kontrapunkt/MotivPanel';
import { FormPanel } from '../satz/FormPanel';
import { HarmoniePanel } from '../satz/HarmoniePanel';

interface AkkordProps {
  gruppen: Pitch[][];
  klang: 'nacheinander' | 'zusammen';
  schluessel: Clef;
  tonart?: KeySignature;
}

/** Einzeltöne, Intervalle oder Akkorde als ganze Noten, mit Knopf zum Anhören */
export function AkkordBeispiel({ gruppen, klang, schluessel, tonart }: AkkordProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const groups = klang === 'zusammen' ? gruppen : gruppen.flat().map((p) => [p]);
    renderNotes(ref.current, { clef: schluessel, key: tonart, groups, width: Math.min(640, 120 + groups.length * 60) });
  }, [gruppen, klang, schluessel, tonart]);

  async function anhoeren() {
    await initAudio();
    if (klang === 'zusammen') gruppen.forEach((g, i) => setTimeout(() => playChord(g.map(toToneName), 1.2), i * 1400));
    else playSequence(gruppen.flat().map(toToneName), 0.5);
  }

  return (
    <div className="beispiel">
      <div ref={ref} className="uebung-noten" />
      <button onClick={anhoeren}>▶ Anhören</button>
    </div>
  );
}

/** Ein kleines Notenbeispiel mit Takten, zum Mitlesen beim Abspielen */
export function NotenBeispiel({
  score,
  analyse = false,
  motive = false,
  form = false,
  harmonien = false,
}: {
  score: Score;
  analyse?: boolean;
  motive?: boolean;
  form?: boolean;
  harmonien?: boolean;
}) {
  const [aktiv, setAktiv] = useState<string | null>(null);
  const [zeige, setZeige] = useState<'form' | 'harmonien' | null>(null);
  const [motiveAn, setMotiveAn] = useState(false);
  const mot = useMotive(score);
  const markierungen = useMemo(() => (motiveAn ? motivMarkierungen(mot.funde, mot.auswahl) : undefined), [motiveAn, mot.funde, mot.auswahl]);
  const [laeuft, setLaeuft] = useState(false);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => stopRef.current?.(), []);

  async function umschalten() {
    if (laeuft) {
      stopRef.current?.();
      return;
    }
    await initAudio();
    setLaeuft(true);
    stopRef.current = await play(score, score.tempo, {
      onEvent: setAktiv,
      onEnd: () => {
        setLaeuft(false);
        setAktiv(null);
        stopRef.current = null;
      },
    });
  }

  return (
    <div className="beispiel beispiel-noten">
      {score.title && <p className="beispiel-titel">{score.title}</p>}
      <ScoreView score={score} showNoteNames={false} activeId={aktiv} markierungen={markierungen} />
      {analyse && <AkkordAnalyse score={score} />}
      <div className="beispiel-knoepfe">
        <button onClick={umschalten}>{laeuft ? '■ Stopp' : '▶ Anhören'}</button>
        {motive && (
          <button className="secondary" onClick={() => setMotiveAn(!motiveAn)} aria-pressed={motiveAn}>
            {motiveAn ? 'Motive ausblenden' : 'Motive zeigen'}
          </button>
        )}
        {harmonien && (
          <button className="secondary" onClick={() => setZeige(zeige === 'harmonien' ? null : 'harmonien')} aria-pressed={zeige === 'harmonien'}>
            {zeige === 'harmonien' ? 'Harmonien ausblenden' : 'Harmonien zeigen'}
          </button>
        )}
        {form && (
          <button className="secondary" onClick={() => setZeige(zeige === 'form' ? null : 'form')} aria-pressed={zeige === 'form'}>
            {zeige === 'form' ? 'Form ausblenden' : 'Form zeigen'}
          </button>
        )}
      </div>
      {zeige === 'harmonien' && <HarmoniePanel score={score} />}
      {zeige === 'form' && <FormPanel score={score} />}
      {motive && motiveAn && (
        <MotivPanel motiv={mot.motiv} funde={mot.funde} laenge={mot.laenge} onLaenge={mot.setLaenge} auswahl={mot.auswahl} onAuswahl={mot.setAuswahl} />
      )}
    </div>
  );
}

/** Die erkannten Akkorde eines Satzes, Takt für Takt, mit Funktion */
export function AkkordAnalyse({ score }: { score: Score }) {
  const [offen, setOffen] = useState(false);
  const stellen = analysiere(score);
  const takte = new Map<number, typeof stellen>();
  for (const s of stellen) takte.set(s.takt, [...(takte.get(s.takt) ?? []), s]);
  return (
    <div className="akkord-analyse">
      <button className="secondary small" onClick={() => setOffen(!offen)}>
        {offen ? 'Analyse ausblenden' : 'Analyse zeigen'}
      </button>
      {offen && (
        <ol>
          {[...takte].map(([takt, st]) => (
            <li key={takt}>
              <span className="meta">Takt {takt + 1}:</span>{' '}
              {st.map((s, i) => (
                <span key={i} className="akkord-analyse-akkord" title={s.akkord.name}>
                  {s.akkord.name} <strong>{funktionMitBass(s.akkord)}</strong>
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
