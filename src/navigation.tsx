import { createContext, useContext } from 'react';
import type { Schreibaufgabe } from './lernpfad/lektion';

export interface Navigation {
  /** Öffnet das Lexikon, optional direkt bei einem Eintrag */
  oeffneLexikon: (id?: string) => void;
  /** Wechselt in den Editor und zeigt dort die Aufgabe mit Prüfung */
  schreibeAufgabe: (a: Schreibaufgabe) => void;
  /** Öffnet ein Produktionswerkzeug (Beat-Baukasten oder Synth-Labor), optional mit einer Synth-Vorlage */
  oeffneProduktion: (werkzeug: 'beat' | 'synth', vorlage?: string) => void;
}

export const NavigationContext = createContext<Navigation>({ oeffneLexikon: () => {}, schreibeAufgabe: () => {}, oeffneProduktion: () => {} });

export function useNavigation() {
  return useContext(NavigationContext);
}
