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

// Classic parametric heart curve
function heartPoint(t: number): { x: number; y: number } {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x, y };
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
  _height: number,
  customPositions?: [number, number][]
): Constellation {
  const seed = hashString(sentences.join(''));
  const rng = mulberry32(seed);

  const n = sentences.length;
  const stars: Star[] = [];

  // Use custom positions if provided and valid
  const useCustom = customPositions && customPositions.length === n;

  // Place stars along a heart curve
  // Distribute evenly around the heart (t goes from 0 to 2π)
  // Start from the bottom point of the heart for a nice reading flow
  const padding = 0.15;
  const usableW = 1 - 2 * padding;
  const usableH = 1 - 2 * padding;

  // Heart curve bounds: x roughly [-16, 16], y roughly [-17, 15]
  const hMinX = -16, hMaxX = 16;
  const hMinY = -17, hMaxY = 15;
  const hRangeX = hMaxX - hMinX;
  const hRangeY = hMaxY - hMinY;

  for (let i = 0; i < n; i++) {
    let x: number, y: number;

    if (useCustom) {
      x = customPositions[i][0];
      y = customPositions[i][1];
    } else {
      // Distribute stars evenly along the heart curve
      // Start from bottom tip (t = π) and go clockwise
      const t = Math.PI + (i / n) * Math.PI * 2;
      const hp = heartPoint(t);

      // Normalize to 0-1 range with padding
      x = padding + ((hp.x - hMinX) / hRangeX) * usableW;
      y = padding + ((hp.y - hMinY) / hRangeY) * usableH;

      // Add small seeded randomness so it's not perfectly mechanical
      x += (rng() - 0.5) * 0.03;
      y += (rng() - 0.5) * 0.03;

      // Clamp
      x = Math.max(padding * 0.5, Math.min(1 - padding * 0.5, x));
      y = Math.max(padding * 0.5, Math.min(1 - padding * 0.5, y));
    }

    const wordCount = sentences[i].split(/\s+/).length;
    const size = 0.7 + Math.min(wordCount / 15, 0.6);

    stars.push({ x, y, size, sentence: sentences[i] });
  }

  // Sequential connections — the reading order traces the heart
  const connections: [number, number][] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    connections.push([i, i + 1]);
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
