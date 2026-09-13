# RightsRadar UK Android

Native Android wrapper for the live RightsRadar UK service at https://rightsradaruk.vercel.app/.

## What this first version does

- Keeps RightsRadar pages inside the app.
- Opens external legal/source links in the user's browser.
- Uses HTTPS-only internal navigation.
- Enables JavaScript and DOM storage required by the existing site.
- Keeps third-party cookies disabled.
- Provides Android back navigation, loading progress, and a retry screen.
- Uses the existing RightsRadar visual identity for the launcher and splash screen.
- Targets Android 16 / API 36 for current Google Play submission requirements.

## Android package

`uk.rightsradar.app`

The package name should be treated as permanent once the app is published to Google Play.

## Build a test APK

The repository includes a GitHub Actions workflow named **Build RightsRadar Android**. Run it from the Actions tab, or push a change under `android-app/`. The workflow uploads a debug APK artifact called `rightsradar-uk-debug-apk`.

For local development, open `android-app` as the project in Android Studio with JDK 17 and Android SDK 36 installed. The CI build uses Gradle 9.6.0 and Android Gradle Plugin 9.4.0.

## Before Google Play release

1. Create the permanent release/upload signing key and keep it backed up securely.
2. Configure a signed release Android App Bundle (AAB).
3. Add Play Store listing artwork, screenshots, support/contact details and privacy declarations.
4. Test login/member/community/alert flows on physical Android devices.
5. Add verified app links after the signing certificate SHA-256 is known.

## Future native features

The current architecture can later add push notifications for new laws, saved/offline guides, share actions, native search, biometric-protected member sessions, and other Android-specific features while continuing to use the same RightsRadar backend.
