import { renderHook } from "@testing-library/react";
import { useAnimationFrame } from "./use-animation-frame.js";

describe(useAnimationFrame, () => {
  let scheduledCallbacks: Map<number, (timestamp: number) => void>;
  let nextId: number;

  beforeEach(() => {
    scheduledCallbacks = new Map();
    nextId = 1;
    vi.stubGlobal("requestAnimationFrame", (onFrame: (timestamp: number) => void) => {
      const id = nextId++;
      scheduledCallbacks.set(id, onFrame);
      return id;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => {
      scheduledCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const tick = (timestamp: number) => {
    const pending = [...scheduledCallbacks.values()];
    scheduledCallbacks.clear();
    for (const frame of pending) {
      frame(timestamp);
    }
  };

  it("schedules a frame on mount", () => {
    renderHook(() => useAnimationFrame(vi.fn<(timestamp: number, delta: number) => void>()));
    expect(scheduledCallbacks.size).toBe(1);
  });

  it("calls callback with 0 delta on first frame", () => {
    const onFrame = vi.fn<(timestamp: number, delta: number) => void>();
    renderHook(() => useAnimationFrame(onFrame));
    tick(1000);
    expect(onFrame).toHaveBeenCalledWith(1000, 0);
  });

  it("calls callback with elapsed delta on subsequent frames", () => {
    const onFrame = vi.fn<(timestamp: number, delta: number) => void>();
    renderHook(() => useAnimationFrame(onFrame));
    tick(1000);
    tick(1016);
    expect(onFrame).toHaveBeenLastCalledWith(1016, 16);
  });

  it("clamps delta to 100ms", () => {
    const onFrame = vi.fn<(timestamp: number, delta: number) => void>();
    renderHook(() => useAnimationFrame(onFrame));
    tick(1);
    tick(501);
    expect(onFrame).toHaveBeenLastCalledWith(501, 100);
  });

  it("cancels pending frame on unmount", () => {
    const { unmount } = renderHook(() =>
      useAnimationFrame(vi.fn<(timestamp: number, delta: number) => void>()),
    );
    tick(0);
    unmount();
    expect(scheduledCallbacks.size).toBe(0);
  });

  it("always uses the latest callback", () => {
    const onFrame1 = vi.fn<(timestamp: number, delta: number) => void>();
    const onFrame2 = vi.fn<(timestamp: number, delta: number) => void>();
    const { rerender } = renderHook(({ fn }) => useAnimationFrame(fn), {
      initialProps: { fn: onFrame1 },
    });
    tick(1000);
    rerender({ fn: onFrame2 });
    tick(1016);
    expect(onFrame1).toHaveBeenCalledOnce();
    expect(onFrame2).toHaveBeenCalledOnce();
  });
});
