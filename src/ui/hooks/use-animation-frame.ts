import { useEffect, useRef } from "react";

const MAX_DELTA_MS = 100;

type FrameCallback = (timestamp: number, delta: number) => void;

const useAnimationFrame = (onFrame: FrameCallback): void => {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    let animId = 0;
    let lastTimestamp = 0;

    const tick = (timestamp: number) => {
      const delta = lastTimestamp ? Math.min(timestamp - lastTimestamp, MAX_DELTA_MS) : 0;
      lastTimestamp = timestamp;
      onFrameRef.current(timestamp, delta);
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);
};

export { useAnimationFrame };
