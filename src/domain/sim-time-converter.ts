/*
NOTE: convertDuration and convertRate should not be widely used. Prefer convertComponent and convertLevel instead.

Primitives for converting between display values (what a realistic system
would show, e.g. 10ms latency) and simulation values (scaled up so
animations are visible, e.g. 1000ms).

*/

/** Ratio of simulation animation time to display time. A component with a
 * display latency of 10ms will animate for 10 * TIME_SCALE = 1000ms. */
const TIME_SCALE = 100;

/** Scales a display duration (ms) to simulation animation time. */
const convertDuration = (ms: number): number => ms * TIME_SCALE;

/** Scales a display rate (req/ms) to simulation rate. */
const convertRate = (rate: number): number => rate / TIME_SCALE;

/** Converts a simulation rate back to display rate (req/ms). */
const toDisplayRate = (simRate: number): number => simRate * TIME_SCALE;

/** Converts a simulation duration back to display duration (ms). */
const toDisplayDuration = (simMs: number): number => simMs / TIME_SCALE;

export { convertDuration, convertRate, toDisplayDuration, toDisplayRate };
