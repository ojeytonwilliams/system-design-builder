# Post-migration: PixiJS visual enhancements

These features require the PixiJS migration (`design/replace-react-flow-with-pixi.md`) to be complete first. They are new capabilities that go beyond parity with the old React Flow implementation.

---

## 1. Traffic particle system

Emoji particles that fly along edges during simulation, making traffic visible as moving entities rather than animated line dashes.

### Prerequisite utility — `cubicBezierPoint`

Add to `src/components/game-canvas.tsx` alongside the existing geometry utilities:

```typescript
const cubicBezierPoint = (p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t;
  return {
    x: mt ** 3 * p0.x + 3 * mt ** 2 * t * p1.x + 3 * mt * t ** 2 * p2.x + t ** 3 * p3.x,
    y: mt ** 3 * p0.y + 3 * mt ** 2 * t * p1.y + 3 * mt * t ** 2 * p2.y + t ** 3 * p3.y,
  };
};
```

### Architecture changes

Add a particle layer to the `<Application>` after the nodes layer:

```tsx
{/* Layer 4: traffic particles — updated imperatively via useTick */}
<pixiContainer ref={particleLayerRef} />
```

### Data model

```typescript
interface Particle {
  edgeId: string;
  emoji: string;
  id: string;
  speed: number;  // fraction of path covered per second
  t: number;      // 0..1 progress along the bezier
}
```

### Spawning

```typescript
const getTrafficEmoji = (componentType?: ComponentType): string => {
  if (componentType === "users") return "📦";
  return "⚡";
};

useEffect(() => {
  if (!isSimulating) {
    particlesRef.current = [];
    return;
  }

  const spawner = setInterval(() => {
    edges.forEach(edge => {
      if (Math.random() > 0.6) return;  // not every edge every tick

      const sourceNode = nodes.find(n => n.id === edge.source);
      particlesRef.current.push({
        edgeId: edge.id,
        emoji: getTrafficEmoji(sourceNode?.data.componentType),
        id: `p-${Date.now()}-${Math.random()}`,
        speed: 0.4 + Math.random() * 0.3,  // completes in ~2–3s
        t: 0,
      });
    });
  }, 500);

  return () => clearInterval(spawner);
}, [isSimulating, edges, nodes]);
```

### Animation via `useTick`

```typescript
useTick((delta) => {
  if (!isSimulating) return;

  const layer = particleLayerRef.current;
  if (!layer) return;

  particlesRef.current = particlesRef.current
    .map(p => ({ ...p, t: p.t + (p.speed * delta.deltaTime) / 60 }))
    .filter(p => p.t < 1);

  layer.removeChildren();

  particlesRef.current.forEach(particle => {
    const edge = edges.find(e => e.id === particle.edgeId);
    if (!edge) return;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    const { sourceHandle, targetHandle } = chooseBestHandles(sourceNode, targetNode);
    const src = getHandlePosition(sourceNode, sourceHandle);
    const tgt = getHandlePosition(targetNode, targetHandle);
    const { cp1, cp2 } = getBezierControlPoints(src, tgt);
    const pos = cubicBezierPoint(src, cp1, cp2, tgt, particle.t);

    const text = new Text({ text: particle.emoji, style: new TextStyle({ fontSize: 18 }) });
    text.x = pos.x;
    text.y = pos.y;
    text.anchor.set(0.5, 0.5);
    layer.addChild(text);
  });
});
```

> Use `new Text(...)` (PixiJS class) when adding children directly to a container ref — the reconciler won't be managing those nodes.

---

## 2. Overload burst particles

When a node transitions *into* the overloaded state, scatter a short-lived radial burst of 💥 particles.

```typescript
const prevOverloadedRef = useRef<string[]>([]);

useEffect(() => {
  const newlyOverloaded = overloadedNodeIds.filter(
    id => !prevOverloadedRef.current.includes(id)
  );

  newlyOverloaded.forEach(nodeId => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    const cx = node.position.x + NODE_WIDTH / 2;
    const cy = node.position.y + NODE_MIN_HEIGHT / 2;

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      particlesRef.current.push({
        edgeId: "",   // no edge — burst particle
        emoji: "💥",
        id: `burst-${nodeId}-${i}-${Date.now()}`,
        // Store burst-specific data (start position, angle) via extension or a separate burstParticlesRef
        speed: 0.8,
        t: 0,
      });
    }
  });

  prevOverloadedRef.current = overloadedNodeIds;
}, [overloadedNodeIds, nodes]);
```

Burst particles need their own animation logic (radial movement rather than bezier path). Consider a separate `burstParticlesRef` with `{ x, y, vx, vy, life }` fields, updated in the same `useTick` callback.

---

## 3. GlowFilter upgrade

Replace the stroke-based glow with a WebGL `GlowFilter` for a softer, more game-like appearance.

### Install

```
pnpm add --save-exact pixi-filters
```

### Usage in `PixiNodeGraphic`

```typescript
import { GlowFilter } from "pixi-filters";

// Access the Pixi container via onMount:
const containerRef = useRef<Container | null>(null);

useEffect(() => {
  if (!containerRef.current) return;
  containerRef.current.filters = isOverloaded
    ? [new GlowFilter({ color: 0xe5634d, distance: 18, innerStrength: 0, outerStrength: 2.5 })]
    : [];
}, [isOverloaded]);

// In JSX:
<pixiContainer onMount={(c) => { containerRef.current = c; }} ...>
```

Remove the stroke-based glow ring from `drawBackground` once this is in place.
