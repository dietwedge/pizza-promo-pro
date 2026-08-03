# Architectural Decisions

This file records accepted decisions. Add new entries rather than silently changing earlier decisions; mark superseded decisions explicitly.

## ADR-014: Native desktop distribution is permanent

**Status:** Accepted

Pizza Promo Pro will remain a native Electron desktop application. A browser edition, progressive web app, hosted trial, or web-based substitute is explicitly outside the product strategy. The marketing website and Square can sell and provision the software, but the product itself is downloaded and runs locally.

Product viability testing must use the native desktop build. Direct website sales and Windows installer trust are separate concerns, and signing or installer-warning decisions must be handled within the desktop distribution strategy rather than by changing platforms.

## ADR-001: Electron modular monolith

**Status:** Accepted

Pizza Promo Pro is a modular monolith using Electron's main, preload, and renderer processes. This keeps deployment simple while preserving feature boundaries and secure privilege separation.

## ADR-002: Electron 43 and Electron Vite 5

**Status:** Accepted

The milestone-one foundation uses Electron 43 and Electron Vite 5 with TypeScript and React. The renderer does not use Next.js and has no direct Node.js access.

## ADR-003: Tailwind CSS 4 and shadcn/ui

**Status:** Accepted

The renderer uses Tailwind CSS 4 with shadcn/ui primitives for a clean, accessible, maintainable desktop interface. Product language remains plain English for non-technical users.

## ADR-004: SQLite through node:sqlite and Drizzle ORM

**Status:** Accepted

Core data is stored locally in SQLite. Drizzle provides typed schemas and versioned migrations; Electron's Node runtime supplies the built-in `node:sqlite` driver, avoiding an additional native SQLite dependency. Compatibility must be verified against the pinned Electron runtime.

## ADR-005: Typed, schema-validated IPC

**Status:** Accepted

Shared Zod schemas define every IPC request and response. The preload exposes only narrow feature methods through `contextBridge`. Raw `ipcRenderer` is never exposed.

## ADR-006: Application-controlled media storage

**Status:** Accepted

Imported and generated media is copied into managed directories under Electron's user-data path. SQLite contains paths and metadata, not large media blobs. Import and restore paths are sanitized and traversal-protected.

## ADR-007: Provider-neutral interfaces with mocks first

**Status:** Accepted

Media generation and social publishing are accessed through `MediaGenerationProvider` and `SocialPublisher` interfaces. Milestone one implements only `MockMediaGenerationProvider` and `MockSocialPublisher`. Live Higgsfield and social adapters are deferred and automated tests never use live APIs.

## ADR-008: Approval and idempotency by default

**Status:** Accepted

Generated media cannot publish automatically. Publishing requires human approval by default, uses an idempotency key, and records every attempt and result.

## ADR-009: Native cross-platform builds and draft releases

**Status:** Accepted

electron-builder targets Windows NSIS, macOS DMG/ZIP, and Linux AppImage/DEB. GitHub Actions builds on native Windows, macOS, and Linux runners. Releases remain drafts until signing, notarization, and publishing are explicitly enabled.

## ADR-010: Local-first offline capability

**Status:** Accepted

Business data, content planning, editing, review, calendar work, and media organization remain usable offline. Internet-dependent features must be clearly identified and fail without corrupting local work.

## ADR-011: Paid media uses separate permissions and approval

**Status:** Accepted

Advertising accounts are distinct from organic social connections. The local foundation supports read-only reporting readiness and campaign-draft preparation only; it exposes no launch operation and performs no live provider calls. A draft can reference only approved content, and campaign approval requires separate confirmation of both the budget and the fact that approval does not launch delivery. Approved drafts are immutable so budget or delivery changes require a new approval cycle.
# Paid media is a separate authority boundary

Organic publishing connections and advertising accounts are stored and authorized separately. Paid-media integrations begin with local drafts and read-only reporting. Creating or changing live campaigns, audiences, bids, or budgets requires provider-specific approval plus a second explicit human approval inside the app. No AI component may supply that approval.

## ADR-012: Unified, provenance-labelled performance snapshots

**Status:** Accepted

Organic posts and paid campaign drafts share one append-only reporting model without a cross-table foreign key. Every snapshot carries its source type, source identifier, capture time, and data source. Local sample generation is deterministic, idempotent, and limited to existing published posts and approved ad drafts. Live reporting remains disabled until provider-specific read-only adapters are implemented.

## ADR-013: Derived onboarding readiness

**Status:** Accepted

First-run guidance is derived from usable local records instead of duplicating setup state in a mutable checklist. Only dismissal is stored in `app_settings`. The renderer receives completion state and navigation targets, never provider configuration values or credentials. Business, location, brand, and active menu facts are essential; provider and account connections remain recommended or optional.
