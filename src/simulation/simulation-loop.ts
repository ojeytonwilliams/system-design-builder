const TICK_INTERVAL_MS = 16;

class SimulationLoop {
  private readonly onTick: (delta: number) => void;
  private readonly clock: () => number;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(onTick: (deltaMs: number) => void, clock: () => number = () => Date.now()) {
    this.onTick = onTick;
    this.clock = clock;
  }

  start(): void {
    let lastTime = this.clock();

    this.intervalId = setInterval(() => {
      const now = this.clock();
      let deltaMs = now - lastTime;
      lastTime = now;

      while (deltaMs >= TICK_INTERVAL_MS) {
        deltaMs -= TICK_INTERVAL_MS;
        this.onTick(TICK_INTERVAL_MS);
      }
    }, TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export { SimulationLoop, TICK_INTERVAL_MS };
