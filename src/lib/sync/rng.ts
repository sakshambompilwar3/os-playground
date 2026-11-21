/**
 * src/lib/sync/rng.ts
 * Seeded pseudo-random number generator (Mulberry32) for deterministic simulations.
 */

export class SeededRNG {
  private state: number;

  constructor(seed: number = 1) {
    this.state = seed >>> 0;
    if (this.state === 0) this.state = 1;
  }

  /**
   * Returns a float in [0, 1).
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] inclusive.
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Uniformly picks an element from an array.
   */
  pick<T>(items: T[]): T {
    if (items.length === 0) throw new Error("Cannot pick from empty array");
    const idx = Math.floor(this.next() * items.length);
    return items[idx]!;
  }
}
