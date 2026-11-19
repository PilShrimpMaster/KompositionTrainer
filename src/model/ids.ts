/** Eindeutige Kennung eines Notenereignisses: Stimme, Takt, Note (jeweils ab 0) */
export const eventId = (voice: number, measure: number, note: number) => `${voice}-${measure}-${note}`;
