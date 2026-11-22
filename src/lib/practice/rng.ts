// Deterministic PRNG using xmur3 and Mulberry32

export const SEED_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 31 chars (excludes 0, O, 1, I, L)

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PRNG {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(list: readonly T[]): T;
  shuffle<T>(list: readonly T[]): T[];
  sampleDistinct(min: number, max: number, count: number): number[];
}

export function createRng(seedString: string): PRNG {
  const seedGen = xmur3(seedString);
  const rawRng = mulberry32(seedGen());

  const next = () => rawRng();

  const int = (min: number, max: number): number => {
    if (min > max) [min, max] = [max, min];
    return Math.floor(next() * (max - min + 1)) + min;
  };

  const pick = <T>(list: readonly T[]): T => {
    if (!list.length) throw new Error("Cannot pick from empty list");
    return list[int(0, list.length - 1)];
  };

  const shuffle = <T>(list: readonly T[]): T[] => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const sampleDistinct = (min: number, max: number, count: number): number[] => {
    const rangeSize = max - min + 1;
    if (count > rangeSize) throw new Error(`Cannot sample ${count} distinct values from range of size ${rangeSize}`);
    const pool = Array.from({ length: rangeSize }, (_, i) => min + i);
    const shuffled = shuffle(pool);
    return shuffled.slice(0, count);
  };

  return { next, int, pick, shuffle, sampleDistinct };
}

export function generateSeed(rng?: () => number): string {
  const rand = rng ?? Math.random;
  let code = "";
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(rand() * SEED_ALPHABET.length);
    code += SEED_ALPHABET[idx];
  }
  return code;
}

export function normalizeSeed(input: string): string {
  const clean = input
    .trim()
    .toUpperCase()
    .replace(/[^2-9A-Z]/g, "")
    .replace(/[0O]/g, "8")
    .replace(/[1IL]/g, "7");
  if (clean.length < 6) {
    return (clean + "ABCDEF").slice(0, 6);
  }
  return clean.slice(0, 6);
}
