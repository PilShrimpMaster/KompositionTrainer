import type { Schreibaufgabe } from '../lernpfad/lektion';
import { BeatView } from './BeatView';
import { SynthView } from './SynthView';

export type Werkzeug = 'beat' | 'synth';

interface Props {
  werkzeug: Werkzeug;
  onWerkzeug: (w: Werkzeug) => void;
  /** Vorlage für das Synth-Labor (aus einer Lektion) */
  synthVorlage?: string;
  aufgabe: Schreibaufgabe | null;
  onAufgabeSchliessen: () => void;
}

/** Produktionsbereich: Werkzeuge, die zeigen, wie eine DAW wie FL Studio arbeitet */
export function ProduzierenView({ werkzeug, onWerkzeug, synthVorlage, aufgabe, onAufgabeSchliessen }: Props) {
  return (
    <div className="produzieren">
      <div className="produzieren-kopf">
        <div className="segment" role="tablist" aria-label="Werkzeug">
          <button role="tab" aria-selected={werkzeug === 'beat'} className={werkzeug === 'beat' ? '' : 'secondary'} onClick={() => onWerkzeug('beat')}>
            Beat-Baukasten
          </button>
          <button role="tab" aria-selected={werkzeug === 'synth'} className={werkzeug === 'synth' ? '' : 'secondary'} onClick={() => onWerkzeug('synth')}>
            Synth-Labor
          </button>
        </div>
        <p className="meta">
          {werkzeug === 'beat'
            ? 'Ein Step-Sequencer wie das Channel Rack in FL Studio: Drums programmieren, mischen und als MIDI exportieren.'
            : 'Subtraktive Synthese wie in FL Studios 3x Osc, Sytrus oder Serum: Welle, Filter, Hüllkurve und LFO hören und sehen.'}
        </p>
      </div>
      {werkzeug === 'beat' ? <BeatView aufgabe={aufgabe?.beat ? aufgabe : null} onAufgabeSchliessen={onAufgabeSchliessen} /> : <SynthView vorlage={synthVorlage} aufgabe={aufgabe?.synth ? aufgabe : null} onAufgabeSchliessen={onAufgabeSchliessen} />}
    </div>
  );
}
