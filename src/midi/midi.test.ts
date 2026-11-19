import { describe, expect, it, vi } from 'vitest';
import { ChordCollector, parseMidiMessage } from './chord';
import { MidiInput } from './midi';

describe('MIDI-Nachrichten', () => {
  it('erkennt Note-On und Note-Off', () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({ type: 'on', midi: 60, velocity: 100, channel: 0 });
    expect(parseMidiMessage([0x91, 64, 0])).toMatchObject({ type: 'off', midi: 64, channel: 1 });
    expect(parseMidiMessage([0x80, 60, 40])).toMatchObject({ type: 'off' });
    expect(parseMidiMessage([0xb0, 64, 127])).toBeNull(); // Haltepedal
    expect(parseMidiMessage([0xf8])).toBeNull(); // MIDI-Clock
  });

  it('fasst gleichzeitige Tasten zu einem Akkord zusammen', () => {
    vi.useFakeTimers();
    const chords: number[][] = [];
    const c = new ChordCollector((notes) => chords.push(notes.map((n) => n.midi)), 50);
    c.noteOn(67, 90);
    c.noteOn(60, 90);
    vi.advanceTimersByTime(20);
    c.noteOn(64, 90);
    vi.advanceTimersByTime(60);
    c.noteOn(72, 80);
    vi.advanceTimersByTime(60);
    expect(chords).toEqual([[60, 64, 67], [72]]);
    vi.useRealTimers();
  });
});

describe('MIDI-Eingang mit simuliertem Keyboard', () => {
  function fakeAccess() {
    const inputs = new Map<string, { id: string; name: string; state: string; onmidimessage: ((e: { data: Uint8Array }) => void) | null }>();
    const access = { inputs, onstatechange: null as null | (() => void) };
    return {
      access,
      plugIn(id: string, name: string) {
        inputs.set(id, { id, name, state: 'connected', onmidimessage: null });
        access.onstatechange?.();
      },
      send(id: string, bytes: number[]) {
        inputs.get(id)!.onmidimessage!({ data: new Uint8Array(bytes) });
      },
    };
  }

  it('erkennt später eingesteckte Geräte und meldet Anschläge', async () => {
    const fake = fakeAccess();
    const on: [number, number][] = [];
    const devices: string[][] = [];
    const input = new MidiInput(
      { onNoteOn: (m, v) => on.push([m, v]), onDevices: (d) => devices.push(d.map((x) => x.name)) },
      async () => fake.access as never,
    );
    await input.connect();
    expect(devices.at(-1)).toEqual([]);
    fake.plugIn('a', 'Digitalpiano');
    expect(devices.at(-1)).toEqual(['Digitalpiano']);
    fake.send('a', [0x90, 62, 77]);
    fake.send('a', [0x80, 62, 0]);
    expect(on).toEqual([[62, 77]]);
  });
});
