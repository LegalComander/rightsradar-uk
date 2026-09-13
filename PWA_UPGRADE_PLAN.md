# RightsRadar UK PWA upgrade plan

This plan turns the installable website into a practical mobile legal-rights app while keeping privacy collection to a minimum.

## Phase 1 — App-like core (implemented)
Mobile navigation, Quick Help, jurisdiction preference, offline saved guides, accessibility controls, PWA shortcuts and guide verification/source transparency are implemented.

## Phase 2 — Law-change notifications
Delivery code, browser push subscriptions, topic/jurisdiction preferences, duplicate protection and daily dispatcher cron are implemented. Production still requires VAPID keys, CRON_SECRET and physical-phone testing. Email delivery remains separate.

## Phase 3 — RightsRadar AI (conversational beta code implemented; production AI key pending)

Implemented:
- Chat-style multilingual RightsRadar AI interface layered on top of the existing verified-guide catalogue.
- Existing free on-device verified-guide search remains available as a non-generative fallback.
- AI endpoint requires a signed-in RightsRadar account and same-origin POST requests.
- Legal-system selection for Scotland, England & Wales and Northern Ireland.
- AI legal claims are restricted by prompt and server-provided context to matched verified RightsRadar guide material.
- Server fetches matched RightsRadar guides itself; the browser cannot submit arbitrary external source text.
- Official-source links are extracted from the matched verified guides.
- The assistant is explicitly described as general legal information, not a solicitor, advocate, law firm or representative.
- High-stakes and case-specific situations are instructed to escalate to a qualified professional/official service.
- Multilingual response behaviour: answer in the language of the user's latest message unless another language is requested.
- Conversation context is kept in the browser tab and limited to recent turns; full AI conversations are not persisted to the RightsRadar database in this version.
- Monthly server-side usage meter implemented: Free = 5 AI questions/month; Plus entitlement target = 100 messages/month.
- Entitlement table is ready for Stripe webhook activation without trusting the browser to grant paid access.
- AI API key remains server-side only.

Production activation still required:
- Add `OPENAI_API_KEY` securely in Vercel; never commit it to GitHub.
- Optional `OPENAI_MODEL` override; default is the cost-sensitive multilingual model configured in code.
- Test grounding, multilingual answers, refusal/fallback behaviour and usage limits against real production accounts.
- Connect Stripe Checkout/webhooks/customer portal to `ai_assistant_entitlements` after test-mode subscription validation.
- Update privacy/terms before publicly processing real AI conversations or accepting paid subscriptions.

## Phase 4 — Law Radar 2.0
Official feeds, law/Bill separation, source health, filters, local saves and classification are implemented. Coming-into-force/recently-changed views, effective dates and verified summaries remain next.

## Phase 5 — Accessibility and language expansion
Persistent accessibility choices and simplified reading are implemented. Continue keyboard/screen-reader testing and language-interface expansion.

## Privacy principle
Collect the minimum information necessary. Device-only preferences should stay local. AI questions are only sent to a provider when the user deliberately uses conversational AI, and users must be warned not to include unnecessary sensitive/confidential information.
