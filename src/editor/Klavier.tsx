import { useRef } from 'react';
import { germanName, germanNameWithOctave, spellMidi } from '../model/pitch';

interface Props {
  /** Tiefste Taste (MIDI), immer ein C */
  lowest: number;
  octaves: number;
  fifths: number;
  onKey: (midi: number) => void;
  onShift: (delta: number) => void;
  /** Gerade gedrückte bzw. klingende Tasten */
  active?: number[];
}

const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const BLACK_AFTER_WHITE: Record<number, number> = { 0: 1, 2: 3, 5: 6, 7: 8, 9: 10 };

/** Bildschirmklavier mit deutschen Tastennamen; funktioniert mit Finger, Stift und Maus. */
export function Klavier({ lowest, octaves, fifths, onKey, onShift, active = [] }: Props) {
  const pressed = useRef(new Set<number>());
  const whites: number[] = [];
  for (let o = 0; o < octaves; o++) for (const pc of WHITE_PCS) whites.push(lowest + o * 12 + pc);
  whites.push(lowest + octaves * 12); // abschließendes C

  const press = (midi: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    if (pressed.current.has(e.pointerId * 1000 + midi)) return;
    pressed.current.add(e.pointerId * 1000 + midi);
    onKey(midi);
  };
  const release = (midi: number) => (e: React.PointerEvent) => {
    pressed.current.delete(e.pointerId * 1000 + midi);
  };

  const octaveLabel = (midi: number) => germanNameWithOctave(spellMidi(midi, 0));

  return (
    <div className="klavier">
      <div className="klavier-bar">
        <button className="secondary small" onClick={() => onShift(-12)} aria-label="Eine Oktave tiefer">
          ◀ Oktave
        </button>
        <span className="klavier-range">
          {octaveLabel(lowest)} bis {octaveLabel(lowest + octaves * 12)}
        </span>
        <button className="secondary small" onClick={() => onShift(12)} aria-label="Eine Oktave höher">
          Oktave ▶
        </button>
      </div>
      <div className="klavier-keys" style={{ ['--whites' as string]: whites.length }}>
        {whites.map((midi, i) => {
          const pc = midi % 12;
          const black = BLACK_AFTER_WHITE[pc] !== undefined && i < whites.length - 1 ? midi + 1 : null;
          return (
            <div key={midi} className="klavier-slot">
              <button
                className={`taste weiss ${active.includes(midi) ? 'is-down' : ''}`}
                onPointerDown={press(midi)}
                onPointerUp={release(midi)}
                onPointerLeave={release(midi)}
                aria-label={germanName(spellMidi(midi, fifths))}
              >
                <span>{germanName(spellMidi(midi, fifths))}</span>
              </button>
              {black !== null && (
                <button
                  className={`taste schwarz ${active.includes(black) ? 'is-down' : ''}`}
                  onPointerDown={press(black)}
                  onPointerUp={release(black)}
                  onPointerLeave={release(black)}
                  aria-label={germanName(spellMidi(black, fifths))}
                >
                  <span>{germanName(spellMidi(black, fifths))}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
