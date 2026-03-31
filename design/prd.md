# Product Requirements Document (PRD)

**Working title:** System Design Builder
**Status:** Draft v3

---

## Product Summary

System Design Builder is an **HTML5 educational strategy/simulation game** in which players construct and scale a company website from scratch. The player begins on an **empty dotted-grid canvas** and is guided to place only the minimum components needed to launch a functioning website. As traffic grows, the player learns core system design concepts by making decisions, seeing the consequences, and iterating toward better architectures.

The game teaches through **progressive failure and recovery** rather than lectures. Players are allowed to make incorrect choices, observe bottlenecks and outages visually on the map, and then revise the system using clearer mental models and gradually revealed rules.

**Visual style:** clean, flat, icon-based educational illustration with dark navy outlines, soft coral accents, rounded shapes, off-white background, and minimal but friendly UI. See `image.png` for the primary art-direction reference.

---

## Problem Statement

Most system design learning materials are abstract, text-heavy, and disconnected from the intuitive cause-and-effect of real systems. Beginners often memorise terms like cache, database, load balancer, and queue without understanding:

- why those components exist
- when they are needed
- what failure looks like
- how tradeoffs emerge under growth

There is an opportunity to teach system design through an interactive, visual, mobile-friendly experience where architecture behaves like a living system.

---

## Vision

Create a lightweight HTML5 game that makes system design feel intuitive by turning traffic, bottlenecks, reliability, and scaling into visible game mechanics.

The player should feel:

- "I launched a site."
- "Traffic increased."
- "Something is breaking."
- "I can see where it is breaking."
- "I changed the architecture and fixed it."
- "Now I understand why this component exists."

---

## Goals

1. Teach foundational system design concepts through interactive play.
2. Start from zero with minimal assumptions about prior technical knowledge.
3. Use short, clear, gradual instruction rather than long tutorials.
4. Make cause and effect visible on the map.
5. Preserve a simple, elegant aesthetic aligned with `image.png`.
6. Ship as an **HTML5 game** that can run in-browser across desktop and mobile web.

## Non-Goals

1. Full enterprise-grade system design simulation.
2. Deep networking or distributed systems theory in v1.
3. Competitive multiplayer in v1.
4. Complex coding tasks or writing real infrastructure code.
5. Visuals that are overly literal, gritty, or gamey in a zombie/war style.

---

## Target Audience

### Primary
- Beginners learning web architecture or system design
- Students and junior developers
- Curious learners who enjoy simulation/strategy games

### Secondary
- Educators who want a visual teaching aid
- Non-technical product/design learners wanting intuition about scale

---

## Platform

- **HTML5 browser game**
- Responsive layout for desktop and mobile browsers (portrait and landscape)
- Drag-and-drop interaction (primary and only placement model)
- No installation required for v1

---

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Site framework | **Astro** | Lightweight, flexible; supports React islands; good fit for a mostly-static shell with an interactive game canvas |
| UI components | **React** | Component model suits the palette, inspector, and overlay UI; integrates natively with React Flow |
| Graph / canvas | **React Flow** | Provides node placement, animated edges, and port-based connections out of the box; aligns directly with the game's connection mechanic |

### Notes
- The game canvas (nodes, edges, flow animation) is a React Flow graph rendered as a React island inside Astro.
- UI chrome (palette, top bar, inspector panel, coach/event log, end-of-level screen) are React components.
- No backend is required for v1; all state is managed client-side with auto-save to `localStorage`.

---

## User Stories

| As a… | I want to… | So that… |
|---|---|---|
| beginner | open the game in my browser immediately | I don't have to install anything |
| beginner | start a level with a broken system already in place | I can immediately see what failure looks like and start fixing it |
| player | drag components onto a canvas | I can build an architecture visually |
| player | connect components by clicking their ports | I can wire up flows without switching modes |
| player | launch traffic and watch it flow | I can see my architecture in action |
| player | see a component turn red when it's overloaded | I understand where the bottleneck is |
| player | always see the current requests/sec rate prominently | I can judge whether my architecture is keeping up |
| player | receive a short, calm explanation when something fails | I learn what went wrong without feeling punished |
| player | add or rearrange components after a failure | I can iterate quickly toward a better design |
| player | see the price and capacity of each component in the resources panel | I can make budget-conscious architecture decisions |
| player | unlock new components as traffic grows | the game reveals complexity at the right pace |
| player | tap/click a component to see its current stats | I can inspect what's happening under the hood |
| player | sustain a target requests/sec without dropping traffic to complete a level | I have a clear, traffic-based win condition |
| player | stay within a monthly infrastructure budget | I understand cost trade-offs in real architecture |
| educator | share the game URL with students | they can explore system design concepts visually |

---

## Core Product Pillars

### 1. Start Empty
The player begins with an **empty field** using a **technical-paper style dotted grid**. The board should feel like a design workspace, not a finished city.

### 2. Learn the Minimum First
The game briefly instructs the player to place the minimum required elements to get a website running. It must not assume prior knowledge, but the explanation must stay brief and actionable.

### 3. Learn Through Failure
The player is allowed to make poor choices. Instead of blocking them, the game shows consequences such as overload, latency, dropped requests, or rising costs. The player can then iterate toward a better design.

### 4. Make Bottlenecks Visible
The architecture should visually reveal pressure points. When a component is overloaded it turns red and requests begin dropping.

### 5. Reveal Rules Gradually
Mechanics, metrics, and advanced components unlock progressively as the player encounters the need for them.

### 6. Stay Visually Clear
All components should resemble recognisable technical icons or common iconographic patterns used in design/dev tools. The visuals should remain representative of the technologies they depict.

---

## Core Gameplay Loop

The loop has three repeating phases:

**Design → Simulate → Redesign**

1. **Design** — drag components onto the canvas and connect their ports to form an architecture.
2. **Simulate** — press Start Traffic. The simulation runs automatically for a fixed duration (defined per level). It ends early if the revenue target is reached. The player observes outcomes: revenue, request flow, and overloaded nodes.
3. **Redesign** — when the simulation ends, the player is returned to design mode automatically. If the revenue target was not reached, they can adjust the architecture and run the simulation again.

The level is complete when the revenue target is reached within a simulation run. Redesign is optional — a well-designed architecture may reach the target on the first run.

---

## Game Structure

### Opening Scenario

The player is told they are launching a company website.

Initial mission: *"Build the minimum setup needed to get your website online."*

The player begins with an empty dotted-grid canvas and a very small palette of components.

### Initial Available Components

- Users (traffic source)
- Server (app/web server)
- Database

### First-Look Guidance

Guidance should be concise, not lecture-like:

- "A website needs a place to handle requests."
- "Most websites also need somewhere to store data."
- "Drag the pieces onto the canvas, then connect them."

The game should not front-load terminology beyond what is needed.

---

## Key Learning Model

**Principle: Do not prevent mistakes too early.**

Instead:
- Let the player wire a weak architecture.
- Run traffic through it.
- Show what breaks.
- Offer a short explanation.
- Let the player delete, re-place, or expand.

### Example Learning Sequence

1. Player drags one app server and one database onto the canvas and connects them.
2. Low traffic works. Revenue accumulates.
3. Traffic grows automatically.
4. The server becomes overloaded and turns red. Requests are dropped. Revenue slows.
5. The player sees request flow crowding into the server.
6. The game unlocks an additional server.
7. The player drags on another server and connects it.
8. Load is split. Revenue recovers.
9. (Level 4) The player later unlocks the Load Balancer for automatic distribution.

---

## Core Mechanics

### 1. Empty Canvas Placement
- The map starts blank.
- Background is an off-white field with subtle dotted-grid styling inspired by technical paper.
- Players drag components from a compact palette onto the field.
- Components snap to the grid on drop.

### 2. Port-Based Connections
- Each component has **connection ports**: one or more **outgoing ports** (right/bottom) and **incoming ports** (left/top), shown as small circles on the component's edge.
- To connect two components: click an outgoing port on the source, then click an incoming port on the destination. A flow line is drawn.
- There is no separate "connect mode." The canvas is always in placement mode; port clicks initiate a connection drag.
- To remove a connection: click the flow line and press Delete, or right-click and choose Remove.
- Connection rules:
  - Users node has outgoing ports only.
  - DB and Cache have no outgoing port to Users.
  - Traffic splits equally across all outgoing connections from a node.
  - A component may have unlimited connections.

### 3. Flow Connections (Visual)
- Active connections are rendered as **React Flow edges** — light, animated flow lines showing direction of traffic.
- When a node is overloaded, incoming flow lines thicken and crowd visually.

### 4. Component Labels
Each placed element must display:
- icon
- component name below it, e.g. **Cache**, **DB**, **Server**
- click/tap to open Inspector panel

### 5. Inspector Panel
Clicking a component opens a side panel with:
- component name and type
- current ops/sec
- max capacity (ops/sec)
- current load %
- latency contribution (ms)
- cost

The panel should be simple and readable. It is not meant to look like a dense infra dashboard.

### 6. Overload State
A component has two visual states: **normal** and **overloaded**.

Overloaded triggers when ops/sec exceeds max capacity. When overloaded:
- node turns coral/red
- glow or pulse effect appears
- incoming flow lines crowd visually
- requests are dropped (no revenue for dropped requests)

No intermediate warning state exists. The transition from normal to overloaded is the learning signal.

### 7. Gradual Rules Reveal

Components and mechanics unlock as the player encounters the need:

| Unlock | Trigger condition |
|---|---|
| Level 1 (always) | Users, Server, DB available from the start |
| Level 2 | Any node reaches 100% capacity for the first time |
| Level 3 | A node has been overloaded for 10+ continuous seconds |
| Level 4 | Player has placed 2 or more servers simultaneously |
| Level 5 | Player completes Level 4 win condition |
| Level 6 | Player completes Level 5 win condition |
| Level 7 | Player completes Level 6 win condition |

### 8. Failure-Recovery Loop
When failure occurs, the game should:
- show the issue visually (overloaded node)
- explain the issue briefly (one or two lines)
- allow quick iteration (delete/re-place/reconnect)
- reward the corrected architecture (drops stop, traffic handled, win condition progresses)

Failure should feel instructive, not punishing.

### 9. Resources Panel
The **Resources panel** (replaces the former "palette") lists all components available to the player for the current level. Each entry shows:
- component icon and name
- monthly cost (e.g. **$20/mo**)
- capacity (e.g. **50 req/s**)
- one-line explanation of what the component does (e.g. *"Handles incoming requests from users"*)

The **Users** node is always pre-placed in the level's starting layout and is **not** shown in the Resources panel. Users is a fixed traffic source that the player cannot add, move, or delete.

Components that are not yet unlocked for the current level are hidden from the Resources panel.

---

## Traffic Simulation Model

Traffic is modelled as a **request rate in req/sec**.

- The Users node emits requests at the current traffic rate.
- Requests travel through connected components in sequence (e.g. Users → Server → DB).
- Each component processes requests up to its max capacity (req/sec).
- When incoming rate exceeds capacity, excess requests are **dropped** (not queued).
- Traffic grows **linearly** from the level's starting rate to its peak rate over the simulation duration (MVP). The rate is shown continuously in the top bar.
- Each level defines a **peak traffic target** (req/sec) and a **simulation timeout** (e.g. 60–90 seconds). The simulation stops automatically when either the win condition is met or the timeout expires.
- The **win condition** is met when the system sustains the target req/sec rate for a continuous 10-second window with zero dropped requests.
- When the simulation ends, the player is returned to design mode. If the win condition was met, the end-of-level screen is shown. If not, the canvas remains editable for another attempt.
- A Load Balancer distributes incoming requests evenly across all connected downstream nodes. It has no capacity limit of its own.
- A Cache intercepts a configurable percentage of DB-bound requests (cache hit rate, defined per level). Hits do not travel to the DB.

---

## Component Capacity & Costs

Costs are monthly infrastructure costs, grounded in real-world cloud pricing (AWS/GCP, simplified for gameplay). Capacity represents the sustained request throughput each component can handle.

| Component | Capacity | Monthly cost | Notes |
|---|---|---|---|
| Small Server | 50 req/sec | $20/mo | Entry-level compute; handles web requests |
| Large Server | 150 req/sec | $80/mo | Higher-capacity compute; same role, more throughput |
| Small DB | 30 req/sec | $15/mo | Managed relational database, dev tier |
| Large DB | 90 req/sec | $50/mo | Managed relational database, production tier |
| Cache | 200 req/sec | $25/mo | In-memory read cache; intercepts DB reads |
| Load Balancer | unlimited | $20/mo | Distributes traffic evenly; cannot be overloaded |

Overloaded = incoming req/sec > capacity. Dropped req/sec = incoming − capacity.

There are no in-game upgrades. Players choose the right-sized component from the Resources panel when placing it.

---

## Budget & Costs

### Monthly Infrastructure Budget
- Each level has a fixed **monthly infrastructure budget** (e.g. $100–$300/mo).
- Every component placed on the canvas costs its monthly rate, deducted from the budget.
- Removing a component refunds its monthly cost.
- The player cannot place a component that would exceed the remaining budget.
- Remaining budget is displayed in the top bar at all times.

### Win Condition
Each level has a **traffic target** (req/sec). The level is complete when the player's architecture sustains that req/sec rate for a continuous 10-second window with zero dropped requests. The target increases with each level to reflect the growing complexity required.

### Display
- **Remaining budget** and **monthly cost** of placed components are shown in the top bar.
- **Current req/sec** (live traffic rate during simulation) is always prominently visible in the top bar.
- The **traffic target** for the active level is shown in the top bar alongside the live rate.

---

## Levels

Levels are **hand-authored scenarios** for v1. Each level specifies:
- available resources (which components the player can place)
- authored starting layout (initial nodes/edges — always a **failing configuration** the player must fix)
- objective text (a short mission visible during play)
- monthly infrastructure budget
- traffic profile (starting rate, peak rate, linear growth over simulation duration)
- simulation timeout (maximum duration of a single simulation run)
- traffic target (req/sec — win condition, level completes when sustained for 10s with no drops)
- unlock trigger (what concept becomes available)

**Every level starts in a failing state.** The preset configuration is deliberately under-powered or mis-wired so the player immediately sees overloads and must edit the architecture to fix them. This means the player's first action in every level is diagnosis and repair, not blank-canvas construction.

There is no hard fail state. The player can always delete, reconnect, and retry within the same level.

Progress is **auto-saved to `localStorage`** after each level is completed.
On startup, the game resumes at the **first incomplete level**.

The gameplay UI must always show level context during play:
- active level number and title
- current objective text
- traffic target (req/sec) for the active level
- live req/sec rate (prominent, always visible during simulation)
- remaining budget and total monthly cost

The game includes a compact level progression strip where:
- completed levels are replayable
- the current unlocked level is selectable
- locked levels are visible but non-interactive

### Level Summary

| Level | Failing start state | Focus concept | Key unlock |
|---|---|---|---|
| 1 | Single small server overloaded at peak | Server capacity and overload | Small Server, Small DB |
| 2 | Two servers, no load balancer — traffic imbalanced | Load balancing | Load Balancer |
| 3 | DB becomes the bottleneck after servers are balanced | Database capacity | Large DB |
| 4 | Large DB still insufficient — cache missing | Read caching | Cache |
| 5 | Cache hit rate low, budget tight | Budget optimisation and right-sizing | Large Server |
| 6 | Multi-component system overloaded at high traffic | Full architecture design under budget | All components |

### End-of-Level Screen

When the player sustains the traffic target for 10 seconds, an end-of-level screen is shown before the next level loads. It must display:

- **Score**: a numerical or star-based score derived from efficiency (e.g. budget headroom remaining, time taken to reach the win condition)
- **Feedback**: 2–3 lines of specific, positive feedback explaining what the player's architecture did well and what concept was demonstrated (e.g. "You added a load balancer to split traffic evenly across two servers — that's horizontal scaling.")
- A **Continue** button to proceed to the next level
- A **Replay** button to retry the level (for a better score)

Feedback tone should match the rest of the game: calm, specific, educational. It should name the concept the player just demonstrated.

---

## v1 Feature Set

### Must Have
- HTML5 browser-based game
- Dotted-grid map with grid snapping
- Drag-and-drop placement of core components
- Port-based connections (click outgoing port → click incoming port)
- Animated directional flow lines between components
- Initial launch scenario for a company website
- Minimal onboarding instructions embedded in play
- Gradual component and mechanic unlock system
- Overloaded visual state (red/coral) on nodes and crowded flows
- Persistent labels under components
- Inspector panel per component (req/sec, load, capacity, latency, monthly cost)
- Ability to delete components and connections and re-place
- Linear traffic growth simulation (starting rate → peak rate over simulation duration)
- Live req/sec display always prominent in top bar (current rate + target)
- Monthly infrastructure budget per level; remaining budget shown in top bar
- Per-level traffic target (req/sec) as win condition; met by sustaining target for 10s with zero drops
- Two server sizes (Small and Large) with different capacities and costs
- Resources panel listing available components with price, capacity, and one-line description; Users node excluded
- Levels start in a failing preset configuration the player must fix
- Auto-save to localStorage on level completion
- End-of-level screen with score and educational feedback

### Should Have
- Short scenario-based coach prompts
- Tooltips that explain concepts only after they matter
- Visual success state when traffic target is sustained
- Event log showing key state changes

### Could Have
- Sandbox mode after completing tutorial levels
- Incident cards such as "traffic spike" or "marketing campaign"
- Comparison overlay showing before vs after req/sec handling
- Export state for sharing or debugging

---

## Example Early Player Journey

### Stage 1: Failing Start
The player opens Level 1 and sees a pre-built architecture: Users → Small Server → Small DB. The server is already red. A coach message reads: *"Your server can't handle this much traffic. Fix it."*

Available resources: Small Server ($20/mo · 50 req/s) · Large Server ($80/mo · 150 req/s) · Small DB ($15/mo · 30 req/s)

Monthly budget: $100/mo. Currently spent: $35/mo (1× Small Server + 1× Small DB).

### Stage 2: Player Diagnoses
The player clicks the overloaded server. The Inspector panel shows: 80 req/s incoming, 50 req/s capacity, 37% dropped.

The player sees there is $65/mo of budget remaining — enough for one more Small Server ($20/mo) or to swap to a Large Server.

### Stage 3: Player Fixes
The player deletes the Small Server and drags a Large Server onto the canvas. Monthly cost rises to $95/mo. They press Start Traffic.

### Stage 4: Success
Traffic grows linearly. The Large Server handles it. The coach says: *"Larger hardware means more capacity — that's vertical scaling."* The player sustains the target (e.g. 80 req/s) for 10 seconds. Level complete.

---

## UX Requirements

### Interaction Model
- **Drag** component from the Resources panel to place on the canvas grid
- **Click outgoing port** on a component, then **click incoming port** on another to create a flow connection
- **Click flow line** then press Delete (or right-click → Remove) to remove a connection
- **Click component** to open the Inspector panel
- **Delete key** (or right-click → Remove) removes a selected component and all its connections
- **Start Traffic button** begins the simulation run; no manual stop is needed
- Start Traffic is blocked when architecture is not runnable (no valid path from Users to a terminal service), and a short actionable hint is shown
- Canvas editing (placement, connection, deletion) is only available in design mode, not during simulation
- Touch-friendly: drag-and-drop is the only placement model on all platforms
- The Users node in the starting layout is **fixed** — it cannot be moved or deleted

### Onboarding
- Start each level with a failing preset and one clear objective
- Keep onboarding text brief and embedded in play via the Coach panel
- Use simple verbs: "Fix," "Swap," "Add," "Connect"

### Information Density
- Default view should stay uncluttered
- Advanced info is in the Inspector panel, opened on demand
- Labels remain visible at all times under each component
- Current req/sec (live) and traffic target visible prominently in top bar at all times
- Remaining monthly budget visible in top bar at all times

### Failure Messaging
Tone should be calm, instructive, and specific.

Good example: *"Your DB is handling more requests than it can process."*

Avoid:
- long textbook explanations
- jargon-heavy error text
- punitive or mocking tone

---

## Visual and Art Direction

**Primary reference:** `image.png` (attached). All visual decisions should be consistent with this reference.

Note: the reference image shows a "Connect" mode button in the toolbar. This has been replaced by port-based connections; no Connect mode button should appear in the final UI.

### Visual Characteristics
- clean flat illustration
- dark navy outlines
- soft coral/red accents
- warm off-white background
- rounded rectangles and simple geometry
- friendly, educational, modern feel
- minimal shading
- icon-led representation

### Component Representation Principles
- Icons should be representative, not abstract to the point of confusion.
- Labels must remain visible below icons: **Cache**, **DB**, **Server**.
- Component cards/nodes should feel clean and modern, not skeuomorphic.
- Connection ports are small circles on component edges, visible on hover or always-on.

### Map Style
- Blank field with subtle dotted-grid pattern
- Plenty of whitespace
- Components spaced clearly
- Flows visually legible at a glance

### Flow Style
- React Flow animated edges; light, directional connection lines
- When a node is overloaded, incoming edges thicken and crowd toward it

### Overload Visualisation
- Coral/red fill on the overloaded node
- Pulse or halo effect
- Crowding of incoming flow lines

---

## Educational Design Principles

1. **Concrete before abstract** — show what breaks first, explain second.
2. **Minimal terms at first** — introduce only what the player needs now.
3. **Visible causality** — the player should see exactly where the system is struggling.
4. **Short explanations** — one or two lines, never a wall of text.
5. **Recovery is part of learning** — let the player rework the design quickly after failure.

---

## Content Scope for v1

### Concepts to Include
- server
- database
- cache
- basic scaling (multiple servers)
- load balancing
- bottlenecks
- traffic growth

### Concepts to Defer
- queues / background jobs
- sharding
- multi-region failover
- eventual consistency nuance
- distributed consensus
- DDoS/security depth
- advanced observability

---

## Functional Requirements

1. The system must render a dotted-grid map as the primary playfield with grid snapping.
2. The system must allow players to drag components from the Resources panel onto the map.
3. The system must allow components to be connected via port clicks (outgoing → incoming).
4. The system must simulate traffic as a request rate (req/sec) that grows **linearly** from a level-defined starting rate to a peak rate over the simulation duration.
5. The system must calculate load for each node and drop excess requests when overloaded.
6. The system must visually mark overloaded components (red/coral state).
7. The system must display persistent labels under all placed components.
8. The system must provide an Inspector panel per component showing req/sec, capacity, load %, latency, and monthly cost.
9. The system must gradually unlock components and mechanics based on defined trigger conditions.
10. The system must allow deletion and replacement of non-fixed components and connections at any time in design mode.
11. The system must enforce a per-level monthly infrastructure budget; placement must be blocked when the budget would be exceeded.
12. The system must display remaining budget and total monthly cost of placed components in the top bar at all times.
13. The system must display current live req/sec rate prominently in the top bar during simulation.
14. The system must display the traffic target (req/sec) for the active level alongside the live rate.
15. The system must complete a level when the architecture sustains the target req/sec for a continuous 10-second window with zero dropped requests.
16. The system must auto-save progress to localStorage on level completion.
17. The system must display an end-of-level screen with a score and educational feedback when the win condition is met.
18. The system must load each level from an authored **failing** starting layout and reset session state correctly on continue/replay.
19. The system must resume at the first incomplete level on startup using local progress.
20. The system must display active level number/title, objective text, and traffic target during gameplay.
21. The system must provide a level progression selector with replayable completed levels and visibly locked future levels.
22. The system must prevent simulation from starting when the architecture is not runnable and show a concise guidance message.
23. The system must display the Resources panel with each available component's name, monthly cost, capacity, and one-line description; the Users node must not appear in the Resources panel.
24. The system must run as a responsive HTML5 browser experience on modern mobile and desktop browsers in portrait and landscape orientations.

---

## Success Metrics (v1)

- Levels completed (tracked locally, displayed in-game)
- Percentage of players who meet the Level 1 traffic target
- Percentage of players who successfully fix the first overload and continue to Level 2

Analytics infrastructure is deferred to post-v1.

---

## Risks

1. The game becomes too abstract and loses clarity.
2. The game becomes too educational and loses fun.
3. Too much UI/data overwhelms beginners.
4. Failure feels punitive instead of instructive.
5. Technical icons become too generic to understand at a glance.
6. Port-based connection UX is unclear on first use — players may not discover ports without a hint.
7. Failing start states confuse players who don't understand what is wrong — coach messages and the Inspector must make the problem obvious immediately.
8. Budget constraints may frustrate players who hit the limit before finding the right solution — level budgets must be carefully tuned to allow at least one valid architecture.

---

## Open Questions

None remaining for MVP.

---

## MVP Acceptance Criteria

The MVP is successful if:
- a new player opens Level 1 and immediately sees an overloaded component in the preset layout,
- the Inspector panel and coach message make the problem clear without prior knowledge,
- the player fixes the architecture within the budget constraint,
- presses Start Traffic and watches the system handle the linear traffic ramp,
- sees the live req/sec rate rise and sustain the target for 10 seconds with no drops,
- receives the end-of-level screen naming the concept they demonstrated,
- and continues to a slightly more complex failing scenario.
