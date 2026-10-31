# 03 - Dual-Target Engineering Standards (Web & Android)

Every project within this framework must be engineered for dual release:

1. **Web Target**:
   - Progressive Web App (PWA) installable in modern browsers.
   - 100% static client-side architecture (HTML5, Vanilla CSS, ES Modules).
   - Zero-config deployment to static hosts (GitHub Pages, Firebase, S3, Cloudflare Pages).
   - Offline-capable through Service Worker caching.

2. **Native Android Target**:
   - Standalone native Android wrapper located in `android/`.
   - Native `WebView` configuration with DOM storage and IndexedDB enabled.
   - Clean hardware back-button handling, safe area insets, and orientation support.
   - Automated asset synchronization script (`scripts/build-android.mjs`) that copies web assets into Android `assets/` directory before compilation.
   - Release APK compiled via Gradle wrapper (`./gradlew assembleDebug` or `assembleRelease`).

3. **Asset & Logic Parity**:
   - Never write separate application logic for mobile vs web.
   - Both targets run the exact same core codebase, ensuring zero drift between platforms.
