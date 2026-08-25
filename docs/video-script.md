# FIRST30 — two-minute video script

## 0:00–1:00 · Citizen journey

“After financial cyber fraud, victims face a second problem: complicated requirements, repeated forms, unclear evidence and lost progress. FIRST30 is our independent redesign of that journey.”

Show the warning strip. “For a real incident, call 1930, contact the bank through a trusted number and never share an OTP.”

Open `/report`. Use mobile `90000 00000` and OTP `123456`. “This is Sunita Sharma, a completely fictional citizen.”

Complete urgent triage for the ₹18,499 UPI loss, then load the three-file sample.

“The receipt, scam chat and call log are read locally. Each fact stays linked to its source. FIRST30 catches the ₹18,499 receipt and ₹18,400 message mismatch instead of silently choosing one.”

Continue to the complaint. “Sunita explains the incident naturally—no awkward character restriction. FIRST30 turns confirmed facts into the structured bilingual complaint.”

Show the exact payload and the mock warning, then submit. “This `F30-DEMO` acknowledgement exists only inside FIRST30. Nothing was sent to a real institution.”

## 1:00–2:00 · Follow-up and build decisions

Show tracking and the additional bank-statement request. Attach the synthetic statement and show the completed timeline.

“Citizens do not lose context when more evidence is requested. The report, acknowledgement, timeline and response remain together.”

Download the package. “The Evidence Passport adds source mapping, conflicts, original files and SHA-256 checksums. A recipient can verify the whole ZIP locally without uploading evidence.”

“No runtime AI or OCR API is required. Bundled Tesseract runs in a browser Web Worker; transparent parsers normalize Indian payment facts; deterministic rules expose support, gaps and conflicts. D1 stores structured case data, R2-compatible storage holds evidence, and signed 24-hour sessions protect ownership.”

“Codex helped us research the brief and NCRP journey, design the citizen experience, implement and validate the working prototype.”

End on the landing page: “FIRST30: explain once, upload once, review clearly, submit and track.”
