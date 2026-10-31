# Requirements Traceability Matrix (RTM)

> **Governance Framework**: High-Assurance V-Cycle Model ([sumantmarathe/DevelopmentTeam](https://github.com/sumantmarathe/DevelopmentTeam))  
> **Sprint**: Sprint 01 — AquaPulse Water Intake Tracker MVP (`v1.0.0`)  
> **Target Delivery**: Web (GitHub Pages PWA) & Native Android Application (`.apk` / Google Play `.aab`)  
> **Branch**: `feat/sprint-01-water-tracker-mvp`  
> **Status**: 🟢 100% Verified & Certified  

---

## Complete Verification & Traceability Coverage

| Req ID | Customer Need | Description | Design Spec | Implementation | Unit / Integration Test | E2E / QA Evidence | L1 Sign-off | L2 Sign-off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-001** | CN-01 | Focused Hydration Logger Start View & Segmented Link to Data Table | `SPEC-001#S3` | `index.html#L59-L80`, `js/app.js#L186-L227` | `dual_target_parity.test.mjs` | `e2e_qa_verification.mjs`, `web_desktop_logger.png` | 🟢 Approved | 🟢 Certified |
| **REQ-002** | CN-02 | Real-Time Daily Hydration Progress Ring, Streak & Goal Customization | `SPEC-001#S2,S3` | `js/waterLogic.js#L155-L216`, `js/app.js#L325-L382` | `water_logic.test.mjs` (TC-03, TC-05, TC-06, TC-07) | `web_desktop_logger.png`, `mobile_390px_logger.png` | 🟢 Approved | 🟢 Certified |
| **REQ-003** | CN-02 | 1-Tap Quick-Add Vessel Presets (`+150`, `+250`, `+500`, `+750 ml`) & Custom Entry | `SPEC-001#S2.1` | `js/waterLogic.js#L12-L17,L74-L116`, `js/app.js#L240-L289` | `water_logic.test.mjs` (TC-01, TC-02, TC-04) | `e2e_qa_verification.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-004** | CN-02 | Instant "Undo Last Entry" & Individual Row Deletion | `SPEC-001#S3` | `js/storage.js#L187-L221`, `js/app.js#L129-L141,L258` | `storage_persistence.test.mjs` (IT-02) | `e2e_qa_verification.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-005** | CN-01,03 | Water Intake Data Table per Time/Day, Daily Rollup & 7-Day Trend Chart | `SPEC-001#S3` | `js/waterLogic.js#L223-L336`, `js/app.js#L417-L515` | `water_logic.test.mjs` (TC-08, TC-09, TC-10) | `web_desktop_datatable.png`, `mobile_390px_datatable.png` | 🟢 Approved | 🟢 Certified |
| **REQ-006** | CN-04 | 100% Local-First Persistence (`IndexedDB` + `localStorage` Fallback) | `SPEC-001#S1` | `js/storage.js#L25-L185` | `storage_persistence.test.mjs` (IT-01, IT-03) | `e2e_qa_verification.mjs` | 🟢 Approved | 🟢 Certified |
| **REQ-007** | CN-04 | Zero-Knowledge JSON Backup Export, Restore & Safe Purge Modal | `SPEC-001#S2.3` | `js/waterLogic.js#L343-L398`, `js/storage.js#L283-L315` | `water_logic.test.mjs` (TC-11, TC-12), `storage_persistence.test.mjs` (IT-04) | `web_desktop_datatable.png` | 🟢 Approved | 🟢 Certified |
| **REQ-008** | CN-02,05 | Minimalist Premium UI/UX & Mobile Viewport Optimization (`360px–412px`) | `SPEC-001#S3` | `css/style.css#L1-L650` | `water_logic.test.mjs` (TC-13) | `mobile_390px_logger.png`, `mobile_390px_datatable.png` | 🟢 Approved | 🟢 Certified |
| **REQ-009** | CN-05 | Progressive Web App (PWA) Manifest & Offline Service Worker (`v1.0.0`) | `SPEC-001#S4` | `manifest.json`, `sw.js`, `icons/` | `dual_target_parity.test.mjs` (DT-01, DT-02) | Automated SW & Manifest Audit | 🟢 Approved | 🟢 Certified |
| **REQ-010** | CN-06 | Dual-Target Native Android Wrapper (`.apk` & Google Play `.aab`) | `SPEC-001#S4` | `android/`, `MainActivity.kt`, `scripts/build-android.mjs` | `dual_target_parity.test.mjs` (DT-03, DT-04) | `app-debug.apk` Gradle Build | 🟢 Approved | 🟢 Certified |
