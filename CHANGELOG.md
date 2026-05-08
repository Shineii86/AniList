# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] - 2026-05-08

### Changed
- **Complete UI/UX overhaul** with 2026 trending design patterns
- Rewrote entire `style.css` (64KB) with modern design system:
  - OKLCH color space for vibrant, perceptually uniform colors
  - Fluid typography using `clamp()` — responsive without breakpoints
  - Glassmorphism 2.0: glass backgrounds, backdrop-filter blur, frosted surfaces
  - Gradient mesh animated background (4 radial gradients + noise texture)
  - 3D perspective card tilt on hover (rotateX/Y with spring easing)
  - Animated gradient primary buttons with glow shadows
  - Gradient text on headings (text → primary blend)
  - Spring-physics easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`) throughout
  - Pill-shaped search input with glass background
  - Glass modals, drawers, toasts, and panels
  - Custom scrollbar styling with gradient thumb
  - Styled text selection with primary tint
  - Layered shadow system (xs → xl + glow variants)
  - Rounded-full nav links, tabs, badges, chips
- Upgraded hero carousel: cinematic 480px height, parallax scroll, zoom-on-hover
- Upgraded modal: glass backdrop, scale-in animation, 90° rotate close button
- Upgraded toast: glass background, gradient progress bar, spring slide-in
- Upgraded genre/studio/seasonal cards: glass + lift + glow on hover
- Upgraded loading spinner: glow shadow
- Upgraded skeleton loader: smoother shimmer animation
- Updated `index.html` to load Inter + JetBrains Mono fonts from Google Fonts

### Added
- `src/interactions.js` — micro-interactions module:
  - 3D card tilt: perspective transform follows cursor position
  - Button ripple: radial gradient flash on click
  - Section reveal: staggered fade-up on scroll (IntersectionObserver)
  - Counter animation: stat numbers animate from 0 to target
  - Hero parallax: background shifts on scroll
  - Keyboard nav: arrow keys navigate anime card grids
- Inter (400–800) and JetBrains Mono font loading via Google Fonts

## [2.0.0] - 2026-05-08

### Changed
- **Modularized `app.js`** into 8 ES module files under `src/` for better maintainability:
  - `src/config.js` — API configuration, constants, GraphQL queries
  - `src/api.js` — API fetch layer with cache
  - `src/state.js` — global state, localStorage, user lists
  - `src/utils.js` — DOM helpers, toast, debounce, utilities
  - `src/components.js` — anime card and detail HTML builders
  - `src/pages.js` — page loaders (home, search, browse, rankings, lists)
  - `src/modal.js` — anime detail and list management modals
  - `src/carousel.js` — hero carousel logic
  - `src/app.js` — main entry point, event wiring, init
- Updated `index.html` to use `<script type="module">` with `src/app.js`
- Made `YEARS` array dynamic — uses `new Date().getFullYear()` instead of hardcoded 2025

### Added
- `.gitignore` — proper ignore rules for node_modules, build output, IDE files, OS files
- `CHANGELOG.md` — this file, tracking all notable changes
