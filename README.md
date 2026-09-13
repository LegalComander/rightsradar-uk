# RightsRadar UK

Independent UK legal-information website providing plain-English rights guides with jurisdiction labels and links to official sources.

## Current scope
- Scotland, England & Wales, and Northern Ireland rights guides
- Law Radar for newly published legislation and Parliamentary Bills
- Law Alerts infrastructure and PWA features
- RightsRadar AI: multilingual, jurisdiction-aware conversational legal-information assistant grounded in verified RightsRadar guides and their official sources
- Community accounts and member features
- Privacy, terms and legal-information disclaimer

## RightsRadar AI
The conversational assistant is account-based and keeps the existing verified-guide search available as a free fallback. It uses a small monthly free allowance and has server-side entitlement and usage tables ready for a paid Plus tier.

Production AI access requires `OPENAI_API_KEY` in Vercel. The model can be overridden with `OPENAI_MODEL`; the current default is `gpt-5.6-luna` for cost-sensitive multilingual use.

Do not commit provider API keys, Stripe secrets, database passwords, or other production secrets to this repository.

## Deployment
This repository deploys to Vercel from the `main` branch. Environment-variable changes require a new deployment before they are available to production functions.

RightsRadar UK provides general legal information, not personalised legal advice and not legal representation.
