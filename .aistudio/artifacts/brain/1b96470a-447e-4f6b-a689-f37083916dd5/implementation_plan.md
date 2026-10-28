# Implementation Plan - Scroll-Driven 4-Tabs to UniWork Showcase

## User Request
Transform the currently auto-looping 4-tabs showcase (`UnifiedWorkspaceShowcase`) into a **scroll-driven interactive experience**: as the user scrolls down the page, the 4 tabs blossom and form into UniWork dynamically based on scroll position instead of looping automatically.

---

## Proposed Architecture & Technical Design

### 1. Scroll Progress Tracking (`useScroll` or `IntersectionObserver`)
- Attach a scroll listener or reference container to the showcase viewport (`UnifiedWorkspaceShowcase`).
- Compute normalized scroll progress `p` (from `0.0` to `1.0`) as the showcase section scrolls through the viewport (using `getBoundingClientRect()` or Framer Motion `useScroll`).

### 2. Scroll-Linked Animation Mapping (`p` from 0 to 1)
Instead of relying on `requestAnimationFrame` with elapsed time (`elapsed / duration`), drive the exact same cinematic keyframe interpolation using scroll progress `p`:
- **Phase 1 (Scroll `0.0` to `0.35`) - Horizontal Rest to Outward Blossom**:
  - Tabs start in a clean horizontal lineup (`getInitialSlotX`).
  - As scroll progresses, tabs smoothly translate outward into their 4 cardinal directions (Calendar, Tasks, Targets, Focus Room).
- **Phase 2 (Scroll `0.35` to `0.70`) - Inward Vortex & Convergence**:
  - Tabs accelerate inward toward the center point with rotational and scale dynamics.
- **Phase 3 (Scroll `0.70` to `1.0`) - UniWork Logo Formation & Reveal**:
  - The 4 tabs merge/disperse as the central UniWork logo scales up and locks into confidence view.

### 3. Bidirectional & Fluid Responsiveness
- Allowing users to scroll down (formation) and scroll up (un-formation) smoothly.
- Ensuring zero layout shift (CLS) and buttery smooth 60fps performance via CSS transforms (`translate3d` and `scale`).

---

## Implementation Steps

1. **Refactor `UnifiedWorkspaceShowcase.tsx`**:
   - Replace timer-based `startTimeRef` animation loop with scroll-driven progress calculation (`window.scrollY` / section bounding rect).
   - Bind tab positions, opacities, and logo scale directly to the scroll progress `p`.
2. **Review & Test**:
   - Verify smooth scrolling behavior in browser preview.
   - Confirm responsive scaling on Mobile, Tablet, and Laptop viewports.
