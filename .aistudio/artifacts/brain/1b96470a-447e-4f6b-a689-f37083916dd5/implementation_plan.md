# Comprehensive Implementation Plan: UniWork Fluid Responsive Design System

## Overview
Build and apply a robust fluid responsive design system across UniWork's About page and showcase components. This ensures smooth scaling from 320px mobile up to 1920px ultra-wide screens, adhering strictly to CSS `clamp()`, max-width containment (`72rem`), automatic grid layouts below 1024px, and **zero horizontal overflow without resorting to `overflow-x: hidden` on body or html**.

---

## 1. Design System Additions (`src/index.css`)
- **CSS Custom Properties (`:root`)**:
  - `--max-w: 72rem;` (1152px max content width)
  - `--text-hero: clamp(2.5rem, 5vw + 1rem, 4.5rem);`
  - `--text-h2: clamp(1.85rem, 3vw + 0.75rem, 3rem);`
  - `--text-h3: clamp(1.25rem, 2vw + 0.5rem, 2rem);`
  - `--text-body: clamp(1rem, 0.4vw + 0.875rem, 1.125rem);` (Never smaller than 1rem)
  - `--section-py: clamp(3rem, 6vw, 6rem);`
  - `--container-px: clamp(1rem, 3vw, 2rem);`
- **Utility Classes**:
  - `.text-hero`: `font-size: var(--text-hero);`
  - `.text-h2`: `font-size: var(--text-h2);`
  - `.text-h3`: `font-size: var(--text-h3);`
  - `.text-body`: `font-size: var(--text-body); line-height: 1.6;`
  - `.section`: `padding-top: var(--section-py); padding-bottom: var(--section-py);`
  - `.container`: `width: 100%; max-width: var(--max-w); margin-left: auto; margin-right: auto; padding-left: var(--container-px); padding-right: var(--container-px); box-sizing: border-box;`
  - `.auto-grid`: `display: grid; grid-template-columns: repeat(auto-fit, minmax(min(16rem, 100%), 1fr)); gap: 1.5rem; width: 100%; box-sizing: border-box;`

---

## 2. Component Integration & Fluid Refactoring

### A. `LiquidInkText.tsx`
- Replace fixed text sizing with `.text-hero` and fluid variables.
- Ensure intrinsic sizing handles narrow viewports without clipping.

### B. `UnifiedWorkspaceShowcase.tsx`
- **Breakpoint Switch (< 1024px vs >= 1024px)**:
  - Below `1024px`, replace the scroll-driven orbital/blossom animation with a clean static `.auto-grid` displaying the four core items (Calendar, Tasks, Targets, Focus Room) in a responsive grid.
  - At `1024px` and above, retain the desktop scroll-driven animation design.
- **Layout Adjustments**:
  - Replace fixed heights (`min-h-[380px]`, etc.) with intrinsic fluid spacing (`.section`, `.container`).
  - Wide screens: Side-by-side layout (shorter section height).
  - Narrow screens: Stacked vertical layout (taller intrinsic height).

### C. `AboutView.tsx` & `CompetitorComparison.tsx`
- Replace hardcoded text sizes (`text-[11px]`, `text-3xl sm:text-4xl lg:text-[40px]`) and fixed heights (`h-[620px]`, `min-h-[100dvh]`) with `.text-hero`, `.text-h2`, `.text-h3`, `.text-body`, `.section`, and `.container`.
- Ensure all grid layouts and flex wrappers use responsive auto-wrapping (`flex-wrap`, `grid-template-columns`).

---

## 3. Strict Overflow & Viewport Rules
- **No `overflow-x: hidden` on `body` or `html`**:
  - Prevent horizontal scrolling across all required viewports (320px, 375px, 414px, 768px, 1024px, 1280px, 1920px) purely through intrinsic box sizing (`box-sizing: border-box`), max-width constraints (`max-width: 100%`), and fluid padding.
- **Very Wide Screens (>= 1280px / 1920px)**:
  - Content stays perfectly centered at `--max-w: 72rem` with matching desktop fidelity.
