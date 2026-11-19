/**
 * Fasst Tasten, die fast gleichzeitig angeschlagen werden, zu einem Akkord zusammen.
 * Einzelne Töne kommen nach Ablauf des Zeitfensters als Akkord mit einem Ton heraus.
 */
export class ChordCollector {
  private pending: { midi: number; velocity: number }[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly onChord: (notes: { midi: number; velocity: number }[]) => void,
    private readonly windowMs = 50,
    private readonly schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout> = (fn, ms) =>
      setTimeout(fn, ms),
    private readonly cancel: (t: ReturnType<typeof setTimeout>) => void = (t) => clearTimeout(t),
  ) {}

  noteOn(midi: number, velocity: number) {
    if (this.pending.some((n) => n.midi === midi)) return;
    this.pending.push({ midi, velocity });
    if (this.timer) this.cancel(this.timer);
    this.timer = this.schedule(() => this.flush(), this.windowMs);
  }

  flush() {
    if (this.timer) this.cancel(this.timer);
    this.timer = null;
    if (!this.pending.length) return;
    const notes = this.pending.sort((a, b) => a.midi - b.midi);
    this.pending = [];
    this.onChord(notes);
  }
}

/** Zerlegt eine MIDI-Nachricht; liefert nur Note-On und Note-Off. */
export function parseMidiMessage(
  data: ArrayLike<number>,
): { type: 'on' | 'off'; midi: number; velocity: number; channel: number } | null {
  if (data.length < 3) return null;
  const status = data[0] & 0xf0;
  const channel = data[0] & 0x0f;
  const midi = data[1];
  const velocity = data[2];
  if (status === 0x90 && velocity > 0) return { type: 'on', midi, velocity, channel };
  if (status === 0x80 || (status === 0x90 && velocity === 0)) return { type: 'off', midi, velocity, channel };
  return null;
}
