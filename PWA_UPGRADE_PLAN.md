# RightsRadar UK PWA upgrade plan

This plan turns the installable website into a practical mobile legal-rights app while keeping privacy collection to a minimum.

## Phase 1 — App-like core (implemented)

- Mobile bottom navigation: Home, Help now, Law Radar, Saved, Settings.
- Quick Help / “I need help now” screen with jurisdiction-aware routes for stop/search, arrest/custody, police questioning, court, protests and police complaints.
- Local jurisdiction preference (Scotland, England & Wales, Northern Ireland) stored only on the device.
- Save pages for later and cache saved guides for offline use.
- Saved library page with remove/clear controls.
- Accessibility controls: text size, high contrast, reduced motion and read-aloud for supported browsers.
- Improved PWA shortcuts and service-worker cache handling.
- Privacy notice updated to explain local device storage.

## Phase 2 — Law-change notifications

- Browser push-subscription endpoint.
- VAPID keys stored as deployment secrets (private key never committed).
- Topic and jurisdiction subscriptions matching the Law Alerts preferences.
- Notification sender for important verified law changes.
- Notification tap deep-links to the relevant RightsRadar page.
- Unsubscribe / notification settings controls.

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
