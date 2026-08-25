# FIRST30 Evidence Passport

![FIRST30](public/og.png)

FIRST30 shows what financial-fraud evidence actually supports before a citizen reports it. It analyses a synthetic payment receipt, scam conversation and call log locally, links every confirmed fact to its source, exposes contradictions, records custody events and exports a tamper-evident Evidence Passport.

> FIRST30 is an independent synthetic prototype. It does not submit reports, contact banks or government systems, establish that a claim is true, freeze funds or recover money. For a real financial cyber-fraud incident in India, call **1930**.

## Why this is different from an AI complaint writer

AI can draft prose. FIRST30 preserves the evidence trail:

- Source-linked observations for amount, reference, recipient, institution, phone and timestamps
- Deterministic cross-evidence agreement, conflict and missing-information checks
- Explicit `Evidence supported`, `Manually entered` and `Unknown` resolutions
- SHA-256 hashing, duplicate rejection and custody records
- Conflict explanations that never remove the original red flag
- Whole-ZIP verification without uploading evidence bytes

## Judged demo

1. Open `/report` and choose **Load synthetic evidence set**.
2. FIRST30 creates and analyses a receipt, scam-chat screenshot and call-log screenshot through the same local pipeline.
3. The fact board links observations to sources and exposes the deliberate ₹18,499 versus ₹18,400 mismatch.
4. Confirm the canonical facts or mark unavailable values `Unknown`.
5. Build the Evidence Passport.
6. Upload the downloaded ZIP at `/verify`; every packaged file is unpacked and hashed locally before the recorded signature is checked.

## Evidence Passport ZIP

```text
FIRST30-Evidence-Passport-<verification-code>.zip
├── FIRST30-evidence-passport.pdf
├── passport.json
├── manifest.json
└── evidence/
    ├── receipt.png
    ├── chat.png
    └── call-log.png
```

The PDF contains the sufficiency matrix, fact-to-source mapping, chronology, unresolved conflicts, evidence checksums and English/Hindi citizen-document appendices. Verification proves that the signed package and its listed files are unchanged; it does not prove institutional acceptance or factual truth.

## Local analysis and fallback

- Browser-native text detection is used when available.
- The built-in judged samples use bundled deterministic text fixtures and parsers when browser text detection is unavailable.
- Custom synthetic images fall back to a manual source-text review when local text detection is unavailable.
- No external AI or OCR API is called.

## Run with Docker and OrbStack

```bash
docker compose up --build app
```

Open [http://localhost:3000](http://localhost:3000). D1 and R2 state persists in named Docker volumes.

Production-style container:

```bash
docker compose --profile production up --build app-prod
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs anonymous sessions and Evidence Passport manifests |
| `FIRST30_PORT` | No | Changes the Docker Compose host port |

Never commit `.env` files or real evidence. This hackathon build accepts synthetic evidence only.

## Validation

```bash
npm test
npm run lint
npm run build
```

Application and D1 readiness is available at `/api/health`.
