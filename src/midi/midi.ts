import { parseMidiMessage } from './chord';

export interface MidiDevice {
  id: string;
  name: string;
}

export interface MidiHandlers {
  onNoteOn: (midi: number, velocity: number) => void;
  onNoteOff?: (midi: number) => void;
  onDevices: (devices: MidiDevice[]) => void;
}

type Access = Pick<MIDIAccess, 'inputs' | 'onstatechange'>;

/** Web MIDI gibt es in Chrome und Edge, nicht in Safari (iPad). */
export function midiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator;
}

/** Hat der Browser die MIDI-Erlaubnis schon erteilt? Dann kann die App ohne Nachfrage verbinden. */
export async function midiPermissionGranted(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'midi' as PermissionName });
    return status.state === 'granted';
  } catch {
    return false;
  }
}

/**
 * Hört auf alle angeschlossenen MIDI-Eingänge, auch auf Geräte, die erst
 * später eingesteckt werden. `getAccess` ist austauschbar, damit Tests
 * ein simuliertes Keyboard verwenden können.
 */
export class MidiInput {
  private access: Access | null = null;

  constructor(
    private readonly handlers: MidiHandlers,
    private readonly getAccess: () => Promise<Access> = () => navigator.requestMIDIAccess({ sysex: false }),
  ) {}

  async connect(): Promise<MidiDevice[]> {
    this.access = await this.getAccess();
    this.access.onstatechange = () => this.attach();
    return this.attach();
  }

  disconnect() {
    if (!this.access) return;
    this.access.inputs.forEach((input) => (input.onmidimessage = null));
    this.access.onstatechange = null;
    this.access = null;
    this.handlers.onDevices([]);
  }

  private attach(): MidiDevice[] {
    const devices: MidiDevice[] = [];
    this.access?.inputs.forEach((input) => {
      if (input.state === 'disconnected') return;
      devices.push({ id: input.id, name: input.name || 'MIDI-Gerät' });
      input.onmidimessage = (e: MIDIMessageEvent) => {
        if (!e.data) return;
        const msg = parseMidiMessage(e.data);
        if (!msg) return;
        if (msg.type === 'on') this.handlers.onNoteOn(msg.midi, msg.velocity);
        else this.handlers.onNoteOff?.(msg.midi);
      };
    });
    this.handlers.onDevices(devices);
    return devices;
  }
}
