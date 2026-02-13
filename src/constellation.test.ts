import { describe, it, expect } from 'vitest';
import { generateConstellation } from './constellation';

describe('generateConstellation', () => {
  const sentences = [
    'I love you.',
    'You are my sunshine.',
    'Never change.',
    'You make every day better.',
  ];

  it('creates one star per sentence', () => {
    const result = generateConstellation(sentences, 800, 600);
    expect(result.stars).toHaveLength(4);
  });

  it('stars have valid normalized coordinates', () => {
    const result = generateConstellation(sentences, 800, 600);
    for (const star of result.stars) {
      expect(star.x).toBeGreaterThan(0);
      expect(star.x).toBeLessThan(1);
      expect(star.y).toBeGreaterThan(0);
      expect(star.y).toBeLessThan(1);
    }
  });

  it('is deterministic (same input = same output)', () => {
    const a = generateConstellation(sentences, 800, 600);
    const b = generateConstellation(sentences, 800, 600);
    expect(a.stars.map(s => [s.x, s.y])).toEqual(b.stars.map(s => [s.x, s.y]));
  });

  it('different messages produce different constellations', () => {
    const a = generateConstellation(sentences, 800, 600);
    const b = generateConstellation(['Different.', 'Message.', 'Here.', 'Now.'], 800, 600);
    const posA = a.stars.map(s => `${s.x.toFixed(4)},${s.y.toFixed(4)}`).join('|');
    const posB = b.stars.map(s => `${s.x.toFixed(4)},${s.y.toFixed(4)}`).join('|');
    expect(posA).not.toEqual(posB);
  });

  it('creates sequential connections', () => {
    const result = generateConstellation(sentences, 800, 600);
    expect(result.connections.length).toBeGreaterThanOrEqual(sentences.length - 1);
    expect(result.connections[0]).toEqual([0, 1]);
  });

  it('handles a single sentence', () => {
    const result = generateConstellation(['Just one.'], 800, 600);
    expect(result.stars).toHaveLength(1);
    expect(result.connections).toHaveLength(0);
  });
});
