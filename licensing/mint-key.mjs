#!/usr/bin/env node
// Mint Pizza Promo Pro license keys.
//
// A key is a human-enterable identifier only — authority lives in Neon (the
// license record) and, at activation time, in the Ed25519-signed token the
// server returns. The trailing character is a mod-32 checksum so the desktop
// UI can reject typos offline without holding any secret.
//
// Phase 0 (manual): run this, hand a key to each buyer, log key -> email ->
// Square order id in Airtable. Phase 1: the Square webhook calls mintKey()
// and inserts the row into Neon automatically. Same format either way, so
// keys issued by hand today stay valid once activation ships.
//
//   node licensing/mint-key.mjs           # one key
//   node licensing/mint-key.mjs 10        # ten keys

import { randomInt } from 'node:crypto'
import { pathToFileURL } from 'node:url'

// Crockford base32 — no I, L, O, U to avoid transcription errors.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const DATA_CHARS = 14 // 14 random chars + 1 checksum = 15, shown as 3 groups of 5

function checksum(chars) {
  const sum = [...chars].reduce((acc, ch) => acc + ALPHABET.indexOf(ch), 0)
  return ALPHABET[sum % ALPHABET.length]
}

export function mintKey() {
  let data = ''
  for (let i = 0; i < DATA_CHARS; i += 1) data += ALPHABET[randomInt(ALPHABET.length)]
  const body = data + checksum(data)
  const groups = body.match(/.{1,5}/g)
  return `PPP-${groups.join('-')}`
}

export function isValidFormat(key) {
  const match = /^PPP-([0-9A-Z]{5})-([0-9A-Z]{5})-([0-9A-Z]{5})$/.exec(key.trim().toUpperCase())
  if (!match) return false
  const body = match.slice(1).join('')
  if ([...body].some((ch) => !ALPHABET.includes(ch))) return false
  return checksum(body.slice(0, DATA_CHARS)) === body[DATA_CHARS]
}

// Run directly (not imported) -> print keys. pathToFileURL normalizes the
// Windows backslash path in argv[1] to a file:// URL so this matches on Win too.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const count = Math.max(1, Number.parseInt(process.argv[2] ?? '1', 10) || 1)
  for (let i = 0; i < count; i += 1) console.log(mintKey())
}
