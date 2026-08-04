# Licensing

Backend scaffolding for selling Pizza Promo Pro as a one-time license via Square.
The desktop app stays local-first; this covers only the sale, key issuance, and
(later) online activation. **Nothing here ships inside the Electron app.**

Stack: Square Payment Link → Vercel serverless functions → Neon Postgres (via
Drizzle). No Supabase.

## Files

- `mint-key.mjs` — generate human-enterable license keys. Pure identifiers with a
  mod-32 checksum for offline typo rejection; authority lives in Neon.
- `schema.ts` — Drizzle schema for the Neon license store (`licenses`,
  `activations`).

## Phased rollout

**Phase 0 — manual (now).** Checkout is live. On each Square sale:
```bash
node licensing/mint-key.mjs        # copy the key
```
Email the buyer the key + installer download link, and log
`key → email → Square order id` in Airtable. The app does not gate yet.

**Phase 1 — automate issuance.** Neon DB + a Vercel `/api/square-webhook`
function: verify the Square signature → `mintKey()` → insert into `licenses` →
email key + download. Backfill Phase 0 keys. Set `LICENSE_DB_URL` (Neon
connection string) in Vercel env.

**Phase 2 — in-app activation.** `/api/activate` looks up the key, enforces
`activationLimit`, records the machine in `activations`, and returns an
Ed25519-signed token. The app embeds the *public* key only and verifies the
token offline on every launch — no shared secret in the shipped binary, activation
survives going offline.

## Not yet decided

- Installer hosting for the download link (recommended: GitHub Release on this repo).
- Transactional email provider (Resend, or SendGrid via the Twilio kit).
- Windows code-signing cert — see `DECISIONS.md` (SmartScreen warnings until signed).
