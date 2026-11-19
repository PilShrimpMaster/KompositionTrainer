import { useCallback, useEffect, useRef, useState } from 'react';
import { ChordCollector } from './chord';
import { MidiInput, midiPermissionGranted, midiSupported, type MidiDevice } from './midi';

export type MidiStatus = 'nicht-unterstuetzt' | 'aus' | 'verbinde' | 'verbunden' | 'abgelehnt';

/**
 * React-Anbindung an Web MIDI. `onChord` bekommt jeden Anschlag als Liste
 * gleichzeitig gedrückter Tasten (meist nur eine).
 */
export function useMidi(onChord: (notes: { midi: number; velocity: number }[]) => void) {
  const supported = midiSupported();
  const [status, setStatus] = useState<MidiStatus>(supported ? 'aus' : 'nicht-unterstuetzt');
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [held, setHeld] = useState<number[]>([]);
  const chordRef = useRef(onChord);
  chordRef.current = onChord;
  const inputRef = useRef<MidiInput | null>(null);

  const connect = useCallback(async () => {
    if (!supported) return;
    setStatus('verbinde');
    const collector = new ChordCollector((notes) => chordRef.current(notes));
    const input = new MidiInput({
      onNoteOn: (midi, velocity) => {
        setHeld((h) => [...h.filter((m) => m !== midi), midi]);
        collector.noteOn(midi, velocity);
      },
      onNoteOff: (midi) => setHeld((h) => h.filter((m) => m !== midi)),
      onDevices: setDevices,
    });
    try {
      await input.connect();
      inputRef.current?.disconnect();
      inputRef.current = input;
      setStatus('verbunden');
    } catch {
      setStatus('abgelehnt');
    }
  }, [supported]);

  // Wurde die Erlaubnis schon einmal erteilt, gleich verbinden
  useEffect(() => {
    if (!supported) return;
    midiPermissionGranted().then((granted) => {
      if (granted) void connect();
    });
    return () => inputRef.current?.disconnect();
  }, [supported, connect]);

  return { supported, status, devices, held, connect };
}
