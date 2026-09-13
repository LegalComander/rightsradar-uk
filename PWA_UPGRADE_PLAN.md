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

## Phase 2 — Law-change notifications (delivery code implemented; production keys pending)

Implemented:
- Browser push-subscription API and database schema.
- Device-only phone-alert controls on the Law Alerts page.
- Topic and jurisdiction preferences for each browser push subscription.
- Web Push service-worker display and notification-click deep links.
- Unsubscribe controls.
- Confirmation notification support after subscription.
- Law Alerts database endpoint fixed and verified live previously.
- Secure law-alert dispatcher endpoint.
- Official published-law events are matched against subscription jurisdiction and topic preferences.
- Duplicate-delivery protection prevents the same event being pushed twice to the same endpoint.
- Expired browser push endpoints are automatically marked inactive.
- Dispatcher only alerts on published legislation; Parliamentary Bills are not pushed as enacted law.
- Daily Vercel cron definition added for the dispatcher.

Still required before automatic phone delivery can run in production:
- Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as Vercel deployment secrets. The private key must never be committed to GitHub.
- Add `CRON_SECRET` as a Vercel deployment secret so the scheduled dispatcher can authenticate securely.
- Test a real browser/PWA notification on a physical phone after the keys are present.
- Review topic-classification accuracy against real law-feed entries and expand rules where necessary.

Email alert delivery remains a separate future step; email preferences can be stored but there is not yet a transactional email sender.

## Phase 3 — Verified RightsRadar Assistant (privacy-first beta implemented)

Implemented:
- Dedicated `Ask RightsRadar` screen.
- Plain-English question matching against the verified guide catalogue for Scotland, England & Wales and Northern Ireland.
- Jurisdiction choice follows the device-only RightsRadar preference.
- Matching is performed in the browser; questions are not sent to an AI model and are not stored by an account in this beta.
- Results open the real verified guide, show the guide jurisdiction, display the review/last-checked label when present and surface official-source links from that guide.
- The assistant does not generate or invent a legal rule. If the catalogue does not contain a reliable match, it says there is not enough verified information and routes the user to Help Now instead.
- Quick Help links into the assistant and the PWA manifest includes an Ask RightsRadar shortcut.
- Assistant shell and matching script are cached by the PWA for reliable access.

Next:
- Expand the catalogue as new verified guides are added.
- Improve intent matching and typo tolerance without sending questions off-device.
- Add structured answer cards using only pre-verified guide passages.
- Consider an optional generative layer later only if it can remain strictly grounded in verified RightsRadar/official sources, clearly cite its sources, and meet privacy/cost requirements.

## Phase 4 — Law Radar 2.0 (partly implemented)

Implemented:
- Live official feeds for newly published legislation and Parliamentary Bills.
- Published-law and proposed-Bill separation.
- Source-health reporting for legislation.gov.uk and UK Parliament Bills.
- Search plus jurisdiction and topic filters.
- Automatic lightweight jurisdiction/topic classification for feed items.
- Result counters and clearer status labels.
- Save individual law/Bill updates on the device without an account.
- Dedicated Saved filter retains a local snapshot even after an item drops out of the current live feed, while warning users to reopen the official source for the current position.

Next:
- Separate Coming into force and Recently changed views using verified commencement/change data.
- Effective-date warnings where official commencement data can be verified.
- “What changed?” plain-English summaries after verification.
- Improve classification from keyword rules toward source-backed metadata where available.
- Optional account-based following later for cross-device sync; keep device-only saves as the privacy-first default.

## Phase 5 — Accessibility and language expansion (started)

Implemented:
- Persistent accessibility choices for text size, high contrast and reduced motion.
- Read-aloud support where the browser provides speech synthesis.
- Simplified-reading mode that keeps the same legal text, warnings and source links while narrowing the reading column and increasing line/paragraph spacing.
- Simplified-reading preference is stored only on the device.
- Escape-key support for closing the Settings sheet on keyboard devices.

Next:
- Additional language interfaces while keeping English official sources visible.
- Better screen-reader landmarks and keyboard navigation across every page.
- Test accessibility against WCAG-focused automated checks and real keyboard/screen-reader flows.

## Privacy principle

RightsRadar should collect the minimum information necessary. Device-only preferences, saved pages and accessibility settings should stay in browser storage unless the user explicitly chooses an account-based feature. Server-side collection should be reserved for services that genuinely require it, such as email alerts, community accounts or push subscriptions.
