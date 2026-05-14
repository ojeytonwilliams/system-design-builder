// oxlint-disable-next-line import/no-unassigned-import
import "@testing-library/jest-dom";
// oxlint-disable-next-line import/no-unassigned-import
import "vitest-canvas-mock";
import type { ReactNode } from "react";

vi.mock("pixi.js", () => ({
  // oxlint-disable-next-line no-extraneous-class
  Container: class {},
  // oxlint-disable-next-line no-extraneous-class
  Graphics: class {},
  // oxlint-disable-next-line no-extraneous-class
  Text: class {},
  // oxlint-disable-next-line no-extraneous-class
  TextStyle: class {
    constructor(config: Record<string, unknown>) {
      Object.assign(this, config);
    }
  },
}));

vi.mock("@pixi/react", () => ({
  Application: ({ children }: { children: ReactNode }) => children,
  extend: () => {},
  useApplication: () => ({ app: {}, isInitialised: false }),
  useTick: () => {},
}));

class MockResizeObserver implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;
  // oxlint-disable-next-line promise/prefer-await-to-callbacks
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback(
      [
        {
          borderBoxSize: [],
          contentBoxSize: [],
          contentRect: {
            bottom: 500,
            height: 500,
            left: 0,
            right: 800,
            toJSON: () => ({}),
            top: 0,
            width: 800,
            x: 0,
            y: 0,
          } as DOMRectReadOnly,
          devicePixelContentBoxSize: [],
          target,
        },
      ],
      this,
    );
  }
  disconnect() {}
  unobserve(_target: Element) {}
}

globalThis.ResizeObserver = MockResizeObserver;
