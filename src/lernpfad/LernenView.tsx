import { useEffect, useRef, useState } from 'react';
import type { Fortschritt, ModulStatus } from '../speicher/backup';
import { alleFortschritte, dauerhaftSpeichern, sicherungEinlesen, sicherungErstellen } from '../speicher/db';
import { MODULE, STUFEN } from './module';
import { UEBUNGEN, type UebungTyp } from '../uebungen/aufgaben';
import { UebungView } from '../uebungen/UebungView';
import { istErledigt } from './erledigt';
import { lektionFuer } from './lektionen';
import { LektionView } from './LektionView';
import { EinstufungView, letzteEinstufung } from './EinstufungView';

const anzahl = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;

const STATUS_TEXT: Record<ModulStatus, string> = {
  offen: 'offen',
  begonnen: 'begonnen',
  sicher: 'sicher',
  uebersprungen: 'übersprungen',
};

/** Überblick über den Lernpfad mit Fortschritt je Modul und der Datensicherung. */
export function LernenView() {
  const [fortschritt, setFortschritt] = useState<Map<string, Fortschritt>>(new Map());
  const [dauerhaft, setDauerhaft] = useState<boolean | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [aktiv, setAktiv] = useState<UebungTyp | null>(null);
  const [lektion, setLektion] = useState<string | null>(null);
  const [einstufung, setEinstufung] = useState(false);

  async function laden() {
    const liste = await alleFortschritte();
    setFortschritt(new Map(liste.map((f) => [f.modul, f])));
  }

  useEffect(() => {
    laden().catch(() => setMeldung('Der Fortschritt konnte nicht geladen werden.'));
    dauerhaftSpeichern().then(setDauerhaft);
  }, []);

  async function exportieren() {
    const s = await sicherungErstellen();
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kompositionstrainer-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMeldung(`Sicherung erstellt: ${anzahl(s.stuecke.length, 'Stück', 'Stücke')}, ${anzahl(s.fortschritt.length, 'Modul', 'Module')}.`);
  }

  async function importieren(file: File) {
    try {
      const r = await sicherungEinlesen(JSON.parse(await file.text()));
      await laden();
      setMeldung(
        `Sicherung eingelesen: ${anzahl(r.stuecke, 'Stück', 'Stücke')}, ${anzahl(r.module, 'Modul', 'Module')}. Neuere Stände wurden behalten.`,
      );
    } catch (e) {
      setMeldung(e instanceof SyntaxError ? 'Die Datei ist kein gültiges JSON.' : (e as Error).message);
    }
  }

  if (aktiv) {
    return (
      <UebungView
        typ={aktiv}
        zurueck={lektion ? 'Lektion' : 'Lernpfad'}
        onEnde={() => {
          setAktiv(null);
          laden().catch(() => {});
        }}
      />
    );
  }

  if (einstufung) {
    return (
      <EinstufungView
        onEnde={() => {
          setEinstufung(false);
          laden().catch(() => {});
        }}
      />
    );
  }

  const offeneLektion = lektion ? lektionFuer(lektion) : undefined;
  if (offeneLektion) {
    return <LektionView lektion={offeneLektion} onUebung={setAktiv} onZurueck={() => setLektion(null)} />;
  }

  return (
    <div className="lernen">
      <div className="einstufung-hinweis">
        <div>
          <strong>Schon Vorkenntnisse?</strong>
          <p className="meta">
            Der Einstufungstest erkennt, was du schon kannst, und überspringt es.
            {letzteEinstufung() ? ` Zuletzt gemacht am ${letzteEinstufung()}.` : ''}
          </p>
        </div>
        <button className="secondary" onClick={() => setEinstufung(true)}>
          {letzteEinstufung() ? 'Test wiederholen' : 'Einstufungstest'}
        </button>
      </div>
      {STUFEN.map((stufe) => {
        const module = MODULE.filter((m) => m.stufe === stufe.nummer);
        return (
          <section key={stufe.nummer} className={`stufe ${module.length ? '' : 'is-later'}`}>
            <h2>
              Stufe {stufe.nummer}: {stufe.titel}
            </h2>
            <p className="meta">
              Abschlussprojekt: {stufe.abschluss}
              {lektionFuer(`s${stufe.nummer}-abschluss`) && (
                <>
                  {' '}
                  <button className="secondary small" onClick={() => setLektion(`s${stufe.nummer}-abschluss`)}>
                    Zum Abschlussprojekt{istErledigt(`lektion:s${stufe.nummer}-abschluss`) ? ' ✓' : ''}
                  </button>
                </>
              )}
            </p>
            {module.length > 0 ? (
              <ul className="modul-liste">
                {module.map((m) => {
                  const f = fortschritt.get(m.id);
                  const status = f?.status ?? 'offen';
                  const sicherheit = Math.round((f?.sicherheit ?? 0) * 100);
                  return (
                    <li key={m.id} className={`modul status-${status}`}>
                      <div className="modul-text">
                        <strong>{m.titel}</strong>
                        <p className="meta">{m.ziel}</p>
                        <div className="modul-uebungen">
                          {lektionFuer(m.id) && (
                            <button className="small" onClick={() => setLektion(m.id)}>
                              📖 Lektion{istErledigt(`lektion:${m.id}`) ? ' ✓' : ''}
                            </button>
                          )}
                          {UEBUNGEN.filter((u) => u.modul === m.id).map((u) => (
                            <button key={u.typ} className="secondary small" onClick={() => setAktiv(u.typ)}>
                              {u.hoeren ? '🎧 ' : '✎ '}
                              {u.titel}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="modul-fortschritt">
                        <div className="balken" role="progressbar" aria-valuenow={sicherheit} aria-valuemin={0} aria-valuemax={100}>
                          <div style={{ width: `${sicherheit}%` }} />
                        </div>
                        <span className="meta">{STATUS_TEXT[status]}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="meta">Folgt in einem späteren Meilenstein.</p>
            )}
          </section>
        );
      })}
      <p className="meta">
        Jede Runde hat 10 Aufgaben. Die Balken zeigen, wie sicher du bei den letzten 20 Aufgaben warst; ab 15 Aufgaben mit
        85 % gilt ein Modul als sicher. Je sicherer du wirst, desto schwieriger werden die Aufgaben.
      </p>

      <section className="sicherung">
        <h2>Daten sichern</h2>
        <p>
          Deine Stücke und dein Fortschritt liegen nur in diesem Browser. Mit einer Sicherungsdatei bringst du sie auf ein
          anderes Gerät (z. B. vom iPad auf den PC) oder schützt sie vor Verlust. Beim Einlesen gewinnt jeweils der neuere
          Stand.
        </p>
        {dauerhaft === false && (
          <p className="notice">
            Der Browser kann die Daten bei Platzmangel löschen. Auf dem iPad hilft es, die App über „Zum Home-Bildschirm“ zu
            installieren, und ab und zu eine Sicherung zu speichern.
          </p>
        )}
        <div className="json-actions">
          <button onClick={exportieren}>Sicherung speichern</button>
          <button className="secondary" onClick={() => fileRef.current?.click()}>
            Sicherung einlesen …
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importieren(f);
              e.target.value = '';
            }}
          />
        </div>
        {meldung && <p className="notice">{meldung}</p>}
      </section>
    </div>
  );
}
