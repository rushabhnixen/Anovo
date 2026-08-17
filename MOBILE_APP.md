# Anovo Mobile App

Anovo ships as a Capacitor 8 app for Android and iOS. The Next.js frontend is statically exported and bundled into each native binary; the AI API remains hosted at `https://rushabh13-anovo-api.hf.space`.

This avoids relying on Capacitor's development-only remote `server.url` setting and gives the app native behavior: connectivity awareness, Android back handling, deep links, sharing, haptics, splash/status-bar integration, and safe-area navigation.

## App identity

| Field | Value |
|---|---|
| App name | Anovo |
| Android application ID | `com.soniqinfotech.anovo` |
| iOS bundle ID | `com.soniqinfotech.anovo` |
| Version | `1.0.2` |
| Android version code | `3` |
| Minimum Android | API 24 |
| Android compile/target SDK | API 36 |
| Minimum iOS | iOS 15 |
| Deep link | `anovo://humanize`, `anovo://paraphrase`, etc. |
| Account deletion URL | `https://anovo.vercel.app/account` |
| Privacy URL | `https://anovo.vercel.app/privacy` |

Package and bundle IDs are permanent after the first store release. Anovo uses the same `com.soniqinfotech` namespace as Soniq Infotech's existing Play apps.

## Build and sync

From `frontend/`:

```bash
npm ci
npm run mobile:sync
npm run mobile:assets
```

`mobile:sync` builds the static export with the production API URL and copies it into both native projects. Run it after every web change. `mobile:assets` generates all launcher icons and splash images from the Anovo brand mark.

For live browser development, continue to use `npm run dev`; the standard Next/Vercel build is unchanged.

## Android release

Prerequisites: Android Studio, Android SDK 36, Java 21, and a Play Console developer account.

1. Run `npm run mobile:sync` and `npm run mobile:assets`.
2. Open `frontend/android` in Android Studio.
3. Test on a physical device and at least one API 24 emulator.
4. In `android/app/build.gradle`, increment `versionCode` for every upload and update `versionName` for user-visible releases.
5. Use **Build > Generate Signed Bundle / APK > Android App Bundle**, or the
   command line below.
6. Create or select a release keystore and keep it outside this repository. Enable Play App Signing.
7. Upload the `.aab` to an Internal testing release first, complete Play's automated checks, then promote it.

### Signing from the command line (no password on disk)

Preferred: pass the credentials as environment variables, so nothing is written
to disk. On Windows, with the upload key stored as an encrypted PowerShell
credential:

```powershell
$dir  = "$HOME\Documents\Anovo Play Release"
$jks  = Join-Path $dir 'anovo-upload-key.jks'
$cred = Import-CliXml (Join-Path $dir 'anovo-upload-key.credential.clixml')
$pw   = $cred.GetNetworkCredential().Password

# Confirm the alias stored in the keystore
$alias = (& keytool -list -v -keystore $jks -storepass $pw |
          Select-String '^Alias name: (.+)$').Matches[0].Groups[1].Value.Trim()

$env:ANOVO_KEYSTORE_FILE     = $jks
$env:ANOVO_KEYSTORE_PASSWORD = $pw
$env:ANOVO_KEY_ALIAS         = $alias
$env:ANOVO_KEY_PASSWORD      = $pw   # change if the key has its own password

Set-Location "$HOME\Desktop\Projects\2026\Anovo\frontend\android"
.\gradlew.bat assembleRelease bundleRelease
```

Outputs:
- `app/build/outputs/apk/release/app-release.apk`
- `app/build/outputs/bundle/release/app-release.aab`

Clear the variables afterwards with
`Remove-Item Env:ANOVO_KEYSTORE_PASSWORD, Env:ANOVO_KEY_PASSWORD`.

### Signing via keystore.properties

Create `frontend/android/keystore.properties` (gitignored, never committed):

```properties
storeFile=C:/Users/<you>/Documents/Anovo Play Release/anovo-upload-key.jks
storePassword=<store password>
keyAlias=<alias>
keyPassword=<key password>
```

Then:

```bash
cd frontend/android
./gradlew bundleRelease
```

The signed bundle is written to `app/build/outputs/bundle/release/app-release.aab`.
Without `keystore.properties` the build still succeeds but the bundle is
unsigned, which Play will reject — sign it before uploading.

Never commit `.jks`, `.keystore`, passwords, or `local.properties`.

## iOS release

An iOS archive requires macOS, current Xcode, an Apple Developer membership, and an App Store Connect record.

1. On the Mac, run `npm ci`, `npm run mobile:sync`, and `npm run mobile:assets`.
2. Open `frontend/ios/App/App.xcodeproj`.
3. Select the Anovo target, choose the correct Apple development team, and confirm bundle ID `com.soniqinfotech.anovo`.
4. Increment the build number for every upload and update the marketing version when appropriate.
5. Test on iPhone and iPad, then choose **Product > Archive** and upload through Xcode Organizer.
6. Add review notes explaining the writing tools and native share/offline/deep-link behavior, plus a demo account if reviewers need premium access.

## Store listing starter copy

**Name:** Anovo — AI Writing Tools

**Short description:** Paraphrase, humanize, summarize, translate, and improve writing with AI.

**Full description:**

> Anovo brings practical AI writing tools into one focused app. Rewrite sentences, choose contextual alternatives for individual words, humanize drafts, check grammar, summarize long text, translate content, analyze tone, and continue ideas with Co-Writer. Select text to compare multiple rephrasing options, then apply the version that best matches your meaning and voice. Anovo supports light and dark themes, native sharing, deep links, and clear connectivity feedback.

Suggested category: **Productivity**. The app contains no ads and requests no location, contacts, camera, microphone, or advertising ID permissions.

## Play Console declarations

Review these against the live backend before submitting:

| Data / access | Suggested declaration |
|---|---|
| Account info | Email address and username are collected when a user registers |
| Authentication | Passwords are processed and stored only as one-way hashes; a token is stored on-device |
| User content | Submitted writing/documents are transmitted for the requested AI processing |
| Account deletion | Available in-app and at `https://anovo.vercel.app/account` |
| Encryption | Data is sent over HTTPS |
| Permissions | Internet only; native share sheet does not grant broad file/device access |
| Ads / tracking | None in the current codebase |

Complete the Data safety form, content rating, target audience, privacy-policy URL, account-deletion URL, and App access section. If premium tools need a login, give reviewers a working demo account.

## Final release checks

- Verify every writing tool against the production API on Wi-Fi and mobile data.
- Verify offline banner, reconnect, Android back behavior, share sheet, dark mode, and `anovo://humanize`.
- Delete a test account and confirm it can no longer sign in.
- Capture phone and tablet screenshots from the actual release candidate.
- Confirm privacy wording matches every production AI provider and its retention behavior.
- Confirm icons contain no transparency where the store forbids it.
- Run frontend tests/type checks and backend tests.
- Upload to internal/TestFlight testing before production review.
