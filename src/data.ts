import LZString from 'lz-string';

export interface ConstellationData {
  to: string;
  from: string;
  message: string;
  theme: 'gold' | 'rose' | 'arctic' | 'aurora';
  pos?: [number, number][];
}

export function splitSentences(text: string): string[] {
  const raw = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (raw.length <= 1 && text.length > 80) {
    const bySemiOrComma = text
      .split(/[;]\s*|,\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    if (bySemiOrComma.length > 1) return bySemiOrComma;
  }

  if (raw.length === 1 && raw[0].length > 120) {
    const words = raw[0].split(/\s+/);
    const chunks: string[] = [];
    const chunkSize = Math.ceil(words.length / Math.ceil(words.length / 12));
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }
    return chunks;
  }

  return raw.length > 0 ? raw : [text.trim()];
}

export function encode(data: ConstellationData): string {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
}

export function decode(encoded: string): ConstellationData | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const data = JSON.parse(json);
    if (!data.to || !data.from || !data.message || !data.theme) return null;
    if (data.pos && !Array.isArray(data.pos)) delete data.pos;
    return data as ConstellationData;
  } catch {
    return null;
  }
}

export function buildShareURL(data: ConstellationData): string {
  const encoded = encode(data);
  return `${window.location.origin}${window.location.pathname}?d=${encoded}`;
}
