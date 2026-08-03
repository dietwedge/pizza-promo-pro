# Pizza Promo Pro — Milestone One Plan

## Goal

Ship a secure, local-first Electron desktop MVP for managing pizza-business information, media, campaigns, content review, scheduling, backups, and deterministic mock provider workflows on Windows, macOS, and Linux.

## Assumptions

- The empty workspace is intentional and this is a greenfield build.
- Milestone one uses mocked media generation and social publishing only; no live provider credentials or network calls.
- Electron 43, electron-vite 5, Node 22 LTS tooling, React, Tailwind 4, Drizzle, and Electron's built-in `node:sqlite` will be used.
- macOS x64 and arm64 artifacts will be built separately.
- All required local entities will be created in the initial versioned migration, even when some are only exercised by mock workflows in this milestone.
- The application has one primary business workspace in milestone one, while the schema keeps business IDs explicit for future expansion.

## Risks

- Electron 43 and `node:sqlite` are current technology choices; packaging and Drizzle compatibility must be proven early.
- Electron sandboxing can conflict with preload capabilities if APIs are not kept narrow.
- Backup/restore must preserve database consistency and media files without allowing path traversal.
- Cross-platform installers can only be proven reliably on their native CI runners.
- The scope is large; each phase must remain independently runnable and tested.

## Design direction

- Subject: a pizza shop owner's daily content operations desk.
- Palette: Flour `#F7F3EA`, Ink `#20201E`, Tomato `#D94B32`, Basil `#427A4B`, Steel `#687078`, Mozzarella `#FFFDF8`.
- Type: Fraunces for restrained section character, Inter for interface copy, JetBrains Mono for statuses and dates, with local/system fallbacks for offline reliability.
- Layout: persistent left navigation, compact context header, and a calm working canvas optimized for forms, queues, and calendar views.
- Signature: content moves through a clearly visible “pizza line” status rail, using kitchen workflow language only where it improves comprehension.
- Accessibility: keyboard-visible focus, semantic controls, reduced-motion support, readable contrast, plain-English labels.

## Implementation tasks

- [x] 1. Initialize Git and scaffold Electron Vite + React + TypeScript with exact-pinned dependencies and baseline scripts.
- [x] 2. Add required documentation, environment example, coding conventions, and architecture decisions.
- [x] 3. Build the hardened Electron shell: isolated renderer, restrictive CSP, navigation/window/permission policies, safe external-link handling.
- [x] 4. Build shared Zod IPC contracts, typed context bridge, response envelopes, handler validation, and IPC integration tests.
- [x] 5. Add Drizzle + `node:sqlite`, full schema, migration `0001`, migration runner, constraints/indexes, and database tests.
- [x] 6. Implement repositories and services for business, locations, brand profile/rules, menu, promotions, campaigns, settings, and audit logs.
- [x] 7. Implement the content lifecycle state machine, approval events, scheduling records, platform variants, and legal-transition tests.
- [x] 8. Implement safe local media import into user-data storage with filename sanitization, containment checks, metadata, and audit records.
- [x] 9. Implement provider-neutral media/publishing interfaces plus deterministic mock providers; label all mocked actions in the UI.
- [x] 10. Build the React application shell and CRUD workflows with TanStack Query, React Hook Form, Zod, Tailwind, and reusable accessible components.
- [x] 11. Build content workflow screens, review/approval controls, media library, and calendar shell with offline/internet-required indicators.
- [x] 12. Implement local backup/restore bundles with manifest/checksum validation, staged database restore, and media inclusion.
- [x] 13. Add update-service abstraction and unsaved-change restart guard; document Linux update behavior without enabling live updates.
- [x] 14. Add unit/component coverage, IPC integration coverage, and one Playwright Electron smoke test.
- [x] 15. Configure electron-builder targets and native GitHub Actions build matrix with draft/unsigned artifacts only.
- [x] 16. Run lint, typecheck, unit/integration/component tests, production build, Electron smoke test, and audit the final docs.

## Verification gates

- Secure shell gate: renderer has no Node globals; blocked navigation and malformed IPC tests pass.
- Data gate: a clean profile migrates from zero, CRUD persists across relaunch, and invalid domain data is rejected.
- Workflow gate: only allowed content transitions succeed; publishing requires approval and an idempotency key.
- File gate: imported media and backups cannot escape application-controlled directories.
- UI gate: main workflows are keyboard usable, mocked functionality is explicit, and no dead controls appear functional.
- Release gate: Windows, macOS x64/arm64, and Linux targets are represented in CI; publishing remains disabled.

## Review

Milestone one is implemented as a secure local-first desktop foundation. The repository now contains the Electron main/preload/renderer processes, complete initial SQLite schema and migration, Zod-validated IPC boundary, CRUD data services and plain-English desktop workflows, application-controlled media import, content state machine, deterministic mock providers, calendar shell, backup/restore bundles, update and credential abstractions, native packaging configuration, CI, tests, and required documentation.

Verification completed on Windows x64:

- ESLint: pass.
- TypeScript main/preload/renderer: pass.
- Vitest/RTL/IPC: 11 tests pass across 6 files.
- Playwright Electron smoke test: 1 pass.
- Electron Vite production build: pass.
- electron-builder NSIS x64: pass.
- Production dependency audit: 0 vulnerabilities.

Known limitations:

- Media generation and social publishing are intentionally mocked.
- The calendar is a planning shell; background scheduling is not active.
- macOS and Linux packages are configured but require their native CI runners for proof.
- Installers are unsigned and use Electron's default icon until production branding/signing assets are supplied.
- Analytics tables exist, but live collection is outside milestone one.
- Backup bundle restoration is implemented; broader automated round-trip fixture coverage is the next hardening step.

## Connection center enhancement

- [x] Add secure IPC contracts for connection listing, saving, testing, and removal.
- [x] Store provider metadata locally and secrets only through Electron safeStorage.
- [x] Add social-account setup for all seven prioritized platforms.
- [x] Add Higgsfield MCP endpoint and access-token setup with URL validation.
- [x] Clearly separate configured, verified, and live-provider capability states.
- [x] Add tests, rebuild, and update documentation.

## Stage two — content production

- [x] Add guided content creation grounded in saved menu and promotion facts.
- [x] Generate and persist a separate draft variant for each selected platform.
- [x] Add content review and human-approval transitions with audit history.
- [ ] Add editable platform variants with factual-validation warnings.
- [x] Add media generation jobs and output review using the provider interface.
- [ ] Add scheduling editor and calendar persistence.
- [ ] Add persisted mock publish attempts, results, and retry controls.

## Stage three — supervised Content Producer

- [x] Add a provider-neutral `ContentAgent` interface and deterministic mock implementation.
- [x] Build a strictly scoped factual context package from approved local records.
- [x] Generate reviewable content packages with concepts, variants, media prompts, and suggested timing.
- [x] Show the source facts used by every generated package.
- [x] Prevent agent output from approving, scheduling, or publishing itself.
- [x] Add agent activity audit records and automated safety tests.

## Stage four — customer-owned AI and chat

- [x] Add Local Mock, OpenAI Responses, and OpenAI-compatible provider adapters.
- [x] Add encrypted BYOK model configuration and explicit connection testing.
- [x] Add persistent local AI chat threads and messages through migration `0002`.
- [x] Add a dedicated supervised AI Assistant workspace.
- [x] Add contextual AI entry points on Today and Content Studio.
- [x] Keep chat advisory-only with no approval, scheduling, or publishing authority.
- [x] Add first-class Ollama local chat support and installed-model discovery.

## Desktop bridge repair and Italian palette

- [x] Reproduce the missing secure bridge in the packaged Electron runtime.
- [x] Make the sandboxed preload a self-contained CommonJS bundle.
- [x] Add a clear desktop-only warning when the UI is opened as a browser preview.
- [x] Apply an Italian-flag-inspired red, white, and green palette with black text.
- [x] Verify provider saving, automated tests, and the packaged installer.

Review:

- Root cause was a sandbox-incompatible ESM preload that depended on Node-loaded Zod.
- The preload is now a dependency-free CommonJS bridge with an explicit IPC allowlist; request validation remains enforced in the main process.
- Electron smoke testing proves `window.pizzaSocial.invoke` is available in the desktop runtime.
- Type checks, lint, 22 automated tests, the Electron smoke test, and Windows packaging all pass.

## Stage five — scheduling and supervised publishing

- [x] Add validated IPC contracts for calendar listing, scheduling, publishing, and retrying.
- [x] Persist one scheduled post per approved platform variant and connected social account.
- [x] Replace the calendar shell with a live oven queue and scheduling controls.
- [x] Persist mock publish attempts, successful results, and failure details.
- [x] Add explicit human-triggered publish and retry controls with idempotency protection.
- [x] Add service, contract, component, and Electron smoke coverage.
- [x] Run all verification gates and create an updated Windows installer.

## Stage six — paid media readiness

- [x] Add isolated encrypted ad-account connections for Meta, Google/YouTube, TikTok, and X.
- [x] Show separate setup, read-only, draft, and live-management capability states.
- [x] Add an Ads workspace with locally stored campaign drafts.
- [x] Model objective, budget, audience, placement, and approved content creative.
- [x] Require a second human approval before a campaign can become launch-ready.
- [x] Keep all provider calls and budget mutations disabled in this milestone.
- [x] Add contract, service, UI, and Electron verification coverage.
- [x] Update product documentation and package the Windows installer.

Review:

- Organic and paid-media credentials now have separate encrypted storage keys and database records.
- Campaign drafts can only reuse approved content and become immutable after budget/creative approval.
- The renderer has no live-launch IPC channel; AI and UI controls cannot spend money or mutate provider campaigns.
- Type checks, lint, 27 automated tests, and the Electron smoke test pass.

## Stage seven — editorial variant review

- [x] Add secure variant-update contracts and immutable-state enforcement.
- [x] Add platform character limits and factual-risk validation warnings.
- [x] Build a platform proofing editor with save, cancel, counters, and warning states.
- [x] Require edited reviewed copy to return through review before approval.
- [x] Add domain, contract, UI, and Electron verification coverage.
- [x] Update documentation and package the Windows installer.

Review:

- Draft and ready-for-review variants are editable; approved, scheduled, and published copy is immutable.
- Editing reviewed copy automatically resets the parent content item to draft.
- Validation warns about platform limits and unsupported commercial, operational, award, superlative, dietary, and health claims.
- Auditing stores only character counts and warning codes, never a duplicate of the edited copy.

## Stage eight — performance reporting

- [x] Add unified organic and paid performance snapshots with source/freshness labels.
- [x] Build deterministic local sample collection attached only to real published posts and approved ad drafts.
- [x] Add safe aggregation for reach, engagement, clicks, spend, conversions, and revenue.
- [x] Build a decision-focused Performance workspace with content-level rows.
- [x] Keep live reporting adapters disabled and visibly distinguish sample data.
- [x] Add migration, domain, contract, UI, and Electron verification coverage.
- [x] Update documentation and package the Windows installer.

Review:

- Unified snapshots support organic posts and approved paid campaign drafts without conflating their metrics.
- Deterministic local samples are idempotent and only attach to real eligible records.
- The Performance workspace shows outcomes, content-level attribution, freshness, and source labels.
- Type checks, lint, 37 automated tests, and the Electron smoke test pass.

## Stage nine — onboarding and navigation

- [x] Add persisted first-run state and a secure workspace-readiness summary.
- [x] Define essential setup steps for business, location, brand, and menu facts.
- [x] Add recommended AI, organic account, media provider, and ad-account steps.
- [x] Build a guided Setup workspace with direct links to each destination.
- [x] Automatically show Setup only for unfinished first-run workspaces.
- [x] Group and scroll the sidebar navigation for the expanded product.
- [x] Add contract, readiness, UI, and Electron verification coverage.
- [x] Update documentation and package the Windows installer.

Review:

- First-run readiness is derived from actual local records and exposes no credentials.
- Essential facts are separated from optional provider connections and paid-media setup.
- Setup can be deferred, remains accessible later, and stops replacing Today once dismissed or complete.
- Navigation is grouped by job and scrolls independently for smaller desktop windows.
- Type checks, lint, 42 automated tests, and the Electron smoke test pass.

## Record editing correction

- [x] Add explicit Edit controls to every shared record-management page.
- [x] Prefill forms from stored snake-case records, including local date/time values.
- [x] Preserve record identity on save and prevent accidental duplicate creation.
- [x] Add cancel/selection states and refresh onboarding readiness after changes.
- [x] Add component regression coverage and package the corrected installer.

Review:

- Existing records now open the shared form with stored values and retain their database ID on save.
- Date/time values are converted to the user’s local input format and back to timestamps on save.
- Editing is visibly selected and can be canceled from either the page header or form.
- The regression test proves a business-profile edit sends the original ID with the updated name.

## Product rename — Pizza Promo Pro

- [x] Rename all user-facing application, AI, window, and installer labels.
- [x] Update documentation and automated assertions.
- [x] Preserve the existing app ID, database filename, backup format, and deterministic analytics namespace for upgrade compatibility.
- [x] Run all verification gates and package the newly named Windows installer.

Review:

- All customer-facing product labels now use Pizza Promo Pro, including the desktop window, navigation, AI assistant, settings copy, backup dialogs, and installer.
- Legacy internal identifiers remain unchanged so existing installations, local data, backups, and deterministic analytics continue to work after upgrading.
- Type checks, lint, 43 automated tests, and the Electron smoke test pass.

## Automatic updates through GitHub Releases

- [x] Add a secure main-process update service with production-only background checks.
- [x] Expose narrowly validated update status, check, download, and restart actions to Settings.
- [x] Add a clear application-update panel with progress and error states.
- [x] Configure GitHub Releases metadata and a tag-driven Windows publishing workflow.
- [x] Add automated coverage, documentation, and verify the packaged installer.

Review:

- Installed production builds check for releases after launch and every four hours, download updates in the background, and let the customer choose when to restart.
- Development builds stay offline, while the renderer receives only validated status and action contracts from the main process.
- Version tags publish the Windows installer, block map, and update manifest using repository-derived GitHub coordinates.
- Type checks, lint, 43 automated tests, the Electron smoke test, and updater-enabled Windows packaging pass.
- GitHub CLI is authenticated, but this local repository has no remote yet; public repository creation remains an explicit publication decision.

## Optional Higgsfield token correction

- [x] Reproduce the URL-only Higgsfield validation failure.
- [x] Omit blank optional tokens in Settings and normalize them defensively at the IPC boundary.
- [x] Verify URL-only saving, regression tests, and the Windows installer.

Review:

- Empty access-token inputs are now treated as absent instead of failing minimum-length validation.
- The Settings form no longer sends a blank token, and the IPC boundary independently normalizes blank values for defense in depth.
- Type checks, lint, 43 automated tests, the Electron smoke test, and Windows packaging pass.

## Stage ten — live Higgsfield MCP verification

- [x] Add a main-process Streamable HTTP client for MCP initialization and tool discovery.
- [x] Support public endpoints and optional bearer tokens without exposing credentials to the renderer.
- [x] Enforce endpoint, redirect, timeout, response-size, and protocol validation safeguards.
- [x] Replace the saved-configuration check with a real server handshake and clear verification result.
- [x] Show server identity and discovered-tool count in Settings without enabling tool execution.
- [x] Add transport, contract, and UI regression coverage.
- [x] Run all verification gates, update documentation, and package the Windows installer.

Safety boundary:

- This stage discovers MCP tools but never calls them. Media generation remains human-initiated and all output continues through review before scheduling or publishing.

Review:

- The Settings connection check now performs a real MCP lifecycle handshake and `tools/list` request against the saved endpoint.
- Public endpoints work without a token; when present, the OS-encrypted bearer token is read only in Electron's main process.
- Requests reject redirects, stop after ten seconds, cap responses at one megabyte, validate JSON-RPC/session/protocol details, and report authentication failures clearly.
- Tool discovery is read-only: no `tools/call` channel or request was added, and regression coverage explicitly proves that no tool is executed.
- Type checks, lint, 46 automated tests, the Electron smoke test, and Windows packaging pass.

## Public GitHub repository launch

- [x] Audit the publication set for credentials, local data, generated builds, and private artifacts.
- [x] Create a clean initial commit on the `main` branch.
- [x] Create the public `dietwedge/pizza-promo-pro` repository and push the source.
- [x] Verify repository visibility, remote configuration, and GitHub Actions availability.

Review:

- The public repository is live at `https://github.com/dietwedge/pizza-promo-pro` with `main` as its default branch.
- Local credentials, databases, installers, dependencies, compiled output, and test artifacts are excluded from Git.
- `origin/main` tracking is configured and the initial desktop-installer workflow started successfully.

## Sales landing page — first design pass

- [x] Establish the conversion argument, headline set, and distinctive visual direction.
- [x] Build a responsive, accessible static landing page isolated from the Electron application.
- [x] Add honest product presentation, one-time-purchase positioning, FAQs, and Square-ready CTA configuration.
- [x] Add SEO, social metadata, structured data, performance safeguards, and easy deployment configuration.
- [x] Run mechanical CRO, HTML/accessibility, responsive visual, and deployment verification.

Review:

- The “content prep line” direction uses operational tickets, a real product workflow, hard black type, and Italian green/red without generic AI imagery or invented proof.
- The selected headline scored 66/100 in the required mechanical scorer; the complete page scored 83/100 in the CRO audit.
- Desktop and 390px mobile renders were visually inspected, the local site returned HTTP 200, and core content remains legible without scroll interaction or JavaScript.
- Square pricing and checkout are configured centrally in `website/site-config.js`; no product claim, testimonial, price, or performance statistic was invented.

## Landing-page pricing offer

- [x] Present the $149 founding price against the planned $299 standard license.
- [x] Define the first-50 limit, one-location scope, and two-computer activation allowance.
- [x] Explain permanent use, one year of feature updates, supported-version fixes, and optional $99 major upgrades.
- [x] Show the planned $499 multi-location path without presenting it as currently available.
- [x] Verify the revised pricing hierarchy and objection handling on desktop and mobile.

Review:

- The founding license remains the page’s only purchase action; later license tiers provide price context without creating choice paralysis.
- License ownership and update terms are visible beside the price and repeated in plain-English FAQs.
- The revised page scored 86/100 in the CRO audit and passed desktop and 390px mobile visual inspection.

## Vercel landing-page deployment

- [x] Create and link the `pizzapromopro` Vercel project.
- [x] Deploy the validated static landing page to production.
- [x] Add canonical metadata and production security headers.
- [x] Redeploy and verify the final alias, HTTPS response, metadata, and headers.

Review:

- The production site is live at `https://pizzapromopro.vercel.app/` under the requested Vercel project name.
- The final alias returns HTTP 200 with the correct canonical URL, content security policy, referrer policy, and MIME-sniffing protection.
- Local Vercel credentials and project metadata remain excluded from source control.
