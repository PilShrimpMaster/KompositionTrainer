/**
 * Liest komprimiertes MusicXML (.mxl, ein ZIP-Archiv), wie MuseScore es standardmäßig speichert.
 * Entpackt wird mit der eingebauten DecompressionStream-API (Safari ab 16.4, Chrome, Node).
 */

interface Eintrag {
  name: string;
  methode: number;
  groesse: number;
  offset: number;
}

function eintraege(buf: Uint8Array): Eintrag[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Ende des zentralen Verzeichnisses suchen (Signatur 0x06054b50)
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Kein ZIP-Archiv');
  const anzahl = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out: Eintrag[] = [];
  for (let i = 0; i < anzahl; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('ZIP-Verzeichnis beschädigt');
    const methode = dv.getUint16(p + 10, true);
    const groesse = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const kommLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, methode, groesse, offset });
    p += 46 + nameLen + extraLen + kommLen;
  }
  return out;
}

async function lies(buf: Uint8Array, e: Eintrag): Promise<string> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nameLen = dv.getUint16(e.offset + 26, true);
  const extraLen = dv.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const daten = buf.subarray(start, start + e.groesse);
  if (e.methode === 0) return new TextDecoder().decode(daten);
  if (e.methode !== 8) throw new Error('Unbekannte Kompression');
  const strom = new Blob([daten.slice() as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(strom).text();
}

/** Gibt den MusicXML-Text aus einer .mxl-Datei zurück */
export async function entpackeMxl(daten: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = daten instanceof Uint8Array ? daten : new Uint8Array(daten);
  const liste = eintraege(buf);
  const container = liste.find((e) => e.name === 'META-INF/container.xml');
  let ziel: Eintrag | undefined;
  if (container) {
    const xml = await lies(buf, container);
    const pfad = /full-path="([^"]+)"/.exec(xml)?.[1];
    ziel = liste.find((e) => e.name === pfad);
  }
  ziel ??= liste.find((e) => !e.name.startsWith('META-INF/') && /\.(musicxml|xml)$/i.test(e.name));
  if (!ziel) throw new Error('Im Archiv steckt keine MusicXML-Datei');
  return lies(buf, ziel);
}

/** Erkennt ZIP am Dateianfang („PK“) */
export function istZip(daten: Uint8Array): boolean {
  return daten.length > 4 && daten[0] === 0x50 && daten[1] === 0x4b;
}
