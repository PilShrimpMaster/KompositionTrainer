import type { MidiDevice } from './midi';
import type { MidiStatus } from './useMidi';

interface Props {
  status: MidiStatus;
  devices: MidiDevice[];
  connect: () => void;
  mitspielen: boolean;
  setMitspielen: (v: boolean) => void;
}

/** Zeigt, ob ein MIDI-Keyboard verbunden ist, und erklärt, was zu tun ist. */
export function MidiPanel({ status, devices, connect, mitspielen, setMitspielen }: Props) {
  if (status === 'nicht-unterstuetzt') {
    return (
      <p className="midi-info">
        🎹 MIDI-Keyboard: In diesem Browser nicht verfügbar. Safari auf dem iPad kann kein Web MIDI; nutze dafür Chrome am
        PC.
      </p>
    );
  }
  return (
    <div className="midi-panel">
      <span className="midi-info">
        🎹{' '}
        {status === 'verbunden'
          ? devices.length
            ? `Verbunden: ${devices.map((d) => d.name).join(', ')}`
            : 'MIDI bereit, aber kein Keyboard gefunden. Schließe es per USB an, es wird automatisch erkannt.'
          : status === 'verbinde'
            ? 'Verbinde …'
            : status === 'abgelehnt'
              ? 'MIDI-Zugriff wurde nicht erlaubt. In Chrome über das Schloss-Symbol neben der Adresse wieder erlauben.'
              : 'MIDI-Keyboard'}
      </span>
      {(status === 'aus' || status === 'abgelehnt') && (
        <button className="secondary small" onClick={connect}>
          MIDI-Keyboard verbinden
        </button>
      )}
      {status === 'verbunden' && (
        <label className="check">
          <input type="checkbox" checked={mitspielen} onChange={(e) => setMitspielen(e.target.checked)} />
          <span>Töne in der App mitspielen</span>
        </label>
      )}
    </div>
  );
}
