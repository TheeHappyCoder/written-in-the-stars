function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export interface Star {
  x: number;
  y: number;
  size: number;
  sentence: string;
}

export interface Constellation {
  stars: Star[];
  connections: [number, number][];
}

export function generateConstellation(
  sentences: string[],
  _width: number,
  _height: number
): Constellation {
  const seed = hashString(sentences.join(''));
  const rng = mulberry32(seed);

  const padding = 0.12;
  const minDist = 0.15;

  const stars: Star[] = [];

  for (const sentence of sentences) {
    let x: number, y: number;
    let attempts = 0;

    do {
      x = padding + rng() * (1 - 2 * padding);
      y = padding + rng() * (1 - 2 * padding);
      attempts++;
    } while (
      attempts < 100 &&
      stars.some(s => Math.hypot(s.x - x, s.y - y) < minDist)
    );

    const wordCount = sentence.split(/\s+/).length;
    const size = 0.7 + Math.min(wordCount / 15, 0.6);

    stars.push({ x, y, size, sentence });
  }

  const connections: [number, number][] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    connections.push([i, i + 1]);
  }

  if (stars.length >= 4) {
    connections.push([0, Math.floor(stars.length / 2)]);
  }
  if (stars.length >= 6) {
    connections.push([Math.floor(stars.length / 3), stars.length - 1]);
  }

  return { stars, connections };
}

export function starToPixel(
  star: Star,
  canvasWidth: number,
  canvasHeight: number
): { px: number; py: number } {
  return {
    px: star.x * canvasWidth,
    py: star.y * canvasHeight,
  };
}
