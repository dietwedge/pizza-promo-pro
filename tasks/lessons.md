# Lessons

## 2026-08-02

- When Jason approves a build plan and explicitly delegates implementation judgment, continue autonomously through all safe in-scope phases. Do not add discretionary proceed/confirmation checkpoints; stop only for genuinely missing authority, destructive ambiguity, or an external blocker.
- A settings MVP should expose the obvious operational setup paths from day one. Even when providers are mocked, include clear account and MCP connection management with honest capability states so users can see how the system becomes production-ready.
- Treat the secure Electron bridge as a visible runtime capability. Tests must assert that the bridge exists, and browser previews must show a clear desktop-only message instead of leaking raw `undefined.invoke` errors.
- Record-management pages must support editing existing records from their first usable version. Once data exists, expose an obvious Edit action, prefill the same form, preserve the record ID on save, and provide Cancel without forcing users to create duplicates.
- Optional form fields often arrive as empty strings rather than `undefined`. Omit blank optional values in the renderer and normalize them at the validated IPC boundary so the UI label and runtime behavior agree.
