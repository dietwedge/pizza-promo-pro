# Lessons

## 2026-08-02

- When Jason approves a build plan and explicitly delegates implementation judgment, continue autonomously through all safe in-scope phases. Do not add discretionary proceed/confirmation checkpoints; stop only for genuinely missing authority, destructive ambiguity, or an external blocker.
- A settings MVP should expose the obvious operational setup paths from day one. Even when providers are mocked, include clear account and MCP connection management with honest capability states so users can see how the system becomes production-ready.
- Treat the secure Electron bridge as a visible runtime capability. Tests must assert that the bridge exists, and browser previews must show a clear desktop-only message instead of leaking raw `undefined.invoke` errors.
- Record-management pages must support editing existing records from their first usable version. Once data exists, expose an obvious Edit action, prefill the same form, preserve the record ID on save, and provide Cancel without forcing users to create duplicates.
- Optional form fields often arrive as empty strings rather than `undefined`. Omit blank optional values in the renderer and normalize them at the validated IPC boundary so the UI label and runtime behavior agree.
- Pizza Promo Pro is permanently a native Electron desktop product. Do not recommend a browser app, PWA, hosted trial, or web fallback as a way around Windows distribution constraints; solve sales, licensing, signing, and updates within the desktop strategy.
- Long-running Settings actions must show progress and their final result beside the initiating control. A banner above the current scroll position makes a working action appear broken.
## 2026-08-03 — Do not turn provider defaults into product restrictions

- A recommended AI model is a starting choice, not an exclusive allowlist, when the connected provider offers multiple useful and lower-cost options.
- For customer-funded generation, expose compatible models with live pricing and task guidance while retaining strict validation, explicit spend approval, and review controls.
- Separate “recommended default” from “available choice” in both architecture and UI copy.

## 2026-08-03 — Verify forms against database constraints and show results in context

- Every renderer field mapping must be exercised through the real normalization and database constraint path; a visually correct camelCase form is not proof that the persisted snake_case column is correct.
- One-per-business records such as brand profiles must open the existing record for editing instead of offering a duplicate-create state.
- A successful action must produce visible feedback and reveal the new result next to the initiating workflow, especially when the result otherwise appears below the fold.
- Once users can create operational records or content, include edit and delete controls in the same workflow with confirmation for destructive actions.

## 2026-08-03 — Inspect framework payloads before requiring browser rendering

- A page that displays a client-rendering bailout can still contain complete structured application data in streamed framework payloads.
- For menu import compatibility, inspect standard structured data, embedded framework state, and visible HTML in that order before adding a heavyweight browser or paid scraping dependency.
- Maintain provider-shaped parser fixtures for storefronts actually encountered by users, while keeping the import preview untrusted and review-only.

## 2026-08-03 — Generation is not complete until the result is visible

- A successful cost estimate and completed provider job do not make media generation usable by themselves; verify the returned asset is downloaded, persisted, and rendered in the originating workflow.
- Long-running generation must show a durable job state, a visible result or actionable failure, and a retry/review path after the initiating control stops spinning.
- Exercise the real provider response shape and local media URL bridge, not only mocked completion records.

## 2026-08-04 — Test new form layouts inside their real parent container

- A component-level interaction test can pass while shared editor and browser-default styles collapse labels and textareas into an unusable layout.
- Every new form pattern must explicitly define label layout, control width, typography, spacing, and responsive behavior instead of relying on inherited form styles.
- Verify the actual Electron render at the target desktop size before shipping visually significant workflows.
