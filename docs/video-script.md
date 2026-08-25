# FIRST30 — two-minute video script

## 0:00–1:00 · Citizen journey

“After financial cyber fraud, victims face a second problem: complicated requirements, repeated forms, unclear evidence and lost progress. FIRST30 is our independent redesign of that journey.”

Show the warning strip. “For a real incident, call 1930, contact the bank through a trusted number and never share an OTP.”

Open `/report`. Use mobile `90000 00000` and OTP `123456`. “This is Sunita Sharma, a completely fictional citizen. Easy Mode uses five plain-language steps, large controls, English or Hindi and a Listen button for every instruction.”

Complete urgent triage for the ₹18,499 UPI loss, then load the three-file sample.

“The receipt, scam chat and call log are read locally. Each fact stays linked to its source. FIRST30 catches the ₹18,499 receipt and ₹18,400 message mismatch instead of silently choosing one.”

Continue to the complaint. “Sunita explains the incident naturally—no awkward character restriction. FIRST30 turns confirmed facts into the structured bilingual complaint.”

Show the review and mock warning, then submit. “A safe submission is not just a button click. FIRST30 locks one encrypted report snapshot, records the command once and queues processing before returning this `F30-DEMO` acknowledgement. Nothing was sent to a real institution.”

## 1:00–2:00 · Follow-up and build decisions

Show the simple tracking status, then expand “How FIRST30 processed this report.” “The citizen sees a simple answer first. The receipt below proves which evidence checks ran, which workflow steps completed, whether retries happened and whether the audit chain is intact.”

Show the additional bank-statement request. Attach the synthetic statement and show the completed timeline.

“Citizens do not lose context when more evidence is requested. The report, acknowledgement, timeline and response remain together.”

Download the package. “The Evidence Passport adds source mapping, conflicts, original files and SHA-256 checksums. A recipient can verify the whole ZIP locally without uploading evidence.”

“No runtime AI or OCR API is required. Bundled Tesseract runs locally; transparent parsers normalize Indian payment facts; deterministic rules expose support, gaps and conflicts. Underneath, revision checks prevent lost edits, idempotency makes duplicate clicks safe, a transactional outbox survives interrupted submission, and AES-GCM protects the fictional profile and frozen payload. D1 stores structured case data, R2-compatible storage holds evidence, and hash-linked audit events make processing traceable.”

“Codex helped us research the brief and NCRP journey, design the citizen experience, implement and validate the working prototype.”

End on the landing page: “FIRST30: explain once, upload once, review clearly, submit and track.”
