# Property Verification PoC - API & Smoke Test

This document describes the verification Phase 1 PoC endpoints added to the backend and provides quick smoke-test instructions.

Base URL (local dev): `http://localhost:5000/api`
(Adjust `BASE_URL` if your server uses a different port or prefix.)

## Endpoints

- POST `/properties/:id/verification/docs`
  - Purpose: upload one or more verification documents for a property.
  - Auth: Bearer token (owner or admin).
  - Form field: `docs` (multipart file, accept multiple)
  - Example (curl):

    curl -X POST \
      -H "Authorization: Bearer <OWNER_TOKEN>" \
      -F "docs=@./test/id_front.jpg" \
      -F "docs=@./test/id_back.jpg" \
      "http://localhost:5000/api/properties/<PROPERTY_ID>/verification/docs"

- POST `/properties/:id/verification/submit`
  - Purpose: mark a property as submitted for verification (no files required if already uploaded).
  - Auth: Bearer token (owner or admin).
  - Body (JSON): `{ "notes": "optional notes" }`

    curl -X POST -H "Authorization: Bearer <OWNER_TOKEN>" -H "Content-Type: application/json" -d '{"notes":"Submit for review"}' "http://localhost:5000/api/properties/<PROPERTY_ID>/verification/submit"

- GET `/properties/admin/pending`
  - Purpose: admin-only list of properties with `verification_status: 'pending'`.
  - Auth: Bearer token (admin).

    curl -H "Authorization: Bearer <ADMIN_TOKEN>" "http://localhost:5000/api/properties/admin/pending"

  - Server-side pagination (PoC): supported query params:
    - `page` (default 1)
    - `limit` (default 20, max 200)
    - `q` (optional simple text filter on property name or owner email/username; PoC filters after fetching a capped result set)

    Example (get first page, 20 items):

    curl -H "Authorization: Bearer <ADMIN_TOKEN>" "http://localhost:5000/api/properties/admin/pending?page=1&limit=20&q=smith"

- POST `/properties/admin/:id/verify`
  - Purpose: admin approves and marks the property as verified.
  - Auth: Bearer token (admin).
  - Body (JSON): `{ "notes": "optional notes" }`

    curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"notes":"Looks good"}' "http://localhost:5000/api/properties/admin/<PROPERTY_ID>/verify"

- POST `/properties/admin/:id/reject`
  - Purpose: admin rejects verification and adds notes.
  - Auth: Bearer token (admin).
  - Body (JSON): `{ "notes": "reason for rejection" }`

    curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"notes":"Invalid docs"}' "http://localhost:5000/api/properties/admin/<PROPERTY_ID>/reject"


## Quick Node.js smoke-test script

A small test script is provided (`tests/verification_smoke_test.js`) that exercises the main flows: list pending (admin), upload docs (owner), submit (owner), list pending again (admin), verify (admin).

Requirements (run from `Backend`):

```bash
npm install axios form-data dotenv
```

Create a `.env` with the following keys in the `Backend` directory (or set env vars directly):

```
BASE_URL=http://localhost:5000/api
ADMIN_TOKEN=eyJ...admin...
OWNER_TOKEN=eyJ...owner...
PROPERTY_ID=<PROPERTY_ID_TO_TEST>
SAMPLE_FILE=./tests/sample.jpg
```

Run the smoke test:

```bash
node tests/verification_smoke_test.js
```

The script logs API responses; adjust tokens and property id as needed.

## Notes & Next Steps

- The PoC reuses existing Cloudinary integration (uploads saved to `property_verification` folder).
- Notifications (email to owner/admin) are not implemented in Phase 1.
- If you prefer local file storage for testing, I can modify the controller to store files under `uploads/verification/` instead.

If you want, I can:
- Run the smoke test for you (requires starting the backend here), or
- Implement the small frontend changes to `components/add-property-modal.tsx` next.
