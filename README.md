# SimExerciser

An interactive facilitator/participant simulator prototype built with React and Vite. The app is defined primarily in `src/App.tsx` and rendered via `src/index.tsx`.

## Code layout
- `src/App.tsx` holds the full facilitator/participant experience in a single file. It includes the inject timeline, participant inboxes, MELT table view, acknowledgement tracking, world-state panel, exercise lifecycle controls, recall logic, per-inject evaluation, and the new scenario phase assignment surfaced in MELT and detail views.
- `src/index.tsx` mounts the `App` component into the Vite entry point.
- `vite.config.ts`, `tsconfig*.json`, and `index.html` provide the minimal tooling to run the single-file prototype locally.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the dev server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
