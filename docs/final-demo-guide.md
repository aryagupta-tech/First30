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

## 0:00–1:00 — show the citizen journey

### 0:00–0:08 — problem and emergency action

Show the home page and say:

> “After cyber fraud, a victim should not have to fight a confusing form. FIRST30 puts the urgent actions first: call 1930, contact the bank, and never share an OTP.”

### 0:08–0:18 — start and triage

Open **Start a report**, use the visible mobile and OTP, pass the safety screen and show the prefilled fictional payment details.

> “The journey uses five plain-language steps, large controls, autosave, Hindi and read-aloud help.”

### 0:18–0:40 — prove custom uploads work

On the screenshot step, tick the safe-test-data confirmation. Upload the three downloaded images one by one instead of pressing the prepared-sample button. Confirm the text FIRST30 reads from each image.

Use short, honest jump cuts while the local reader is working so the final video stays under two minutes. Keep enough of the progress screen visible to show that the reading step actually ran.

> “These are separate fictional files, not hard-coded form values. FIRST30 reads each image on this device, finds payment facts and links every fact to the screenshot where it appeared.”

Show the two amount choices.

> “The receipt says ₹18,499, while the scam message says ₹18,400. FIRST30 exposes the difference instead of silently guessing.”

### 0:40–1:00 — complaint, submission and follow-up

Continue, show the natural-language statement, review the English/Hindi complaint, then finish the demo submission.

> “The citizen explains the incident once. FIRST30 builds a complete bilingual report, safely creates one demo reference, preserves progress, and keeps the mock boundary visible.”

Use `sample-bank-statement.png` for the follow-up request, then download the complaint receipt and complete report.

## 1:00–2:00 — explain why it is better

### 1:00–1:18 — real outcome

> “The outcome is not a decorative dashboard. It is a usable complaint, original screenshots, a fact-to-source record, a visible contradiction, a follow-up response and a downloadable report that can be checked for later changes.”

Open **Check my downloaded report** and select the downloaded FIRST30 report.

### 1:18–1:42 — backend reliability

Expand **How FIRST30 kept this report safe**.

> “The reporting engine protects against lost progress and repeated clicks. It freezes one encrypted submission copy, records each command once, uses a transactional outbox for resumable processing, tracks evidence storage states and keeps a hash-linked audit history. D1 stores structured records and R2-compatible storage holds evidence.”

### 1:42–1:52 — privacy and honesty

> “No evidence is sent to an AI or OCR provider. Tesseract runs locally. The public build accepts only bundled samples or files the tester confirms are fictional or fully redacted. Nothing reaches NCRP, police or a bank.”

### 1:52–2:00 — Codex and close

> “Codex was used throughout to research the official brief and citizen journey, design the product, implement the frontend and resilient backend, and test the complete flow. FIRST30: explain once, add once, review clearly.”

## Recording checklist

- Keep the final video under two minutes.
- Show the custom file picker, local reading progress, amount conflict, complaint, acknowledgement, follow-up, download and report check.
- Do not say the report reached NCRP or that funds were frozen or recovered.
- Keep the **Demo** label visible during submission and tracking.
- Provide the visible demo mobile and OTP in the submission form.
- Confirm the live link opens without requesting access.
