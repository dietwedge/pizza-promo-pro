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
