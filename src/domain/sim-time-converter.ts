/** Ratio of visual animation time to real-world time. A component with a
 * real-world latency of 10ms will animate for 10 * TIME_SCALE = 1000ms. */
const TIME_SCALE = 100;

/** Scales a real-world duration (ms) to simulation animation time. */
const convertDuration = (ms: number): number => ms * TIME_SCALE;

/** Scales a real-world rate (req/ms) to simulation rate. */
const convertRate = (rate: number): number => rate / TIME_SCALE;

/** Converts a simulation rate back to real-world rate (req/ms). */
const toRealRate = (simRate: number): number => simRate * TIME_SCALE;

/** Converts a simulation duration back to real-world duration (ms). */
const toRealDuration = (simMs: number): number => simMs / TIME_SCALE;

export { convertDuration, convertRate, toRealDuration, toRealRate };
