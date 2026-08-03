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

Higgsfield generation accepts only validated image/video profiles and approved model identifiers that are also present in the provider's live catalog. Each profile passes only settings declared by that model, and unsupported aspect ratios are rejected. Changing the model or format clears the prior approval; the main process re-estimates the exact selection and refuses generation above the customer-confirmed maximum. Downloaded results must use HTTPS, match the expected media family, remain under 150 MB, and are checksummed into protected local storage. Opening an asset for review requires a database ID and a containment check under the application media directory.

Menu URL imports are main-process-only and defend against server-side request forgery. URLs must be public HTTP/HTTPS endpoints without embedded credentials; DNS results and every redirect are checked against loopback, private, and link-local ranges. Fetches are time- and size-bounded, accept only HTML/JSON, and never execute page JavaScript. Embedded framework payload parsing is data-only, requires a bounded `menu` object shape, ignores malformed payloads, and caps the preview at 200 deduplicated items. Extraction produces an untrusted preview only. The customer must review names, descriptions, selections, and prices before a separately validated import request writes local records.

Storefront branding is detected only from exact Clover, Square, Slice, and Toast hostnames; lookalike domains remain generic. Public menu import never receives account credentials or grants ongoing provider access. AI promotion suggestions are bounded structured proposals, grounded with local facts, and cannot write promotion records. The customer must apply the suggestion, choose dates and value, review the terms, and explicitly save it through the normal validated data path.

Generated-media previews accept only validated media-asset UUIDs. The main process resolves the database path, proves it remains under the app-controlled media directory, verifies the file exists and is an image, and enforces a 25 MB inline limit before returning a data URL. Arbitrary local paths are never accepted from the renderer. Original files open only through the same protected-path validation.

Higgsfield reference images are explicit, per-generation selections. The main process accepts no renderer-supplied filesystem paths: it resolves up to four media UUIDs from the local database, confines them to protected storage, checks existence, image type, and size, and rejects references for incompatible models. The same references participate in the estimate and approved generation, and their IDs remain in the local audit trail. UI copy states that references guide style but do not prove an exact product depiction.

Brand interview answers are treated as owner direction, not verified claims. Structured AI output is length-bounded and cannot save a profile or rules. Owners must apply the proposal, edit it, and use the existing validated save action.

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
