# FIRST30 — Reimagined financial cyber-fraud reporting

![FIRST30](public/og.png)

FIRST30 is an independent, end-to-end redesign of the citizen journey for reporting financial cyber fraud. A fictional citizen explains the incident once, uploads evidence once, reviews every extracted fact, submits to a clearly labelled mock NCRP backend, receives a demo acknowledgement and answers an additional evidence request without leaving FIRST30.

> FIRST30 is a synthetic hackathon prototype. It does not contact NCRP, police, a bank or any government system, and it does not freeze or recover money. For a real financial cyber-fraud incident in India, call **1930**, contact the bank through a trusted number and never share an OTP.

## Complete demo journey

1. Open `/report` and use the visible fictional login:
   - Mobile: `90000 00000`
   - OTP: `123456`
   - Citizen: Sunita Sharma
2. Complete urgent triage: fraud type, payment channel, amount, timing and whether 1930 or the bank was contacted.
3. Load the three-file synthetic evidence set. FIRST30 analyses the receipt, scam chat and call log locally.
4. Review source-linked facts. The demo deliberately exposes a ₹18,499 versus ₹18,400 mismatch.
5. Describe the incident naturally and review the fictional complainant profile.
6. Preview the exact structured payload and submit it to the **mock** backend.
7. Track the `F30-DEMO-...` acknowledgement and answer the mock bank-statement request.
8. Download the complaint receipt and signed Evidence Passport ZIP, then verify the ZIP at `/verify`.

Progress is stored in D1 and evidence bytes in R2-compatible storage under an anonymous signed 24-hour session. A session can contain at most three synthetic cases.

## How evidence analysis works

Evidence is never sent to an OCR or AI provider. Bundled Tesseract runs in a browser Web Worker using local worker, WebAssembly and English-language assets. Fixed parsers then identify and normalize Indian amounts, UTR/reference numbers, UPI IDs, phone numbers, institutions and timestamps. Deterministic rules mark each result as supported, missing or conflicting and preserve the source behind every fact.

If OCR cannot read an image, the citizen can retry or transcribe visible text manually. The judged samples have a clearly labelled deterministic fallback so the demo remains reliable.

## Evidence Passport

The downloadable ZIP contains original evidence, a bilingual PDF, `passport.json` and a signed `manifest.json`. SHA-256 hashes detect changed or missing files. ZIP verification happens locally; only the verification code, canonical manifest hash and signature reach the server. Verification proves package integrity and internal consistency—not that the allegation is true or institutionally accepted.

## Run locally

```bash
npm ci
npm run dev
```

Or with Docker and OrbStack:

```bash
docker compose up --build app
```

Open [http://localhost:3000](http://localhost:3000). D1 and R2 development state persists in named volumes.

Production-style container:

```bash
docker compose --profile production up --build app-prod
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs anonymous sessions and Evidence Passport manifests |
| `FIRST30_PORT` | No | Changes the Docker Compose host port |

No OpenAI, OCR, government, police or bank API key is required. Never commit `.env` files or real evidence; the repository tracks only `.env.example` placeholders.

## Validation

```bash
npm test
npm run lint
npm run build
```

Application and D1 readiness is available at `/api/health`.
