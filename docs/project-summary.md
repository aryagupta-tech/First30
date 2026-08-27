# FIRST30 — project summary

Financial cyber-fraud victims lose critical time navigating complicated requirements, repeating details, losing partial forms and guessing whether their evidence is complete. FIRST30 independently reimagines that public-service journey as five calm, plain-language stages designed for older and low-digital-literacy citizens: protect yourself, payment details, screenshots, explain what happened, review and finish.

The working prototype accepts bundled samples or citizen-supplied fictional or fully redacted test images. Bundled Tesseract reads receipt, scam-chat, call-log and bank-statement screenshots locally on the device. Transparent parsers identify Indian amounts, transaction references, UPI IDs, phone numbers, institutions and timestamps. Every important fact remains linked to its screenshot. In the judged case, FIRST30 catches a ₹18,499 receipt versus ₹18,400 chat mismatch instead of silently guessing.

The citizen reviews a clear English complaint, completes a clearly labelled mock submission, receives a fictional acknowledgement, responds to one additional-document request and downloads a complete report containing the complaint, original screenshots and case summary. The report can later be checked for changes without uploading its evidence.

Behind the simple interface, case revisions prevent lost edits; idempotency makes repeated clicks safe; AES-GCM protects the immutable fictional submission; a transactional outbox supports resumable processing; recoverable D1/R2 storage states protect uploads; and a hash-linked audit history makes processing traceable.

FIRST30 improves completeness, reliability, clarity and continuity. It never claims government acceptance, investigation, freezing or recovery. No real government, bank, police, AI or OCR service is contacted. For a real incident, citizens are told to call 1930 and contact their bank immediately.
