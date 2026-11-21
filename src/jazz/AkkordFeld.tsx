import { useState } from 'react';
import { akkordBeschreibung, parseAkkordsymbol } from './akkordsymbol';

interface Props {
  wert: string;
  onSetzen: (akkord: string) => void;
}

/** Eingabe eines Akkordsymbols über der ausgewählten Note (Leadsheet) */
export function AkkordFeld({ wert, onSetzen }: Props) {
  const [text, setText] = useState(wert);
  const sauber = text.trim();
  const a = sauber ? parseAkkordsymbol(sauber) : null;
  const fehler = sauber && !a;
  const uebernehmen = () => {
    if (!fehler && sauber !== wert) onSetzen(sauber);
  };
  return (
    <div className="akkord-feld">
      <label className="field">
        <span>Akkordsymbol über dieser Note</span>
        <input
          type="text"
          value={text}
          placeholder="z. B. Dm7, G7, Cmaj7, F#ø7, Bb7#11, C/E"
          onChange={(e) => setText(e.target.value)}
          onBlur={uebernehmen}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') uebernehmen();
            if (e.key === 'Escape') setText(wert);
          }}
          aria-invalid={!!fehler}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      <span className={fehler ? 'error' : 'meta'}>
        {fehler ? 'Das kenne ich nicht als Akkordsymbol. Grundton mit englischem Buchstaben (B = H, Bb = B), dann m, 7, maj7, m7b5, dim7, sus4 …' : a ? akkordBeschreibung(a) : wert ? 'Leer lassen und Enter entfernt das Symbol.' : 'Englische Tonbuchstaben wie im Leadsheet: B ist H, Bb ist B.'}
      </span>
    </div>
  );
}
