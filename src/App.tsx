import { useState } from 'react';
import { EditorView } from './editor/EditorView';
import { PlayerView } from './PlayerView';

type Tab = 'schreiben' | 'hoeren';
const TAB_KEY = 'kt-tab';

function initialTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY);
    if (t === 'schreiben' || t === 'hoeren') return t;
  } catch {
    /* ignorieren */
  }
  return 'schreiben';
}

export function App() {
  const [tab, setTab] = useState<Tab>(initialTab);

  function choose(t: Tab) {
    setTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* ignorieren */
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>KompositionsTrainer</h1>
        <nav className="tabs" aria-label="Bereiche">
          <button className={tab === 'schreiben' ? 'is-on' : ''} onClick={() => choose('schreiben')} aria-current={tab === 'schreiben'}>
            Schreiben
          </button>
          <button className={tab === 'hoeren' ? 'is-on' : ''} onClick={() => choose('hoeren')} aria-current={tab === 'hoeren'}>
            Hören
          </button>
        </nav>
      </header>

      <main>{tab === 'schreiben' ? <EditorView /> : <PlayerView />}</main>

      <footer>
        Klavierklang: Salamander Grand Piano von Alexander Holm (CC BY 3.0). Version {__APP_VERSION__}
      </footer>
    </div>
  );
}
