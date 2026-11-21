import { useEffect, useRef, useState } from 'react';
import { play } from '../audio/player';
import type { EditorDoc } from '../editor/rebar';
import { scoreAusDoc } from '../editor/satzdoc';
import { speichereMusicXml } from '../musicxml/datei';
import { satzVerschieben, werkSaetze, type Stueck, type Werk } from './backup';
import { alleWerke, werkAendern, werkAnlegen, werkLoeschen } from './db';

interface Props {
  /** Alle Stücke; Sätze wählt man aus dem Portfolio */
  stuecke: Stueck[];
  onOpen: (id: string, doc: EditorDoc) => void;
}

const exportieren = (s: Stueck, nr: number, werk: Werk) => {
  const score = scoreAusDoc(s.doc);
  speichereMusicXml({ ...score, title: `${werk.titel} – ${nr}. ${s.titel}` });
};

/** Werke: Portfolio-Stücke als Sätze bündeln, nacheinander anhören und satzweise exportieren */
export function WerkePanel({ stuecke, onOpen }: Props) {
  const [werke, setWerke] = useState<Werk[]>([]);
  const [neuTitel, setNeuTitel] = useState('');
  const [auswahl, setAuswahl] = useState<Record<string, string>>({});
  const [spielt, setSpielt] = useState<{ werk: string; satz: number } | null>(null);
  const [loeschen, setLoeschen] = useState<string | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const abbruch = useRef(false);

  const laden = () => alleWerke().then(setWerke).catch(() => setWerke([]));
  useEffect(() => {
    laden();
    return () => {
      abbruch.current = true;
      stopRef.current?.();
    };
  }, []);

  const portfolio = stuecke.filter((s) => s.portfolio);

  async function aendern(w: Werk, saetze: string[]) {
    await werkAendern(w.id, { saetze });
    await laden();
  }

  function stoppen() {
    abbruch.current = true;
    stopRef.current?.();
    stopRef.current = null;
    setSpielt(null);
  }

  /** Spielt die Sätze ab Satz i nacheinander, mit kurzer Pause dazwischen */
  async function abspielen(w: Werk, saetze: Stueck[], i: number) {
    if (i >= saetze.length || abbruch.current) {
      setSpielt(null);
      return;
    }
    setSpielt({ werk: w.id, satz: i });
    const doc = saetze[i].doc;
    try {
      stopRef.current = await play(scoreAusDoc(doc), doc.tempo || 90, {
        onEvent: () => {},
        onEnd: () => {
          stopRef.current = null;
          if (!abbruch.current) setTimeout(() => abspielen(w, saetze, i + 1), 1500);
        },
      });
    } catch {
      setSpielt(null);
    }
  }

  return (
    <div className="werke">
      <h4>Werke</h4>
      <p className="meta">Bündle Stücke aus deinem Portfolio zu einem mehrsätzigen Werk, etwa einer Sonatine oder Suite. Du hörst die Sätze nacheinander und exportierst jeden Satz nach MuseScore.</p>
      <div className="fassung-neu">
        <input type="text" value={neuTitel} placeholder="Titel, z. B. „Sonatine in C-Dur“" onChange={(e) => setNeuTitel(e.target.value)} aria-label="Titel des Werks" />
        <button
          className="secondary"
          onClick={async () => {
            await werkAnlegen(neuTitel);
            setNeuTitel('');
            await laden();
          }}
        >
          Neues Werk
        </button>
      </div>
      {werke.map((w) => {
        const saetze = werkSaetze(w, stuecke);
        const frei = portfolio.filter((s) => !w.saetze.includes(s.id));
        const gewaehlt = auswahl[w.id] ?? frei[0]?.id ?? '';
        const laeuft = spielt?.werk === w.id;
        return (
          <section key={w.id} className="werk">
            <div className="werk-kopf">
              <strong>{w.titel}</strong>
              <span className="meta">
                {saetze.length} {saetze.length === 1 ? 'Satz' : 'Sätze'}
              </span>
              {laeuft ? (
                <button className="secondary small" onClick={stoppen}>
                  ■ Stopp
                </button>
              ) : (
                <button
                  className="small"
                  disabled={!saetze.length || !!spielt}
                  onClick={() => {
                    abbruch.current = false;
                    abspielen(w, saetze, 0);
                  }}
                >
                  ▶ Alle Sätze anhören
                </button>
              )}
              <button className="secondary small" disabled={!saetze.length} onClick={() => saetze.forEach((s, i) => exportieren(s, i + 1, w))} title="Jeder Satz als eigene MusicXML-Datei">
                Alle Sätze nach MuseScore
              </button>
              {loeschen === w.id ? (
                <span className="loeschen-frage">
                  Werk löschen? Die Stücke bleiben erhalten.{' '}
                  <button
                    className="secondary small danger"
                    onClick={async () => {
                      await werkLoeschen(w.id);
                      setLoeschen(null);
                      await laden();
                    }}
                  >
                    Ja
                  </button>{' '}
                  <button className="secondary small" onClick={() => setLoeschen(null)}>
                    Nein
                  </button>
                </span>
              ) : (
                <button className="link small" onClick={() => setLoeschen(w.id)} aria-label={`Werk ${w.titel} löschen`}>
                  löschen
                </button>
              )}
            </div>
            {saetze.length > 0 && (
              <ol className="werk-saetze">
                {saetze.map((s, i) => (
                  <li key={s.id} className={laeuft && spielt?.satz === i ? 'is-current' : ''}>
                    <button className="link" onClick={() => onOpen(s.id, s.doc)}>
                      {s.titel}
                    </button>{' '}
                    {laeuft && spielt?.satz === i && <span className="meta">♪ spielt</span>}{' '}
                    <button className="secondary small" onClick={() => aendern(w, satzVerschieben(w.saetze, w.saetze.indexOf(s.id), -1))} disabled={i === 0} aria-label={`${s.titel} nach oben`}>
                      ↑
                    </button>{' '}
                    <button className="secondary small" onClick={() => aendern(w, satzVerschieben(w.saetze, w.saetze.indexOf(s.id), 1))} disabled={i === saetze.length - 1} aria-label={`${s.titel} nach unten`}>
                      ↓
                    </button>{' '}
                    <button className="secondary small" onClick={() => exportieren(s, i + 1, w)} title="Diesen Satz als MusicXML">
                      MuseScore
                    </button>{' '}
                    <button className="link small" onClick={() => aendern(w, w.saetze.filter((x) => x !== s.id))}>
                      entfernen
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {frei.length > 0 ? (
              <div className="fassung-neu">
                <select value={gewaehlt} onChange={(e) => setAuswahl({ ...auswahl, [w.id]: e.target.value })} aria-label="Stück als Satz hinzufügen">
                  {frei.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titel}
                    </option>
                  ))}
                </select>
                <button className="secondary" disabled={!gewaehlt} onClick={() => aendern(w, [...w.saetze, gewaehlt])}>
                  Als {saetze.length + 1}. Satz hinzufügen
                </button>
              </div>
            ) : (
              <p className="meta">{portfolio.length ? 'Alle Portfolio-Stücke sind schon Sätze dieses Werks.' : 'Nimm zuerst Stücke ins Portfolio auf (Haken „Im Portfolio“), dann kannst du sie hier als Sätze hinzufügen.'}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
