import { LAUT, LEISE, MITTEL, SPUREN, STEPS, type Beat, type Kanal, type SpurId } from './beat';
import { spieleDrum } from './klang';

export type StepModus = 'setzen' | 'velocity';

interface Props {
  beat: Beat;
  /** Fehlt onChange, ist das Raster nur zum Ansehen */
  onChange?: (b: Beat) => void;
  /** Aktuell klingender Schritt (0–15), −1 = keiner */
  aktiv: number;
  modus?: StepModus;
  /** Mischpult (Lautstärke, Panorama, Hall, Stumm, Solo) neben den Spuren zeigen */
  mixer?: boolean;
  /** Nur Spuren zeigen, die etwas spielen (für Beispiele in Lektionen) */
  nurBenutzte?: boolean;
}

/** Nächste Anschlagstärke beim Antippen */
function naechster(v: number, modus: StepModus): number {
  if (modus === 'setzen') return v > 0 ? 0 : LAUT;
  if (v <= 0) return LAUT;
  if (v >= 0.85) return MITTEL;
  if (v >= 0.5) return LEISE;
  return 0;
}

const STAERKE = (v: number) => (v >= 0.85 ? 'laut' : v >= 0.5 ? 'mittel' : 'leise');

/** Step-Sequencer-Raster wie das Channel Rack: eine Zeile je Spur, 16 Schritte in Vierergruppen */
export function BeatGrid({ beat, onChange, aktiv, modus = 'setzen', mixer = false, nurBenutzte = false }: Props) {
  const spuren = SPUREN.filter((s) => !nurBenutzte || beat.kanaele[s.id].steps.some((v) => v > 0));

  function setzeKanal(id: SpurId, k: Partial<Kanal>) {
    if (!onChange) return;
    onChange({ ...beat, kanaele: { ...beat.kanaele, [id]: { ...beat.kanaele[id], ...k } } });
  }

  return (
    <div className="beat-raster" role="grid" aria-label="Step-Sequencer">
      <div className="beat-zeile beat-zaehler" role="row" aria-hidden="true">
        <span className="beat-name" />
        <div className="beat-steps">
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={`beat-zahl ${i % 4 === 0 ? 'is-zaehlzeit' : ''}`}>
              {i % 4 === 0 ? i / 4 + 1 : i % 2 === 0 ? '+' : ''}
            </span>
          ))}
        </div>
      </div>
      {spuren.map((s) => {
        const k = beat.kanaele[s.id];
        return (
          <div key={s.id} className={`beat-zeile ${k.stumm ? 'is-stumm' : ''}`} role="row">
            <button className="beat-name" onClick={() => spieleDrum(s.id).catch(() => {})} title={`${s.name} anhören`}>
              {s.name}
            </button>
            <div className="beat-steps">
              {k.steps.map((v, i) => (
                <button
                  key={i}
                  role="gridcell"
                  className={`beat-step ${v > 0 ? `is-an ${STAERKE(v)}` : ''} ${Math.floor(i / 4) % 2 === 1 ? 'is-dunkel' : ''} ${aktiv === i ? 'is-jetzt' : ''}`}
                  aria-label={`${s.name}, Schritt ${i + 1}: ${v > 0 ? STAERKE(v) : 'aus'}`}
                  aria-pressed={v > 0}
                  disabled={!onChange}
                  onClick={() => {
                    const neu = naechster(v, modus);
                    const steps = k.steps.slice();
                    steps[i] = neu;
                    setzeKanal(s.id, { steps });
                    if (neu > 0) spieleDrum(s.id, neu).catch(() => {});
                  }}
                />
              ))}
            </div>
            {mixer && onChange && (
              <div className="beat-mixer">
                <button className={`beat-ms ${k.stumm ? 'is-on' : ''}`} onClick={() => setzeKanal(s.id, { stumm: !k.stumm })} aria-pressed={k.stumm} title="Stumm (Mute)">
                  M
                </button>
                <button className={`beat-ms ${k.solo ? 'is-on' : ''}`} onClick={() => setzeKanal(s.id, { solo: !k.solo })} aria-pressed={k.solo} title="Solo">
                  S
                </button>
                <label title="Lautstärke">
                  <span>Vol</span>
                  <input type="range" min={-30} max={6} step={1} value={k.volume} onChange={(e) => setzeKanal(s.id, { volume: Number(e.target.value) })} aria-label={`${s.name} Lautstärke`} />
                </label>
                <label title="Panorama: links – Mitte – rechts">
                  <span>Pan</span>
                  <input type="range" min={-1} max={1} step={0.05} value={k.pan} onChange={(e) => setzeKanal(s.id, { pan: Number(e.target.value) })} onDoubleClick={() => setzeKanal(s.id, { pan: 0 })} aria-label={`${s.name} Panorama`} />
                </label>
                <label title="Hall (Send)">
                  <span>Hall</span>
                  <input type="range" min={0} max={1} step={0.05} value={k.hall} onChange={(e) => setzeKanal(s.id, { hall: Number(e.target.value) })} aria-label={`${s.name} Hall`} />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
