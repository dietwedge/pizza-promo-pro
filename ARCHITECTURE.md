# Architecture

## System shape

Pizza Promo Pro is a modular monolith packaged as an Electron desktop application. Features share one application and local database while retaining clear module boundaries.

## Process model

### Main process

Owns privileged operations:

- Window lifecycle and navigation policy
- SQLite connection, Drizzle repositories, and migration runner
- Media import and application-controlled file storage
- Backup and restore
- Secure token storage when live integrations are added
- Provider and publishing adapters
- Audit logging and update orchestration

### Preload process

Exposes a narrow, typed API through `contextBridge`. Each method maps to an approved IPC operation. It does not expose raw `ipcRenderer`, generic send/invoke methods, filesystem primitives, or credentials.

### Renderer process

Contains the React interface, forms, view models, and TanStack Query integration. It has no direct Node.js or database access. React components call application services/hooks, not persistence or provider implementations.

### Shared contracts

A shared directory owns Zod schemas and TypeScript types for IPC requests, responses, errors, entity identifiers, and content status transitions. Main and renderer code derive types from the same schemas. Both request and response payloads are validated at the boundary.

## Modules

- Business: business profile and locations
- Brand: brand profile and enforceable content rules
- Menu: categories, items, pricing, and linked media
- Promotions: offers, dates, and coupon validation
- Campaigns: content initiatives and related items
- Content: ideas, platform variants, approval, and status transitions
- Media: import, metadata, generation jobs, and outputs
- Calendar: scheduled-content views and placement
- Publishing: provider-neutral publisher and attempt history
- Settings: local preferences and internet-feature indicators
- Backup: local backup/restore records and validation
- Audit: security-sensitive and material workflow actions

Modules separate domain logic, persistence, IPC handlers, and UI concerns. Cross-module access should flow through explicit services rather than direct table access from UI code.

## Provider interfaces

`MediaGenerationProvider` is provider-neutral. Milestone one supplies `MockMediaGenerationProvider`. A main-process Streamable HTTP client can initialize the saved Higgsfield MCP endpoint and discover its advertised tools, but it cannot execute them; live generation remains reserved for a later, supervised provider adapter.

`SocialPublisher` is provider-neutral, with one future adapter per platform. Milestone one supplies `MockSocialPublisher`. Publishing requires approval by default, an idempotency key, and a persisted attempt/result record.

Settings includes a provider connection center. Narrow IPC handlers manage sanitized social-account metadata and Higgsfield MCP configuration. Secrets are encrypted in a separate OS-bound credential vault; the renderer receives only whether a secret exists. Higgsfield verification performs an MCP initialization and `tools/list` exchange in the main process with a strict timeout, no redirects, and bounded responses. It never invokes a discovered tool.

`ContentAgent` is a provider-neutral supervised drafting boundary. It receives a main-process factual context containing only saved business, location, menu, promotion, and brand data. Agent output is persisted as `draft`, records its source IDs, and always requires the existing human review transition. The agent has no credential, media-execution, scheduling, approval, or publishing capability.

Application updates are owned by the Electron main process through `electron-updater`. The renderer can read status and request check, download, or restart actions only through validated IPC contracts. Production builds use GitHub Releases; development builds disable network update checks.

`AiModelProvider` powers advisory chat separately from the drafting agent. `MockAiModelProvider` stays fully local, the OpenAI adapter uses the Responses API, and the OpenAI-compatible adapter uses chat completions. API calls originate only in the main process. Conversation history is local SQLite data, while API keys remain in the OS-encrypted credential vault.

Ollama is a first-class local adapter using its native `/api/chat` endpoint with non-streaming responses. The default local server is `http://localhost:11434`; local Ollama requires no API key. Installed models are discovered through `/api/tags`.

## Content lifecycle

`idea -> draft -> media_generation -> ready_for_review -> approved -> scheduled -> published | failed -> archived`

Transitions are enforced in domain services, not inferred solely from UI state. Approval events and publishing attempts are append-only records.

## Local-first behavior

Core planning, editing, review, calendar, and media-library work remains available offline. Features requiring internet access must be identified in the interface. Provider outputs are downloaded to application-controlled local storage before they become media assets.

## Updates and packaging

An update service sits behind an interface. Windows and macOS may check for updates in a later milestone; Linux follows package-manager or manual-update behavior. The application must never restart for an update while edits are unsaved.

electron-builder targets Windows NSIS, macOS DMG/ZIP, and Linux AppImage/DEB. CI uses native Windows, macOS, and Linux runners and produces draft releases until signing and publishing are explicitly enabled.
