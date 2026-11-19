import { createContext, useContext } from 'react';

export interface Navigation {
  /** Öffnet das Lexikon, optional direkt bei einem Eintrag */
  oeffneLexikon: (id?: string) => void;
}

export const NavigationContext = createContext<Navigation>({ oeffneLexikon: () => {} });

export function useNavigation() {
  return useContext(NavigationContext);
}
