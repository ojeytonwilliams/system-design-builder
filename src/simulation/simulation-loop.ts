const TICK_INTERVAL_MS = 1000;

class SimulationLoop {
  private readonly onTick: (elapsed: number) => void;
  private readonly clock: () => number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private elapsed = 0;

  constructor(onTick: (elapsed: number) => void, clock: () => number = () => Date.now()) {
    this.onTick = onTick;
    this.clock = clock;
  }

  start(): void {
    this.elapsed = 0;
    let lastTime = this.clock();

    this.intervalId = setInterval(() => {
      const now = this.clock();
      let delta = now - lastTime;
      lastTime = now;

      while (delta >= TICK_INTERVAL_MS) {
        delta -= TICK_INTERVAL_MS;
        this.onTick(++this.elapsed);
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

export { SimulationLoop };
