import { useEffect, useMemo, useState } from 'react';
import { AkkordBeispiel } from '../render/Beispiele';
import { Markdown } from './Markdown';
import { EINTRAEGE, KATEGORIEN, eintrag, sucheEintraege, type Eintrag, type Kategorie } from './lexikon';

interface Props {
  id: string | null;
  onOeffne: (id: string | null) => void;
}

/** Nachschlagewerk mit Suche, Kategorien und verlinkten Einträgen */
export function LexikonView({ id, onOeffne }: Props) {
  const e = id ? eintrag(id) : undefined;
  if (e) return <EintragSeite eintrag={e} onOeffne={onOeffne} />;
  return <Liste onOeffne={onOeffne} />;
}

function Liste({ onOeffne }: { onOeffne: (id: string) => void }) {
  const [anfrage, setAnfrage] = useState('');
  const [kategorie, setKategorie] = useState<Kategorie | null>(null);
  const treffer = useMemo(() => {
    const t = sucheEintraege(anfrage);
    return kategorie ? t.filter((e) => e.kategorie === kategorie) : t;
  }, [anfrage, kategorie]);

  return (
    <section className="lexikon">
      <h2>Lexikon</h2>
      <input
        className="lexikon-suche"
        type="search"
        placeholder="Begriff suchen, z. B. Quintenzirkel"
        value={anfrage}
        onChange={(ev) => setAnfrage(ev.target.value)}
        aria-label="Lexikon durchsuchen"
      />
      <div className="lexikon-kategorien" role="group" aria-label="Kategorie">
        <button className={kategorie === null ? 'is-on' : ''} onClick={() => setKategorie(null)}>
          Alle
        </button>
        {KATEGORIEN.map((k) => (
          <button key={k} className={kategorie === k ? 'is-on' : ''} onClick={() => setKategorie(k)}>
            {k}
          </button>
        ))}
      </div>
      {treffer.length === 0 ? (
        <p className="hinweis">Nichts gefunden. Versuch es mit einem anderen Wort.</p>
      ) : (
        <ul className="lexikon-liste">
          {treffer.map((e) => (
            <li key={e.id}>
              <button onClick={() => onOeffne(e.id)}>
                <strong>{e.titel}</strong>
                <span className="lexikon-kat">{e.kategorie}</span>
                <span className="lexikon-kurz">{e.kurz}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="hinweis">{EINTRAEGE.length} Einträge. Das Lexikon wächst mit jeder Stufe.</p>
    </section>
  );
}

function EintragSeite({ eintrag: e, onOeffne }: { eintrag: Eintrag; onOeffne: (id: string | null) => void }) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [e]);

  return (
    <article className="lexikon lexikon-eintrag">
      <button className="zurueck secondary" onClick={() => onOeffne(null)}>
        ← Alle Begriffe
      </button>
      <h2>{e.titel}</h2>
      <p className="lexikon-kat">{e.kategorie}</p>
      <p className="lexikon-definition">{e.kurz}</p>
      {e.synonyme.length > 0 && <p className="hinweis">Auch: {e.synonyme.join(', ')}</p>}
      {e.beispiel && <AkkordBeispiel gruppen={e.beispiel} klang={e.klang} schluessel={e.schluessel} tonart={e.tonart} />}
      <Markdown text={e.text} ausser={e.id} className="lexikon-text" />
      {e.siehe.length > 0 && (
        <nav className="lexikon-siehe" aria-label="Siehe auch">
          <h3>Siehe auch</h3>
          {e.siehe.map((s) => {
            const z = eintrag(s);
            return z ? (
              <button key={s} onClick={() => onOeffne(s)}>
                {z.titel}
              </button>
            ) : null;
          })}
        </nav>
      )}
    </article>
  );
}
