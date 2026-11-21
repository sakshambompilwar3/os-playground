/**
 * src/lib/sync/semaphore.ts
 * Classical counting semaphore with an explicit FIFO wait queue.
 */

export class SyncSemaphore {
  public readonly name: string;
  private val: number;
  private readonly waitQueue: string[] = [];

  constructor(name: string, initialValue: number) {
    this.name = name;
    this.val = initialValue;
  }

  get value(): number {
    return this.val;
  }

  get queue(): string[] {
    return [...this.waitQueue];
  }

  /**
   * Attempts wait operation.
   * If value > 0, decrements value and returns true (thread continues).
   * Otherwise, appends threadId to waitQueue and returns false (thread blocks).
   */
  wait(threadId: string): boolean {
    if (this.val > 0) {
      this.val -= 1;
      return true;
    }
    this.waitQueue.push(threadId);
    return false;
  }

  /**
   * Signal operation.
   * If waitQueue has blocked threads, pops the FIFO head and wakes it (value unchanged).
   * Otherwise, increments value.
   * Returns the woken threadId, or null if no thread was waiting.
   */
  signal(): string | null {
    if (this.waitQueue.length > 0) {
      const unblocked = this.waitQueue.shift()!;
      return unblocked;
    }
    this.val += 1;
    return null;
  }

  /**
   * Checks if threadId is currently queued on this semaphore.
   */
  isWaiting(threadId: string): boolean {
    return this.waitQueue.includes(threadId);
  }

  /**
   * Diagnostic snapshot of the semaphore state.
   */
  snapshot(): { name: string; value: number; queue: string[] } {
    return {
      name: this.name,
      value: this.val,
      queue: [...this.waitQueue],
    };
  }
}
