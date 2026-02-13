import { describe, it, expect } from 'vitest';
import { encode, decode, splitSentences } from './data';
import type { ConstellationData } from './data';
import LZString from 'lz-string';

describe('encode/decode', () => {
  it('round-trips data correctly', () => {
    const data: ConstellationData = {
      to: 'Sarah',
      from: 'Mark',
      message: 'You are my sunshine. You make me happy.',
      theme: 'gold',
    };
    const encoded = encode(data);
    const decoded = decode(encoded);
    expect(decoded).toEqual(data);
  });

  it('returns null for invalid input', () => {
    expect(decode('')).toBeNull();
    expect(decode('garbage')).toBeNull();
  });

  it('returns null for missing fields', () => {
    const partial = JSON.stringify({ to: 'A' });
    const encoded = LZString.compressToEncodedURIComponent(partial);
    expect(decode(encoded)).toBeNull();
  });
});

describe('splitSentences', () => {
  it('splits on periods', () => {
    const result = splitSentences('I love you. You are amazing. Never change.');
    expect(result).toEqual(['I love you.', 'You are amazing.', 'Never change.']);
  });

  it('splits on exclamation and question marks', () => {
    const result = splitSentences('Do you know? I love you! So much.');
    expect(result).toEqual(['Do you know?', 'I love you!', 'So much.']);
  });

  it('handles single sentence', () => {
    const result = splitSentences('I love you');
    expect(result).toEqual(['I love you']);
  });

  it('splits on newlines', () => {
    const result = splitSentences('Line one\nLine two\nLine three');
    expect(result).toEqual(['Line one', 'Line two', 'Line three']);
  });

  it('filters empty strings', () => {
    const result = splitSentences('Hello.  . World.');
    expect(result.every(s => s.length > 0)).toBe(true);
  });
});
