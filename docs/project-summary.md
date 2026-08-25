# FIRST30 — project summary

Financial cyber-fraud victims lose time navigating complicated requirements, repeating details, losing partial forms and guessing whether their evidence is complete. FIRST30 reimagines that journey as five calm, plain-language stages designed for older and low-digital-literacy citizens: protect yourself, payment details, evidence, explain what happened, review and submit.

In the synthetic demo, Sunita Sharma signs in with visible credentials, records a fictional ₹18,499 UPI loss and uploads a receipt, scam chat and call log. Bundled Tesseract reads each image locally. Deterministic parsers identify amounts, UTRs, UPI IDs, phone numbers, institutions and timestamps; source links show where every fact came from. FIRST30 deliberately catches a ₹18,499 versus ₹18,400 contradiction instead of hiding it.

The citizen reviews a bilingual structured complaint before submitting to a prominently labelled mock NCRP backend. FIRST30 returns a fictional acknowledgement, creates one mock bank-statement request and tracks the response. The page first shows a simple status; an expandable receipt reveals the request ID, immutable snapshot, evidence checks, processing steps, retry count and audit-chain state. No external system is contacted.

An Evidence Passport remains part of the journey: a signed ZIP contains original evidence, a bilingual PDF, provenance data and checksums that recipients can verify without uploading evidence.

Behind that simple interface, a command service enforces valid state transitions. Case revisions prevent lost updates. Idempotency records make duplicate clicks safe. An encrypted immutable submission snapshot, workflow run and transactional outbox are created together, then processed through a typed mock gateway. Hash-linked audit events, recoverable D1/R2 evidence states, CSRF and same-origin checks, hashed rate limits and PII-free request logs demonstrate how a production reporting backend can be resilient and explainable.

FIRST30 improves completeness, reliability, clarity and continuity. It does not claim government acceptance, investigation, freezing or recovery. For real incidents, citizens are told to call 1930 and contact their bank directly.
