import { convertRate } from "./component-library.js";

interface ToConvert {
  trafficPeak: number;
  trafficStart: number;
  trafficTarget: number;
}

const convertLevel = <T extends ToConvert>(def: T) => ({
  ...def,
  trafficPeak: convertRate(def.trafficPeak),
  trafficStart: convertRate(def.trafficStart),
  trafficTarget: convertRate(def.trafficTarget),
});

export { convertLevel };
