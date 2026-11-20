import Anthropic from '@anthropic-ai/sdk';
import { kiSchluessel, zaehle } from './einstellungen';
import { KI_MODELL, SCHEMA, SYSTEM } from './erklaeren';

export class KiFehler extends Error {}

/**
 * Fragt Claude direkt aus dem Browser. Der Schlüssel kommt aus dem localStorage
 * und geht nur an api.anthropic.com.
 */
export async function frageClaude(text: string, art: { system: string; schema: object } = { system: SYSTEM, schema: SCHEMA }): Promise<string> {
  const apiKey = kiSchluessel();
  if (!apiKey) throw new KiFehler('Kein API-Schlüssel hinterlegt.');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  try {
    const antwort = await client.messages.create({
      model: KI_MODELL,
      max_tokens: 16000,
      system: art.system,
      messages: [{ role: 'user', content: text }],
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: art.schema as unknown as Record<string, unknown> } },
    });
    zaehle(antwort.usage.input_tokens, antwort.usage.output_tokens);
    if (antwort.stop_reason === 'refusal') throw new KiFehler('Claude hat diese Anfrage abgelehnt.');
    if (antwort.stop_reason === 'max_tokens') throw new KiFehler('Die Antwort war zu lang und wurde abgeschnitten. Versuch es noch einmal.');
    const block = antwort.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new KiFehler('Claude hat keine Antwort geliefert.');
    return block.text;
  } catch (e) {
    if (e instanceof KiFehler) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new KiFehler('Der API-Schlüssel wurde nicht angenommen. Prüfe ihn in den KI-Einstellungen.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new KiFehler('Der Schlüssel hat keine Berechtigung für diese Anfrage.');
    if (e instanceof Anthropic.RateLimitError) throw new KiFehler('Gerade zu viele Anfragen. Warte kurz und versuch es noch einmal.');
    if (e instanceof Anthropic.APIConnectionError) throw new KiFehler('Keine Verbindung zu Anthropic. Bist du online?');
    if (e instanceof Anthropic.APIError) {
      const msg = e.message.toLowerCase();
      if (msg.includes('credit') || msg.includes('billing') || msg.includes('spend')) {
        throw new KiFehler('Das Guthaben oder Ausgabenlimit in der Anthropic Console ist erreicht.');
      }
      throw new KiFehler(`Fehler von Anthropic (${e.status ?? '?'}): ${e.message}`);
    }
    throw new KiFehler('Unbekannter Fehler bei der KI-Anfrage.');
  }
}
