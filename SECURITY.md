# Security Policy

Security and privacy are core requirements for FIRST30 because the application models a cyber-fraud reporting workflow and handles uploaded evidence.

## Supported versions

FIRST30 is a hackathon prototype. Security fixes are applied only to the latest revision on the `main` branch and the current public demo.

| Version | Supported |
| --- | --- |
| Latest `main` revision | Yes |
| Current public demo | Yes |
| Older commits, forks and unofficial deployments | No |

## Reporting a vulnerability

Please do **not** disclose suspected vulnerabilities in a public issue, discussion, pull request or social-media post.

1. Use GitHub's private vulnerability reporting option in this repository's **Security** tab, when available.
2. If private reporting is unavailable, contact the maintainer through the [Arya Gupta GitHub profile](https://github.com/aryagupta-tech) and request a private communication channel. Do not include exploit details, secrets or citizen data in the initial public message.
3. Include the affected route or component, reproduction steps, expected impact and a minimal proof of concept using synthetic data only.

You should receive an acknowledgement within three business days and a status update within fourteen days. Please allow time for investigation and remediation before publishing details.

## In scope

- Authentication, signed-session or CSRF bypasses
- Cross-session access to cases, evidence or exports
- Exposure of secrets, fictional profile data or evidence bytes
- Unsafe file upload, MIME-validation or path-handling behavior
- Signature, manifest or Evidence Passport verification bypasses
- Encryption, audit-chain, idempotency or workflow-integrity failures
- Injection, cross-site scripting, request forgery and denial-of-service issues

## Out of scope

- Social engineering, phishing or physical attacks
- Automated testing that degrades the public demo
- Reports based only on missing headers without a demonstrated impact
- Attacks requiring access to a user's unlocked device or browser session
- Vulnerabilities in unsupported forks or modified deployments
- Claims that the mock NCRP workflow does not contact a real institution; this is an intentional, disclosed prototype boundary

## Safe testing rules

- Use only the bundled fictional case or your own synthetic data.
- Never upload real fraud evidence, personal information, credentials, OTPs or financial details.
- Do not access, change, retain or share another user's data.
- Do not run destructive, high-volume or availability-impacting tests.
- Stop testing and report immediately if you encounter data that is not yours.

## Deployment guidance

Anyone deploying a fork must provide a unique `SESSION_SECRET` of at least 32 cryptographically random characters through the runtime secret store. Never commit `.env` files, production secrets or real evidence. Review Cloudflare D1/R2 access, retention and logging settings before using the application outside its synthetic demonstration scope.

FIRST30 is not an official government service and is not approved for processing real incidents in its current form.
