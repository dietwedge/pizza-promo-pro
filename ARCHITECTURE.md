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

`MediaGenerationProvider` is provider-neutral. The mock provider remains available for deterministic testing. The supervised Higgsfield path intersects a curated, validated set of image and video profiles with the provider's live model catalog. GPT Image 2 and Seedance 2.0 remain quality defaults, while Nano Banana, Z Image, Kling, Seedance 1.5, and Veo Lite provide budget and specialist choices. A model or format change invalidates the prior estimate; generation re-estimates the exact selected profile before running the official CLI and downloading the result into application-controlled storage. Jobs and outputs use the existing persistence tables and always return content to human review. The advanced Streamable HTTP client remains discovery-only and never executes custom MCP tools.

`SocialPublisher` is provider-neutral, with one future adapter per platform. Milestone one supplies `MockSocialPublisher`. Publishing requires approval by default, an idempotency key, and a persisted attempt/result record.

Settings includes a provider connection center. The official Higgsfield CLI is bundled as an unpacked, executable application resource and launched only through fixed, narrowly validated main-process commands. It owns OAuth credentials; Pizza Promo Pro never reads `auth token` or returns credentials through IPC. The app exposes signed-out, workspace-required, and ready states plus workspace IDs/names. Generic remote MCP remains an advanced integration: its secrets use the OS-bound vault and verification performs only initialization and `tools/list`, never tool execution.

`ContentAgent` is a provider-neutral supervised drafting boundary. It receives a main-process factual context containing only saved business, location, menu, promotion, and brand data. Agent output is persisted as `draft`, records its source IDs, and always requires the existing human review transition. The agent has no credential, media-execution, scheduling, approval, or publishing capability.

Application updates are owned by the Electron main process through `electron-updater`. The renderer can read status and request check, download, or restart actions only through validated IPC contracts. Production builds use GitHub Releases; development builds disable network update checks.

`AiModelProvider` powers advisory chat separately from the drafting agent. `MockAiModelProvider` stays fully local, the OpenAI adapter uses the Responses API, and the OpenAI-compatible adapter uses chat completions. API calls originate only in the main process. Conversation history is local SQLite data, while API keys remain in the OS-encrypted credential vault.

Ollama is a first-class local adapter using its native `/api/chat` endpoint with non-streaming responses. The default local server is `http://localhost:11434`; local Ollama requires no API key. Installed models are discovered through `/api/tags`.

## Content lifecycle

`idea -> draft -> media_generation -> ready_for_review -> approved -> scheduled -> published | failed -> archived`

Transitions are enforced in domain services, not inferred solely from UI state. Approval events and publishing attempts are append-only records.

Content Studio creation returns the newly persisted item, highlights it in the list, and scrolls it into view. Editing a draft brief rebuilds its platform variants from the same verified source links and resets the item to draft. Deletion requires an explicit UI confirmation plus a literal IPC confirmation; relational children are removed by database cascades.

## Menu URL import

The main process fetches public HTTP/HTTPS menu pages only. It identifies Clover, Square, Slice, and Toast by exact storefront hostname and retains a provider-neutral path for independent sites. It rejects embedded credentials, localhost, private/link-local addresses, unsafe redirects, non-HTML/JSON responses, responses above 2 MB, and requests over 15 seconds. Schema.org `MenuItem` and `Product` data is preferred. For Clover's current Next.js storefront, the parser reads the streamed public `menu` payload without running page code, preserves integer cent prices, and excludes items marked unavailable. Square, Slice, Toast, and independent public pages use the same standards-based and conservative visible-price extraction path when their customer-facing page exposes menu data. Extracted items return as an editable preview, and missing prices remain blank. Only selected items with user-verified prices enter the local menu tables. Account-level catalog synchronization is a separate future adapter because it requires each merchant's authorization and provider approval.

The Promotion Copilot is a narrow structured-output workflow on top of the configured `AiModelProvider`. It sends the promotion goal plus bounded saved business, menu, and brand facts, validates the returned JSON fields, and displays the result as a proposal. Applying a proposal only fills the local form; it cannot set dates, save a promotion, create content, or publish. The deterministic local provider follows the same apply-and-review interaction without network compute.

Completed generation outputs are joined back onto their originating Content Studio item and also listed in the Media Library. Image previews are read on demand through a validated IPC channel from protected app storage; the renderer never receives an arbitrary filesystem path. Inline previews are capped at 25 MB, while larger images and video remain available through the contained operating-system review action. Failed jobs retain their provider-safe error message and return the content item to a retryable draft state.

## Local-first behavior

Core planning, editing, review, calendar, and media-library work remains available offline. Features requiring internet access must be identified in the interface. Provider outputs are downloaded to application-controlled local storage before they become media assets.

## Updates and packaging

An update service sits behind an interface. Windows and macOS may check for updates in a later milestone; Linux follows package-manager or manual-update behavior. The application must never restart for an update while edits are unsaved.

electron-builder targets Windows NSIS, macOS DMG/ZIP, and Linux AppImage/DEB. CI uses native Windows, macOS, and Linux runners and produces draft releases until signing and publishing are explicitly enabled.
