# RightsRadar UK Android

Native Android app shell for the live RightsRadar UK service at https://rightsradaruk.vercel.app/.

## Current Android features

- Keeps RightsRadar pages inside the app.
- Opens external legal/source links in the user's browser.
- Uses HTTPS-only internal navigation.
- Enables JavaScript and DOM storage required by the existing site.
- Keeps third-party cookies disabled.
- Provides Android back navigation, loading progress, and a retry screen.
- Native bottom navigation for Home, New Laws, Alerts, Save, Saved and Share.
- Local saved/bookmarked RightsRadar pages.
- Android share sheet support for guides and rights pages.
- Firebase Cloud Messaging receiver for law-update push notifications.
- Push notifications can deep-link to a specific RightsRadar URL.
- Automatically subscribes Firebase-enabled installs to the `new_laws` topic.
- Uses the existing RightsRadar visual identity for launcher, splash and notification icons.
- Targets Android 16 / API 36.

## Android package

`uk.rightsradar.app`

Treat this package name as permanent once the app is registered with Firebase or published to Google Play.

## Firebase setup

Create/register the Android app in Firebase with package name `uk.rightsradar.app`, then download `google-services.json`.

For local Android Studio development, place it at:

`android-app/app/google-services.json`

For GitHub Actions, base64-encode the complete JSON file and store it as this repository secret:

`FIREBASE_GOOGLE_SERVICES_JSON_BASE64`

The file itself is excluded from git. When the secret is present, the build workflow restores it automatically and activates the Google Services plugin. Without it, the project still compiles, but Firebase push delivery is inactive.

FCM topic used by the app:

`new_laws`

A data message can include:

- `title` - notification title
- `body` - notification message
- `url` - an HTTPS URL on `rightsradaruk.vercel.app`

If the URL is absent or invalid, the notification opens `/new-laws.html`.

## Google Play signing

The CI workflow supports a secure upload keystore without committing it. Configure these repository secrets:

- `ANDROID_UPLOAD_KEYSTORE_BASE64`
- `ANDROID_UPLOAD_KEY_ALIAS`
- `ANDROID_UPLOAD_STORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_PASSWORD`

When all four are present, the release AAB is signed with the upload key. When they are absent, CI still builds the release bundle for verification but it is not ready to upload to Google Play.

Use Google Play App Signing for the final store signing key and keep the upload keystore backed up securely.

## Build outputs

The GitHub Actions workflow **Build RightsRadar Android** runs Android lint and builds:

- `rightsradar-uk-debug-apk` - installable test APK
- `rightsradar-uk-release-aab` - Google Play Android App Bundle; signed only when upload-key secrets are configured

For local development, open `android-app` in Android Studio with JDK 17 and Android SDK 36 installed. CI uses Gradle 9.6.0 and Android Gradle Plugin 9.4.0.

## Before public release

- Connect the Firebase Android app and test a real FCM notification on a physical phone.
- Add the permanent upload-key secrets and verify that the AAB is signed.
- Create the Play Console app and enable Play App Signing.
- Complete the Play Store listing, privacy/data-safety declarations, screenshots and support details.
- Test login, member, community, alerts, save/share and notification deep-link flows on physical Android devices.
- Add verified Android App Links after Play signing certificate fingerprints are known.
