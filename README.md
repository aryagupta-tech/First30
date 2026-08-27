# FIRST30 — Reimagined financial cyber-fraud reporting

![FIRST30](public/og.png)

FIRST30 is an independent, end-to-end redesign of the citizen journey for reporting financial cyber fraud. It combines a senior-friendly five-step interface with a production-style reporting engine: resumable saves, safe retries, immutable submission snapshots, evidence integrity checks and a transparent processing receipt.

**Live demo:** [first30-cyber-fraud-reporting.aryagupta.chatgpt.site](https://first30-cyber-fraud-reporting.aryagupta.chatgpt.site)

## What FIRST30 improves

| Common reporting problem | FIRST30 response |
| --- | --- |
| Long, technical forms | Five plain-language Easy Mode stages with English/Hindi read-aloud guidance |
| Lost progress or duplicate clicks | Resumable saves, optimistic revisions and idempotent commands |
| Unclear or contradictory evidence | Local OCR, source-linked facts and visible conflict detection |
| Uncertain backend processing | A citizen-safe receipt showing checks, steps, retries and audit-chain integrity |
| Repeated evidence sharing | One complete downloadable report containing the complaint, screenshots and case summary |

> FIRST30 is a synthetic hackathon prototype. It does not contact NCRP, police, a bank or any government system, and it does not freeze or recover money. For a real financial cyber-fraud incident in India, call **1930**, contact the bank through a trusted number and never share an OTP.

## What is real and what is mocked

| Works end to end | Clearly mocked |
| --- | --- |
| Session ownership, autosave and reload/resume | NCRP submission and acknowledgement |
| Browser-local reading and deterministic evidence analysis for custom safe test images | Additional evidence request from an institution |
| D1 case records and private R2 evidence storage | Any police, bank or government response |
| Encrypted snapshots, outbox processing and audit chain | Investigation, freezing or recovery of funds |
| Complete ZIP/PDF export and private change detection | Acceptance by an official authority |

## Complete demo journey

1. Open `/report` and use the visible fictional login:
   - Mobile: `90000 00000`
   - OTP: `123456`
   - Citizen: Sunita Sharma
2. Follow Easy Mode: protect yourself, enter payment details, review evidence, explain what happened, then review and submit.
3. Either load the prepared case or download the safe demo kit and upload its receipt, scam chat and call log yourself. FIRST30 analyses custom fictional or fully redacted images locally and deliberately exposes a ₹18,499 versus ₹18,400 mismatch.
4. Submit to the **mock** backend and track the `F30-DEMO-...` acknowledgement.
5. Open “How FIRST30 kept this report safe”, answer the mock bank-statement request, download the complete report and check it at `/verify`.

Progress is stored in D1 and evidence bytes in R2-compatible storage under an anonymous signed 24-hour session. A session can contain at most three demo cases.

### Safe demo files

The home page includes **Download safe demo files**. It creates `FIRST30-demo-evidence-kit.zip` in the browser with four fictional screenshots, a read-me and the exact test values. Upload the three main screenshots manually to demonstrate that FIRST30 processes selected files rather than filling a hard-coded form. Use the included bank statement for the follow-up step.

The official hackathon rules prohibit real sensitive user data. Custom uploads therefore require an explicit confirmation that each file is fictional or fully redacted. Never upload real IDs, account numbers, card details, OTPs or private evidence to the public demo.

## Government-grade reporting engine

The public demo never contacts NCRP, police, a bank or another private system. It demonstrates the backend pattern an authorised production deployment could use:

- A central command/workflow service allows only valid case transitions.
- Optimistic case revisions prevent one tab from silently overwriting another.
- Idempotency records make case creation, upload, submission, export and follow-up responses safe to retry.
- Submission freezes one encrypted snapshot, creates a workflow and writes a transactional outbox job before returning.
- A typed `MockNcrpGateway` processes that outbox job. A real deployment could replace it with an authorised queue and NCRP sandbox adapter without changing the citizen flow.
- Hash-linked, append-only audit events expose tampering; operational logs contain request IDs and safe result codes, not citizen details.
- Fictional profiles and submission payloads use AES-GCM encryption with domain-separated keys derived from `SESSION_SECRET`.
- Evidence moves through `pending`, `stored`, `confirmed` and `failed` states so interrupted R2 writes can be retried without creating invisible orphan files.
- CSRF, same-origin checks, signed cookies, hashed rate-limit identifiers, strict image-signature checks and private no-store evidence responses protect the boundary.

Every successful case response includes a revision and saved time. Mutations carry a CSRF token, an idempotency key and the last known revision. A stale edit receives `409`, while an exact retry reuses its first result.

```text
Citizen command
      │
      ▼
Workflow service ──► encrypted immutable snapshot
      │
      ├────────────► hash-linked audit event
      │
      ▼
Transactional outbox ──► typed MockNcrpGateway
      │
      ▼
Sanitized processing receipt shown to the citizen
```

## Easy Mode and accessibility

Easy Mode is the default reporting interface. It uses five plain-language steps, 18px body text, 52px-or-larger controls, persistent progress and time remaining, large Back/Continue actions, Hindi support, numeric mobile keyboards, visible save/retry states and browser-native read-aloud instructions. Technical words such as OCR, payload and canonical facts stay out of the main journey. Emergency guidance—call 1930, use a trusted bank number and never share an OTP—appears before payment questions.

## How evidence analysis works

Evidence is never sent to an OCR or AI provider. Bundled Tesseract runs in a browser Web Worker using local worker, WebAssembly and English-language assets. Fixed parsers then identify and normalize Indian amounts, UTR/reference numbers, UPI IDs, phone numbers, institutions and timestamps. Deterministic rules mark each result as supported, missing or conflicting and preserve the source behind every fact.

If the local reader cannot read an image, the citizen can retry or transcribe visible text manually. The prepared samples have a clearly labelled deterministic fallback so the demo remains reliable; citizen-supplied safe test images never receive invented fallback values.

## Complete downloadable report

The downloaded report contains original screenshots, a bilingual PDF and a private consistency record. FIRST30 can later check whether any included file changed without uploading the evidence again. This check proves only that the saved report is unchanged—not that the allegation is true or institutionally accepted.

## Run locally

```bash
npm ci
npm run dev
```

Or with Docker and OrbStack:

```bash
docker compose up --build app
```

Open [http://localhost:3000](http://localhost:3000). D1 and R2 development state persists in named volumes. The development container automatically synchronizes its dependency volume when `package-lock.json` changes, so rebuilding does not require deleting saved D1/R2 data.

Production-style container:

```bash
docker compose --profile production up --build app-prod
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes | Signs sessions/manifests and derives encryption, CSRF, audit and rate-limit keys |
| `FIRST30_PORT` | No | Changes the Docker Compose host port |

No OpenAI, OCR, government, police or bank API key is required. Never commit `.env` files or real evidence; the repository tracks only `.env.example` placeholders.

## Project overview

See [`docs/project-summary.md`](docs/project-summary.md) for a concise description of the citizen journey and reporting engine.

## Validation

```bash
npm test
npm run lint
npm run build
```

Application and D1 readiness is available at `/api/health`.

## License

FIRST30 is available under the [MIT License](LICENSE).

## Security

Please read the [security policy](SECURITY.md) before testing or deploying FIRST30. Report vulnerabilities privately and use synthetic data only.
