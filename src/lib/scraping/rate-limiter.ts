export class RateLimiter {
  private lastCallAt = 0;

  constructor(private readonly minDelayMs: number = 3000) {}

  async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastCallAt;
    if (elapsed < this.minDelayMs) {
      await new Promise<void>(r => setTimeout(r, this.minDelayMs - elapsed));
    }
    this.lastCallAt = Date.now();
  }
}
