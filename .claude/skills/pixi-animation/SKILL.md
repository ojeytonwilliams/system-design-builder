---
name: pixi-animation
description: Use this skill when animating pixi graphics. Particularly if a pixiGraphics element needs to update on each frame.
compatibility: must be using @pixi/react
---

# Pixi Animation

Contrary to the docs the prop `draw` is not called on each tick, instead it's only called when rendering the component. In order to animate something smoothly, you must supply a ref to a `pixiGraphics` element so it is populated with the element's `Graphics` object. Then that ref can be manipulated in `useTick`.

Example code:

```jsx
import { useRef } from "react";
import { Graphics } from "pixi.js";
import { extend, useTick } from "@pixi/react";

extend({ Graphics });

function Content() {
  const ref = useRef<Graphics>(null);

  let delta = 0;
  useTick((ticker) => {
    delta += ticker.deltaMS;
    const pulse = 0.5 * (1 + Math.sin((2 * Math.PI * delta) / 1000));
    ref.current?.clear();
    ref.current?.setFillStyle({ color: "red" });
    ref.current?.rect(0, 0, pulse * 100 + 50, pulse * 100 + 50);
    ref.current?.fill();
  });

  return <pixiGraphics ref={ref} draw={() => {}} />;
}
```