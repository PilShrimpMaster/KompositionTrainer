import { marked } from 'marked';
import { useEffect, useMemo, useRef } from 'react';
import { useNavigation } from '../navigation';
import { lexikonZiel, verlinkeDom } from './verlinken';

interface Props {
  text: string;
  /** Gemeinsame Menge für mehrere Abschnitte, damit jeder Begriff nur einmal verlinkt wird */
  schon?: Set<string>;
  /** Eintrag, der nicht auf sich selbst verlinken soll */
  ausser?: string;
  className?: string;
}

/** Markdown mit automatischen Verweisen ins Lexikon */
export function Markdown({ text, schon, ausser, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { oeffneLexikon } = useNavigation();
  const html = useMemo(() => marked.parse(text, { async: false }) as string, [text]);

  useEffect(() => {
    if (ref.current) verlinkeDom(ref.current, schon ?? new Set(), ausser);
  }, [html, schon, ausser]);

  return (
    <div
      ref={ref}
      className={`markdown ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(ev) => {
        const id = lexikonZiel(ev.nativeEvent);
        if (id) {
          ev.preventDefault();
          oeffneLexikon(id);
        }
      }}
    />
  );
}
