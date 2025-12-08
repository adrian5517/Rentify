# Email Verifier — deployment notes

This project includes optional stricter SMTP-level email verification using `node-email-verifier`.

Configuration (env vars):

- `EMAIL_STRICT_VERIFICATION` (boolean): set to `true` to require SMTP-level verification (prefer `node-email-verifier`) when checking email deliverability. If `false` or unspecified, the system uses permissive checks (accepts MX records or library signals).

- `EMAIL_VERIFIER_RETRIES` (number): how many attempts to make when the email verifier library experiences transient errors. Default: `2`.

- `EMAIL_VERIFIER_TIMEOUT_MS` (number): timeout in milliseconds for each verifier attempt. Default: `5000`.

Usage:

- Locally, you can test strict mode by running the CLI script with `--strict`:

  ```powershell
  node test-email-verifier.js --strict user@example.com
  ```

- In production, set `EMAIL_STRICT_VERIFICATION=true` in your environment variables (e.g., Render, Heroku, Docker env) to enable stricter checks.

Notes:

- The verifier is optional. If `node-email-verifier` is not installed, the code falls back to a DNS MX lookup.
- Strict SMTP checks can reduce false positives but may be slower or blocked by some mail servers; use with caution and consider allowing a fallback path (e.g., accept MX when verifier is unavailable).
- The `registerUser` endpoint uses `isEmailDeliverable()` to validate emails before creating accounts; when strict mode is enabled, users on some providers may be rejected depending on the SMTP responses.
