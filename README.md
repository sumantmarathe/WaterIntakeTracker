# AquaPulse — Minimalist Water Intake Tracker

> **Governance Framework**: [sumantmarathe/DevelopmentTeam](https://github.com/sumantmarathe/DevelopmentTeam) (High-Assurance V-Cycle Model)  
> **Target Platforms**: Dual-Target Progressive Web App (GitHub Pages) & Native Android Application (`.apk` / Google Play `.aab`)  
> **Privacy Architecture**: 100% Local-First (IndexedDB / DOM Storage), Zero-Knowledge, Zero External Tracking

---

## Overview

**AquaPulse** (`WaterIntakeTracker`) is a minimalist, premium-designed hydration logger and analytics application built under the High-Assurance V-Cycle Governance Framework.

### Key Highlights
- **Focused Hydration Logger Start Screen**: Animated liquid progress ring, daily target tracking, hydration streak counter, 1-tap vessel presets (`+150ml`, `+250ml`, `+500ml`, `+750ml`), custom intake entry (`Water`, `Sparkling`, `Electrolyte`, `Herbal Tea`), and instant "Undo Last" recovery.
- **Seamless Link to Complete Hydration Data Table**: Dedicated History & Data Table view reachable with one tap from either the top segmented navigation or the Logger's "View Full Hydration Data Table" action link.
- **Full Tabular Log & Filtering**: Filter by date range (`Today`, `Last 7 Days`, `This Month`, `All Time`, or custom date), beverage type, and search query, with 7-day hydration bar chart and summary metrics.
- **100% On-Device Privacy & Portability**: Data is stored locally in IndexedDB (`WaterIntakeTrackerDB`) with automatic `localStorage` fallback and full JSON backup export/import.
- **Dual-Target Parity**: Identical runtime and offline capabilities across Web (PWA Service Worker `v1.0.0`) and Native Android (`android/` WebView wrapper with hardware back-button support and Google Play `.aab` packaging).

---

## Repository Structure

```
WaterIntakeTracker/
├── .agents/rules/          # Auto-discovered DevelopmentTeam governance rules
├── android/                # Native Android WebView container (APK & Play Store AAB)
├── css/style.css           # Vanilla CSS design system, glassmorphism & mobile layout
├── js/
│   ├── waterLogic.js       # Pure hydration calculations, filtering & validation
│   ├── storage.js          # IndexedDB + LocalStorage repository & JSON backup engine
│   └── app.js              # UI controller, view switcher & PWA manager
├── docs/
│   ├── requirements/       # Gate 0 Requirements & Gherkin Specifications
│   ├── design/             # Gate 1 Architecture & Pre-Flight Specs
│   ├── tasks/              # Sprint Task Tracking (DoR / DoD)
│   ├── v-cycle/            # Requirements Traceability Matrix (RTM) & Workflow
│   └── audits/             # Gate 4 (L1 Review), Gate 5 (L2 Audit) & QA Evidence
├── scripts/
│   └── build-android.mjs   # Dual-target asset sync & Gradle APK/AAB builder
└── tests/
    ├── unit/               # Pure logic unit test suite (node --test)
    └── integration/        # Persistence & dual-target parity integration tests
```

---

## Verification & Build Commands

```bash
# Run automated unit and integration test suites
npm test

# Synchronize web assets and compile Android Debug APK
npm run build:android

# Compile Google Play Console Release App Bundle (.aab)
node scripts/build-android.mjs --bundle
```
