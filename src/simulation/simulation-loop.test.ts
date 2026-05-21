import { SimulationLoop } from "./simulation-loop.js";

describe(SimulationLoop, () => {
  let onTick: ReturnType<typeof vi.fn<(elapsed: number) => void>>;
  let loop: SimulationLoop;

  beforeEach(() => {
    vi.useFakeTimers();
    onTick = vi.fn<(elapsed: number) => void>();
    loop = new SimulationLoop(onTick);
  });

  afterEach(() => {
    loop.stop();
    vi.useRealTimers();
  });

  it("does not call onTick before start()", () => {
    vi.advanceTimersByTime(3000);

    expect(onTick).not.toHaveBeenCalled();
  });

  it("calls onTick once after one tick interval", () => {
    loop.start();
    vi.advanceTimersByTime(1000);

    expect(onTick).toHaveBeenCalledOnce();
  });

  it("calls onTick once per elapsed tick", () => {
    loop.start();
    vi.advanceTimersByTime(3000);

    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("runs multiple onTick calls in one callback when the interval fires late", () => {
    let clockTime = 0;
    const clock = () => clockTime;
    const lateLoop = new SimulationLoop(onTick, clock);

    lateLoop.start();
    clockTime = 3000;
    vi.runOnlyPendingTimers();
    lateLoop.stop();

    expect(onTick).toHaveBeenCalledTimes(3);
  });

  it("passes a delta of 1 to each call", () => {
    loop.start();
    vi.advanceTimersByTime(3000);

    expect(onTick).toHaveBeenNthCalledWith(1, 1000);
    expect(onTick).toHaveBeenNthCalledWith(2, 1000);
    expect(onTick).toHaveBeenNthCalledWith(3, 1000);
  });

  it("stop() halts ticking", () => {
    loop.start();
    vi.advanceTimersByTime(1000);
    loop.stop();
    vi.advanceTimersByTime(3000);

    expect(onTick).toHaveBeenCalledOnce();
  });

  it("passes delta of 1 after restarting", () => {
    loop.stop();
    loop.start();
    vi.advanceTimersByTime(1000);

    expect(onTick).toHaveBeenNthCalledWith(1, 1000);
  });
});
