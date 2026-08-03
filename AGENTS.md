# AGENTS.md

## Product intent

Build Pizza Promo Pro as a production-quality, cross-platform Electron application for non-technical pizza shop owners and managers. Favor plain-English workflows, local-first behavior, working software, and narrowly scoped changes.

## Required boundaries

- Use Electron main, preload, and renderer processes.
- Keep `nodeIntegration` disabled and `contextIsolation` enabled.
- Use sandboxing where compatible.
- Never expose unrestricted `ipcRenderer` or Node.js APIs to the renderer.
- Keep database, file-system, credential, backup, publishing, and provider operations outside the renderer.
- Define shared typed IPC contracts and validate every request and response with Zod.
- Keep business logic out of React components.
- Store structured data in SQLite and media files under Electron's user-data directory.
- Store file paths and metadata in SQLite, not large media blobs.
- Never hard-code or expose secrets.
- Never invoke live social or media-generation services in automated tests.

## Milestone-one constraints

Use Electron 43, Electron Vite 5, Tailwind CSS 4, Drizzle ORM, and Node's built-in `node:sqlite`. Implement only mock media-generation and mock social-publishing providers. Do not begin live Higgsfield or social-platform integrations.

Mocked features must be visibly labeled. Do not add controls that appear functional when no behavior exists.

## Content safeguards

Never invent prices, hours, ingredients, promotions, coupon codes, awards, allergens, testimonials, or health and dietary claims. Prices must come from menu or promotion records; hours must come from location records; coupon codes and promotion dates must be validated. Create a separate content variant per platform. Never publish newly generated media automatically.

## Working method

1. Read the project documentation and current task list before editing.
2. Work on one independently testable task at a time.
3. Keep changes simple and limited to the requested scope.
4. Preserve existing work and never delete it without explicit approval.
5. Run type checking, linting, and relevant tests after meaningful changes.
6. Fix failures before claiming completion.
7. Keep `TASKS.md` current and record architectural choices in `DECISIONS.md`.
8. Verify behavior and report exact commands and results.

## Completion report

Report what changed, architectural decisions, migrations, IPC channels, security protections, tests and results, packaging targets, known limitations, and the exact next recommended task.
