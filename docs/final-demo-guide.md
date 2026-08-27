# FIRST30 — final judge demo guide

This script follows the official format: the first minute is the citizen journey and the second minute explains the build and the decisions behind it.

## Before recording

1. Open the public FIRST30 home page in a private browser window.
2. Click **Download safe demo files** and unzip `FIRST30-demo-evidence-kit.zip`.
3. Keep these four fictional images ready: `sample-receipt.png`, `sample-chat.png`, `sample-call-log.png` and `sample-bank-statement.png`.
4. Set the browser to 1440 × 900, close unrelated tabs and test the journey once.
5. Never use real personal, payment, ID or OTP data in the recording.

## Demo data

| Field | Fictional value |
| --- | --- |
| Demo mobile | `90000 00000` |
| Demo OTP | `123456` |
| Citizen | Sunita Sharma |
| Loss | ₹18,499 |
| Payment channel | UPI |
| Fraud type | Fake KYC call |
| Transaction time | 21 August 2026, 6:42 PM |
| Transaction reference | `UTR826194730521` |
| Recipient | `verify.kyc@fakeupi` |
| Suspect phone | `+91 98765 43210` |
| Institution | Bharat Cooperative Bank |
| Intentional conflict | Chat says ₹18,400; receipt says ₹18,499 |

Citizen statement:

> I received a call from someone claiming to be from my bank. They said my KYC would expire and asked me to approve a UPI request. ₹18,499 left my account before I realised it was a scam.

## 0:00–1:00 — citizen demo only

### 0:00–0:07 — problem and urgent action

Show the home page and say:

> “Financial cyber-fraud victims lose critical time in confusing forms. FIRST30 puts the urgent actions first: call 1930, contact the bank and never share an OTP.”

### 0:07–0:15 — enter as the citizen

Open **Start a report**, use the visible demo login and move quickly through the safety and prefilled payment screens.

> “Sunita is fictional. She gets five plain-language steps, large controls, autosave, Hindi and read-aloud help.”

### 0:15–0:36 — upload and check evidence

Tick the safe-test-data confirmation and upload the three downloaded screenshots. Use honest jump cuts during local reading, while leaving a moment of the progress screen visible.

> “She uploads once. FIRST30 reads each file on this device and links every important fact to its screenshot.”

Show the two amount choices.

> “The receipt says ₹18,499 and the chat says ₹18,400. FIRST30 exposes the difference instead of guessing.”

### 0:36–0:51 — complaint and review

Select the receipt amount, continue, briefly show the natural-language statement and the review page.

> “Sunita explains the incident once. FIRST30 prepares a complete English and Hindi complaint from only the details she confirmed.”

### 0:51–1:00 — complete the main journey

Click **Finish and create demo reference** and end the first minute on the `F30-DEMO-...` acknowledgement.

> “Her progress, screenshots and complaint now stay together under one clearly labelled demo reference.”

Do not demonstrate the follow-up upload, report verification or backend receipt after 1:00. Those features can remain available for reviewers to test.

## 1:00–2:00 — build and product choices only

### 1:00–1:14 — why this problem and interface

Keep the acknowledgement page visible and say:

> “We redesigned the financial-fraud journey because the current pain is not only filing a complaint; it is understanding urgent actions, evidence requirements and progress. Easy Mode uses one question group at a time, large controls and bilingual guidance for older and low-digital-literacy citizens.”

### 1:14–1:31 — evidence-processing choice

Show a still of the source-linked fact board while explaining:

> “We deliberately avoided runtime AI for evidence. Bundled Tesseract reads images locally, transparent parsers identify Indian payment details and deterministic rules expose missing or conflicting values. This is private, explainable and never invents a fact.”

### 1:31–1:48 — backend and infrastructure

Show the expanded **How FIRST30 kept this report safe** receipt as supporting footage, without presenting it as another citizen task.

> “D1 stores structured case records and R2-compatible storage holds evidence. Revisions prevent lost edits, idempotency prevents duplicate submissions, encrypted immutable snapshots preserve the finished report, a transactional outbox supports safe retries and a hash-linked audit history makes processing traceable.”

### 1:48–1:55 — what is mocked

> “NCRP submission, acknowledgement and the additional-document request are clearly mocked. Nothing reaches a government, police or banking system, and all demo data is fictional.”

### 1:55–2:00 — Codex and close

> “Codex helped research the public-service journey, design the product, implement the frontend and backend, and validate the complete build. FIRST30: explain once, upload once, review clearly.”

## Recording checklist

- Keep the final video under two minutes.
- Stop citizen actions at the acknowledgement before the 1:00 mark.
- Show the custom file picker, local reading progress, amount conflict, complaint and acknowledgement in minute one.
- Use minute two only for the problem choice, interface decisions, evidence architecture, backend reliability, mocked boundary and Codex contribution.
- Do not say the report reached NCRP or that funds were frozen or recovered.
- Keep the **Demo** label visible during submission and tracking.
- Provide the visible demo mobile and OTP in the submission form.
- Confirm the live link opens without requesting access.
