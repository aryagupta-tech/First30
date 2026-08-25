# FIRST30

![FIRST30 — The first 30 minutes matter](public/og.png)

FIRST30 turns scattered financial-fraud evidence into one complete, verifiable response file. A citizen can organise synthetic evidence, confirm locally read transaction facts, identify missing information, build a chronology and download a bilingual package containing the originals, a PDF, case JSON and a signed checksum manifest.

> [!IMPORTANT]
> FIRST30 is an independent prototype using synthetic people, transactions and evidence. It does not submit reports, contact a bank or government system, freeze funds or recover money. For a real financial cyber-fraud incident in India, call **1930**.

## What genuinely works

- A single English/Hindi response workspace rather than a click-through simulation
- Private browser receipt reading when supported, with manual confirmation fallback
- SHA-256 hashing and duplicate-evidence rejection
- Missing-field, future-time and evidence/confirmation checks
- Editable incident chronology
- Deterministic English/Hindi complaint generation from confirmed facts
- Channel-specific dispute letter and plain-language 1930 call script
- Downloadable ZIP with original evidence, bilingual PDF, `case.json` and `manifest.json`
- Server-signed manifest with privacy-preserving public verification
- Citizen-recorded bank, 1930, cybercrime and follow-up acknowledgement numbers
- Anonymous 24-hour sessions with D1 and R2-backed persistence

## Demo journey

1. Open the response workspace.
2. Use the synthetic UPI receipt or choose another synthetic image.
3. Review locally read facts and correct anything uncertain.
4. Confirm evidence, fill unavailable fields with `Unknown`, and review readiness checks.
5. Edit the automatically prepared chronology.
6. Build and download the signed ZIP/PDF response file.
7. Upload `manifest.json` on `/verify` to prove the recorded manifest is unchanged.
8. Optionally record real acknowledgement numbers the citizen receives afterward.

## Package contents

```text
FIRST30-<verification-code>.zip
├── FIRST30-response-file.pdf
├── case.json
├── manifest.json
└── evidence/
    └── original synthetic evidence files
```

The manifest lists every filename, media type, size and SHA-256 checksum. FIRST30 signs the canonical manifest and stores only its verification record. The verification page hashes the manifest in the browser and sends only its verification code, hash and signature; it never sends or returns citizen facts or evidence.

## Run with Docker and OrbStack

Requirements:

- OrbStack or another Docker-compatible runtime
- Docker Compose

```bash
cp .env.example .env
docker compose up --build app
```

Set `SESSION_SECRET` in `.env` to a random value containing at least 32 characters. Open [http://localhost:3000](http://localhost:3000). Local D1 and R2 state persists in named Docker volumes.

Production-style container:

```bash
docker compose --profile production up --build app-prod
```

## Run directly

```bash
npm ci
cp .env.example .env
npm run dev
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs anonymous sessions and response-file manifests |
| `FIRST30_PORT` | No | Changes the Docker Compose host port |

Never commit `.env` files or real evidence. The repository contains only placeholders and synthetic data.

## Validation

```bash
npm test
npm run lint
npm run build
```

Application and D1 readiness is available at [`/api/health`](http://localhost:3000/api/health).

## Privacy and safety

- Custom images are read locally before upload.
- Uploads accept PNG, JPEG or WebP images up to 5 MB.
- Every case, evidence file and export is session-owned.
- Unknown information remains explicitly unknown; FIRST30 does not invent facts.
- Editing confirmed data produces a new export version.
- Verification proves manifest integrity only—not institutional acceptance or recovery.
- No external bank, government, police, AI or OCR API is called.

FIRST30 is a hackathon prototype, not an official reporting or banking service.
