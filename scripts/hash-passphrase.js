#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports -- plain CommonJS CLI script */
// Generates a scrypt hash of the family passphrase for VIEWER_PASSPHRASE_HASH.
// Run: node scripts/hash-passphrase.js
// Paste the printed value into .env.local as VIEWER_PASSPHRASE_HASH.

const { scrypt, randomBytes } = require('crypto')
const { createInterface } = require('readline')

const rl = createInterface({ input: process.stdin, output: process.stdout })
rl.question('Family passphrase: ', (passphrase) => {
  rl.close()
  if (!passphrase) { console.error('Empty passphrase — aborting.'); process.exit(1) }
  const salt = randomBytes(32)
  scrypt(passphrase, salt, 64, (err, hash) => {
    if (err) { console.error(err); process.exit(1) }
    console.log('\nVIEWER_PASSPHRASE_HASH=' + 'scrypt:' + salt.toString('hex') + ':' + hash.toString('hex'))
  })
})
