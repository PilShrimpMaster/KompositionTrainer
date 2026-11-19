import { useEffect, useRef, useState } from 'react';
import { initAudio, play, playChord, playSequence } from '../audio/player';
import { toToneName } from '../model/pitch';
import type { Clef, KeySignature, Pitch, Score } from '../model/types';
import { ScoreView } from '../ScoreView';
import { renderNotes } from './renderNotes';

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
export function NotenBeispiel({ score }: { score: Score }) {
  const [aktiv, setAktiv] = useState<string | null>(null);
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
      <ScoreView score={score} showNoteNames={false} activeId={aktiv} />
      <button onClick={umschalten}>{laeuft ? '■ Stopp' : '▶ Anhören'}</button>
    </div>
  );
}
