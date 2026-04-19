# Android release build

## 1. Optional production signing
Add these values to your local Gradle properties before store publishing:

- QMS_RELEASE_STORE_FILE
- QMS_RELEASE_STORE_PASSWORD
- QMS_RELEASE_KEY_ALIAS
- QMS_RELEASE_KEY_PASSWORD

If they are not set, the project can still build a testable release artifact using the debug keystore.

## 2. Build commands

From the project root:

- npm run release:android
- npm run bundle:android

## 3. Output paths

- APK: android/app/build/outputs/apk/release/
- AAB: android/app/build/outputs/bundle/release/

## 4. Important note
Before store release, replace the release API URL in src/config/api.tsx with your public backend URL.
