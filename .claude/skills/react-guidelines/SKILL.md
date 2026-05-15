---
name: react-guidelines
description: Guidelines for writing correct React components and hooks. Use when writing or modifying React components or hooks.
---

# React Guidelines

## Refs are not render state

`useRef` is for values that are stable across renders and do not affect what is rendered. If a value needs to cause a re-render when it changes, it must be React state.

**Red flags:**
- A ref is read inside JSX or inside a value that feeds into JSX
- A state setter is called with no semantic value just to trigger a re-render (e.g. `setFrame(f => f + 1)`)
- A comment explains that a state update is needed to "force" something to re-draw

The valid uses for refs are: manipulating the DOM in way React cannot (e.g. getting a ref to a DOM node and calling `nodeRef.current.focus()`), storing data that is not used when rendering (e.g. a timeout id). If you want to use it for something else, ask the user.

## Integrating with imperative libraries

When using a library that manages its own objects (Pixi `Container`, Three.js `Mesh`, DOM nodes), the correct pattern is:

1. Store state in React (`useState`, `useReducer`)
2. Derive display values from that state
3. Pass derived values into the library as props or via effects

Do **not** mutate library objects to track state, then try to read that state back later. That inverts the data flow and forces everything downstream to work around the inversion.
