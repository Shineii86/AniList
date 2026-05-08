# Changelog

All notable changes to this project will be documented in this file.

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
