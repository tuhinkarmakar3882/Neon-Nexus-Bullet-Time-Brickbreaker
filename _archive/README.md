# Archive (safe to delete)

This folder holds **unused or superseded** artifacts from the pre–Next.js shell (Vite SPA, npm lockfile, old build output). Nothing here is imported by the current app (`pnpm run build` → `out/`).

| Path | What it was |
|------|-------------|
| `legacy/` | Original canvas prototype (reference only) |
| `package-lock.json` | npm lockfile; project uses **pnpm** (`pnpm-lock.yaml`) |
| `dist-vite-build/` | Old Vite `dist/` output (gitignored; move local `dist/` here before deleting) |

You may delete the entire `_archive/` directory once you no longer need historical reference. Update doc links that pointed at `legacy/` to note it lived here.
