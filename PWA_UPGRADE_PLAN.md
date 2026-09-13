# RightsRadar UK PWA upgrade plan

This plan turns the installable website into a practical mobile legal-rights app while keeping privacy collection to a minimum.

## Phase 1 — App-like core (implemented)

- Mobile bottom navigation: Home, Help now, Law Radar, Saved, Settings.
- Desktop Settings launcher plus mobile Settings access.
- Quick Help / “I need help now” screen with jurisdiction-aware routes for stop/search, arrest/custody, police questioning, court, protests and police complaints.
- Local jurisdiction preference (Scotland, England & Wales, Northern Ireland) stored only on the device.
- Save pages for later and cache saved guides for offline use.
- Saved library page with remove/clear controls.
- Accessibility controls: text size, high contrast, reduced motion and read-aloud for supported browsers.
- Improved PWA shortcuts and service-worker cache handling.
- Guide verification/source-transparency panel showing jurisdiction, review date and linked official-source count.
- Privacy notice explains local device storage.

## Phase 2 — Law-change notifications (in progress)

Implemented:
- Browser push-subscription API and database schema.
- Device-only phone-alert controls on the Law Alerts page.
- Topic and jurisdiction preferences for each browser push subscription.
- Web Push service-worker display and notification-click deep links.
- Unsubscribe controls.
- Confirmation notification support after subscription.
- Law Alerts database endpoint fixed and verified live.

Still required before phone push can be switched on:
- Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as Vercel deployment secrets. The private key must never be committed to GitHub.
- Connect the notification sender to verified law-change events.
- Add automated delivery rules and duplicate-prevention state.

## Phase 3 — Verified RightsRadar Assistant

- Dedicated assistant screen.
- Answers grounded in RightsRadar verified guides and official-source links only.
- Always shows jurisdiction, source links, last-checked status and a legal-information disclaimer.
- Refuses to invent a rule when the verified source library does not support an answer.
- Quick actions from the Help Now screen into the assistant.

## Phase 4 — Law Change Radar 2.0

- Separate views for Published law, Proposed Bills, Coming into force and Recently changed.
- Topic and jurisdiction filters.
- Save/follow individual changes.
- Effective-date warnings and source status.
- “What changed?” plain-English summaries after verification.

## Phase 5 — Accessibility and language expansion

- Persistent accessibility profile.
- Simplified-reading mode.
- Additional language interfaces while keeping English official sources visible.
- Better screen-reader landmarks and keyboard navigation.

## Privacy principle

RightsRadar should collect the minimum information necessary. Device-only preferences, saved pages and accessibility settings should stay in browser storage unless the user explicitly chooses an account-based feature. Server-side collection should be reserved for services that genuinely require it, such as email alerts, community accounts or push subscriptions.
