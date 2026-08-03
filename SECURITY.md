# Security

## Security baseline

Pizza Promo Pro treats the renderer as untrusted. Privileged work occurs in the main process behind narrow, validated IPC contracts.

## Electron controls

- `nodeIntegration: false`
- `contextIsolation: true`
- Sandboxing enabled where compatible
- No remote module or unrestricted renderer-to-main bridge
- Restrictive Content Security Policy without unsafe remote script execution
- Deny navigation away from approved application URLs
- Deny new windows by default
- Open approved external links only in the system browser after URL validation
- Disable or restrict developer tools in production builds according to release policy

## IPC controls

- Allowlist every channel and expose task-specific preload methods only.
- Validate every request and response with shared Zod schemas.
- Authenticate the sender frame/window where applicable.
- Return structured, non-sensitive errors.
- Do not pass filesystem handles, SQL, arbitrary commands, or credentials from the renderer.
- Record security-sensitive operations in `audit_logs`.

## Files and media

- Keep managed files beneath known user-data directories.
- Resolve and verify canonical paths before reading, writing, restoring, or deleting.
- Reject traversal, absolute-path injection, reserved names, and unsafe extensions where applicable.
- Sanitize imported filenames and generate collision-resistant managed filenames.
- Inspect file signatures and enforce reasonable size limits rather than trusting extensions alone.
- Never execute imported media.

## Secrets and OAuth

No live credentials are required in milestone one. Future provider credentials and OAuth tokens must never enter renderer state, logs, source control, SQLite plaintext columns, or backup archives. Use Electron `safeStorage` or an appropriate OS-backed vault. Use the external system browser for OAuth when supported, validate callback URLs, bind callbacks to an expiring state value, and use PKCE where available.

The connection center stores encrypted tokens in `credentials.secure.json` under Electron's user-data directory. The file contains only `safeStorage` ciphertext, is written atomically, is excluded from backup bundles, and is never exposed through IPC. Social account metadata and the Higgsfield endpoint are stored separately from credentials.

Official Higgsfield account authentication is delegated to Higgsfield's bundled CLI using OAuth 2.0 PKCE. Pizza Promo Pro executes only login, workspace-list, workspace-select, and account-status commands with fixed arguments and bounded output. It never invokes the CLI token command, reads Higgsfield's credential file, or exposes OAuth credentials to the renderer.

Higgsfield generation accepts only validated image/video profiles and fixed model identifiers. The main process obtains a live credit estimate and refuses generation unless the customer confirms that maximum and acknowledges review. Downloaded results must use HTTPS, match the expected media family, remain under 150 MB, and are checksummed into protected local storage. Opening an asset for review requires a database ID and a containment check under the application media directory.

Customer-owned AI keys use the same credential vault. AI requests run only from the main process with validated HTTPS or localhost endpoints, bounded timeouts, and redirects disabled. Chat receives a factual context package and has no IPC capability for approval, scheduling, publishing, filesystem access, or credentials.

## Publishing safeguards

- Human approval is required by default.
- Newly generated media is never published automatically.
- Each publish request uses an idempotency key.
- Every attempt, result, error category, and external post ID is recorded.
- Automated tests use `MockSocialPublisher` exclusively.

## Application update integrity

- Update checks run only in packaged builds and never expose GitHub or filesystem access to the renderer.
- Releases are produced by the tag-triggered GitHub Actions workflow.
- Production releases must be Authenticode-signed with the Windows certificate stored in GitHub Actions secrets.
- The application installs an update only after it has downloaded successfully and the user chooses to restart (or exits normally later).
- The renderer never receives provider tokens.

## Content integrity

Generated content must be grounded in stored business, location, menu, and promotion data. Do not invent prices, hours, ingredients, offers, codes, dates, awards, allergens, testimonials, or health claims. AI-generated media must not be represented as photography of actual menu items without review and approval.

## Backup and updates

Restore archives are untrusted inputs and require manifest, checksum, path, and version validation. Updates are verified before installation. Signing credentials stay outside the repository. Never restart for an update while unsaved content exists.

## Reporting security issues

Do not place secrets, personal data, or exploitable details in public issue text. Record remediation decisions in `DECISIONS.md` and add regression coverage for resolved vulnerabilities.
