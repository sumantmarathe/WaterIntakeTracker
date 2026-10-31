# Changelog — AquaPulse Water Intake Tracker

All notable changes to this project are documented in this file under the High-Assurance V-Cycle Governance Framework.

---

## [1.0.0] - 2026-10-31 (Sprint 01 MVP — Dual-Target Release)

### Added
- **Focused Hydration Logger Start View (`REQ-001`, `REQ-002`)**:
  - Minimalist, distraction-free initial logger screen with animated SVG circular progress ring, completion percentage, remaining milliliters indicator, and consecutive-day hydration streak counter.
  - Customizable Daily Hydration Target modal (`500 ml` – `10,000 ml`, with quick chips for `2,000 ml`, `2,500 ml`, `3,000 ml`, and `3,500 ml`).
- **One-Tap Quick Vessels & Custom Intake Entry (`REQ-003`, `REQ-004`)**:
  - Instant 1-tap quick-log vessel cards (`+150 ml Small Cup`, `+250 ml Standard Glass`, `+500 ml Water Bottle`, `+750 ml Sports Flask`).
  - Custom intake form supporting custom volume (`ml`), beverage type (`Pure Water`, `Sparkling Water`, `Electrolyte Mix`, `Herbal Tea`, `Coconut Water`), date, time, and optional note.
  - Single-tap **Undo Last** button to immediately revert accidental logs.
- **Seamless Link to Water Intake Data Table & History (`REQ-001`, `REQ-005`)**:
  - Compact "Today's Recent Logs" preview strip and prominent **`View Full Water Intake Data Table →`** bridge card on the Logger screen, plus top segmented navigation (`Hydration Logger` / `Data Table & History`, mobile concise labels `Logger` / `Data Table`).
  - Complete **Water Intake Data Table (Per Time & Day)** and **Daily Hydration Rollup Table (Per Day)** with **Last 7 Days Hydration Trend** bar chart, KPI summary cards, and real-time filtering by Date Period (`All Time`, `Today`, `Last 7 Days`, `This Month`, `Specific Date`), Beverage Type, and Search query.
- **100% Local-First Persistence & Zero-Knowledge Backup (`REQ-006`, `REQ-007`)**:
  - Client-side `IndexedDB` (`WaterIntakeTrackerDB`) with automatic `localStorage` fallback.
  - Cross-device JSON Backup Export, Import, and Safe Purge confirmation modal.
- **Dual-Target Web PWA & Native Android App (`REQ-008`, `REQ-009`, `REQ-010`)**:
  - PWA `manifest.json`, offline Service Worker (`water-tracker-cache-v1.0.0`), and custom generated icons (`192x192`, `512x512`).
  - Native Android WebView project (`android/`, `com.sumantmarathe.waterintaketracker`) with hardware back-button support and `scripts/build-android.mjs` for building `.apk` and Google Play `.aab` bundles.
