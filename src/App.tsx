import { useMemo, useState } from 'react';
import { EditorView } from './editor/EditorView';
import { LernenView } from './lernpfad/LernenView';
import { LexikonView } from './lexikon/LexikonView';
import type { Schreibaufgabe } from './lernpfad/lektion';
import { alleAufgaben } from './lernpfad/lektionen';
import { NavigationContext, type Navigation } from './navigation';
import { PlayerView } from './PlayerView';
import { KiEinstellungen } from './ki/KiErklaerung';

type Tab = 'lernen' | 'lexikon' | 'schreiben' | 'hoeren';
const TABS: Tab[] = ['lernen', 'lexikon', 'schreiben', 'hoeren'];
const TAB_NAMEN: Record<Tab, string> = { lernen: 'Lernen', lexikon: 'Lexikon', schreiben: 'Schreiben', hoeren: 'Hören' };
const TAB_KEY = 'kt-tab';
const AUFGABE_KEY = 'kt-editor-aufgabe';

function gemerkteAufgabe(): Schreibaufgabe | null {
  try {
    const id = localStorage.getItem(AUFGABE_KEY);
    return alleAufgaben().find((a) => a.id === id) ?? null;
  } catch {
    return null;
  }
}

function initialTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (TABS.includes(t as Tab)) return t as Tab;
  } catch {
    /* ignorieren */
  }
  return 'schreiben';
}

export function App() {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [lexikonId, setLexikonId] = useState<string | null>(null);
  const [aufgabe, setAufgabeState] = useState<Schreibaufgabe | null>(gemerkteAufgabe);

  function setAufgabe(a: Schreibaufgabe | null) {
    setAufgabeState(a);
    try {
      if (a) localStorage.setItem(AUFGABE_KEY, a.id);
      else localStorage.removeItem(AUFGABE_KEY);
    } catch {
      /* ignorieren */
    }
  }
  // Übungsrunde bleibt erhalten, wenn man kurz ins Lexikon schaut
  const [lernenBesucht, setLernenBesucht] = useState(tab === 'lernen');

  function choose(t: Tab) {
    setTab(t);
    if (t === 'lernen') setLernenBesucht(true);
    if (t === 'lexikon' && tab === 'lexikon') setLexikonId(null);
    merken(t);
  }

  function merken(t: Tab) {
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignorieren */
    }
  }

  const navigation = useMemo<Navigation>(
    () => ({
      oeffneLexikon: (id) => {
        setLexikonId(id ?? null);
        setTab('lexikon');
        merken('lexikon');
      },
      schreibeAufgabe: (a) => {
        setAufgabe(a);
        setTab('schreiben');
        merken('schreiben');
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>KompositionsTrainer</h1>
        <nav className="tabs" aria-label="Bereiche">
          {TABS.map((t) => (
            <button key={t} className={tab === t ? 'is-on' : ''} onClick={() => choose(t)} aria-current={tab === t}>
              {TAB_NAMEN[t]}
            </button>
          ))}
        </nav>
      </header>

      <NavigationContext.Provider value={navigation}>
        <main>
          {lernenBesucht && (
            <div hidden={tab !== 'lernen'}>
              <LernenView />
            </div>
          )}
          {tab === 'lexikon' && <LexikonView id={lexikonId} onOeffne={setLexikonId} />}
          {tab === 'schreiben' && <EditorView aufgabe={aufgabe} onAufgabeSchliessen={() => setAufgabe(null)} />}
          {tab === 'hoeren' && <PlayerView />}
        </main>
      </NavigationContext.Provider>

      <footer>
        <details className="ki-fuss">
          <summary>KI-Einstellungen</summary>
          <KiEinstellungen onFertig={() => {}} />
        </details>
        Klavierklang: Salamander Grand Piano von Alexander Holm (CC BY 3.0). Version {__APP_VERSION__}
      </footer>
    </div>
  );
}
