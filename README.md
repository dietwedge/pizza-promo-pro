# Pizza Promo Pro

Pizza Promo Pro is a local-first desktop application for pizza shop owners and managers to organize business information, plan campaigns, create platform-specific content, manage media, review approvals, and prepare a publishing calendar.

Milestone one delivers the secure Electron foundation and local content-management workflow. Media generation and social publishing are mocked; the application does not connect to live provider or social accounts.

## Technology

- Electron 43 with Electron Vite 5
- TypeScript and React
- Tailwind CSS 4 and shadcn/ui
- SQLite through Node's built-in `node:sqlite`
- Drizzle ORM with versioned migrations
- Zod, React Hook Form, and TanStack Query
- Vitest, React Testing Library, and Playwright
- electron-builder

## Architecture at a glance

The application uses Electron's main, preload, and renderer process boundaries. The renderer has no direct Node.js access. Database, file-system, credential, backup, provider, and publishing operations belong in the main process and are exposed through narrow typed preload APIs. IPC inputs and outputs are validated with Zod.

See [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), and [SECURITY.md](SECURITY.md) for the governing design.

## Current product capabilities

- Customer-owned AI providers, Ollama, supervised chat, and grounded content production
- Secure organic social setup, official Higgsfield browser login and workspace selection, plus advanced custom MCP verification
- Supervised Higgsfield image/video generation with a live model catalog, quality and budget choices, live credit estimates, explicit spend confirmation, protected local downloads, and human review
- Review-first public menu URL importing with editable extracted items and verified prices
- Visible Content Studio creation results with brief editing, platform-draft rebuilding, and confirmed deletion
- Persistent scheduling with supervised mock publishing and retry history
- Platform proofing desk with editable variants, character counters, factual-risk warnings, and approval locks
- Unified organic and paid performance reporting with source, freshness, spend, conversion, and return labels
- First-run readiness setup and job-grouped navigation for growing workspaces
- Separate paid-media accounts for Meta, Google/YouTube, TikTok, and X
- Locked campaign drafts with proposed budgets, audiences, placements, approved creative, and second human approval

Live organic publishing and live advertising mutations remain disabled until each provider adapter and authorization flow is implemented and verified.

## Milestone-one scope

- Business, location, brand, menu, promotion, and campaign management with edit and delete controls
- Local media importing into application-controlled storage
- Content workflow and platform-specific variants
- Calendar shell, settings, and local backup/restore
- Mock media-generation and social-publishing providers
- Unit, IPC integration, and Electron smoke tests
- Cross-platform packaging configuration and CI build matrix

Live social publishing, production analytics collection, signing, and notarization are explicitly out of scope. Official Higgsfield OAuth connection and supervised image/video generation are implemented; every paid job requires a live credit estimate and explicit customer confirmation, and outputs remain review-only.

## Development

Use the package scripts defined in `package.json` for development, type checking, linting, testing, packaging, and migrations. Copy `.env.example` to a local environment file only if development overrides are needed. Never commit credentials or tokens.

Automated tests must use mock providers and must never call live social or media-generation APIs.

## Sales landing page

The dependency-free sales site lives in `website/`. It is separate from the native Electron product and can be deployed to any static host. Set the one-time price and Square Payment Link in `website/site-config.js`; see `website/README.md` for preview and deployment instructions.

## Supported targets

- Windows x64: NSIS
- macOS Apple Silicon and Intel: DMG and ZIP
- Linux x86_64: AppImage and DEB

Build each platform on its native CI runner. Draft releases remain the default until code signing and publishing are explicitly enabled.

## Automatic application updates

Installed production builds check GitHub Releases shortly after launch and every four hours while running. New versions download in the background, then Settings offers a **Restart and update** action. Development builds never contact the update service.

To publish an update:

1. Update `version` in `package.json` and `package-lock.json`.
2. Commit and push the change to GitHub.
3. Create and push a matching tag such as `v0.2.0`.

The `Publish desktop release` workflow verifies the application and publishes the Windows installer, block map, and `latest.yml` to GitHub Releases. The repository must be public for customer update checks unless a separate authenticated update service is added. For trusted production installation and seamless updates, add the Windows code-signing certificate as the `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD` repository secrets.

## Documentation

- [AGENTS.md](AGENTS.md): contributor and agent rules
- [ARCHITECTURE.md](ARCHITECTURE.md): process boundaries and module design
- [DATABASE.md](DATABASE.md): local data model and migration policy
- [SECURITY.md](SECURITY.md): threat controls and secure defaults
- [DECISIONS.md](DECISIONS.md): accepted architectural decisions
- [TASKS.md](TASKS.md): implementation status

## Current limitation

All provider activity in milestone one is clearly labeled as simulated. Generated assets and publishing outcomes are local test data and are never sent to external services.
