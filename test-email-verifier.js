#!/usr/bin/env node
const dns = require('dns').promises;

// Try to load optional verifier (installed in Backend)
let EmailVerifier = null;
try {
  // eslint-disable-next-line global-require
  EmailVerifier = require('node-email-verifier')
} catch (e) {
  EmailVerifier = null
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function tryVerifier(email) {
  if (!EmailVerifier) return null
  try {
    // Support several common export shapes
    if (typeof EmailVerifier === 'function') {
      const inst = EmailVerifier()
      if (inst && typeof inst.verify === 'function') {
        return await inst.verify(email)
      }
      if (typeof EmailVerifier.verify === 'function') {
        return await EmailVerifier.verify(email)
      }
    } else if (typeof EmailVerifier.verify === 'function') {
      return await EmailVerifier.verify(email)
    }
  } catch (err) {
    return { __error: String(err && err.message ? err.message : err) }
  }
  return null
}

async function verifyEmail(email, options = {}) {
  if (!email || !EMAIL_REGEX.test(email)) {
    return { email, deliverable: false, reason: 'invalid_format' }
  }
  // Try library first (if available)
  const libResult = await tryVerifier(email)
  if (libResult) {
    // Interpret common result shapes
    if (typeof libResult === 'boolean') return { email, deliverable: libResult, method: 'verifier', detail: libResult }
    if (libResult.__error) return { email, deliverable: false, method: 'verifier', detail: libResult.__error }

    const smtpOk = libResult.smtpCheck === true
    const explicitOk = Boolean(libResult.isValid || libResult.valid || libResult.success)
    const hasMx = Array.isArray(libResult.mxRecords) && libResult.mxRecords.length > 0

    const strict = Boolean(options.strict)

    let ok
    if (strict) {
      ok = smtpOk || explicitOk
    } else {
      ok = smtpOk || explicitOk || hasMx
    }

    return { email, deliverable: ok, method: 'verifier', detail: libResult }
  }

  // Fallback to MX lookup
  const domain = email.split('@')[1]
  try {
    const mx = await dns.resolveMx(domain)
    return { email, deliverable: Array.isArray(mx) && mx.length > 0, method: 'mx', detail: mx }
  } catch (err) {
    return { email, deliverable: false, method: 'mx', detail: String(err && err.message ? err.message : err) }
  }
}

const readline = require('readline')

async function main() {
  let args = process.argv.slice(2)

  // If no args provided, prompt the user for comma-separated emails
  if (args.length === 0) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const question = (q) => new Promise((resolve) => rl.question(q, resolve))
    const answer = await question('Enter email(s) (comma-separated) or leave empty to use defaults: ')
    rl.close()

    if (answer && answer.trim()) {
      args = answer.split(',').map(s => s.trim()).filter(Boolean)
    }
  }

  const toTest = args.length > 0 ? args : [
    'user@gmail.com',
    'invalid-email',
    'nobody@nonexistent-domain-xyz-12345.com',
    'test@example.com'
  ]

  console.log('Testing', toTest.length, 'email(s)')
  const results = []
  // read --strict flag
  const strict = args.includes('--strict') || process.env.EMAIL_STRICT_VERIFICATION === 'true'

  for (const email of toTest) {
    process.stdout.write(`Checking ${email} ... `)
    try {
      const r = await verifyEmail(email, { strict })
      const ok = r.deliverable ? 'OK' : 'FAIL'
      console.log(ok)
      results.push(r)
    } catch (err) {
      console.log('ERROR')
      results.push({ email, deliverable: false, method: 'exception', detail: String(err && err.message ? err.message : err) })
    }
  }

  console.log('\nSummary:')
  for (const r of results) {
    console.log(`- ${r.email}: ${r.deliverable ? 'deliverable' : 'not deliverable'} (method=${r.method || 'n/a'})`)
  }

  // Exit with non-zero code if any test failed
  const anyFail = results.some(r => !r.deliverable)
  process.exit(anyFail ? 2 : 0)
}

main()
