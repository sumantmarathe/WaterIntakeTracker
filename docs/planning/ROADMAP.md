# Product Roadmap: AquaPulse Water Intake Tracker

> **Product**: AquaPulse (`WaterIntakeTracker`)  
> **Customer**: Sumant Marathe  
> **Architecture Model**: Privacy-First, Zero-Knowledge, 100% Local-First (IndexedDB / DOM Storage)  
> **Governance Framework**: [sumantmarathe/DevelopmentTeam](https://github.com/sumantmarathe/DevelopmentTeam) — High-Assurance V-Cycle Model (IV&V)  
> **Branching Model**: Production Release on `main`; Active Engineering on Side Branches (`feat/*`, `fix/*`)  

---

## 🏛️ Dual-Target Application Strategy

```
+-------------------------------------------------------------------+
|            AquaPulse Core Codebase (HTML5 / CSS3 / ES6)           |
|   [View 1: Focused Hydration Logger]  <-->  [View 2: Data Table]  |
+-------------------------------------------------------------------+
                 |                                   |
                 v                                   v
+---------------------------------+ +-------------------------------+
|  Target 1: Production Web (PWA) | | Target 2: Native Android App  |
|  - GitHub Pages Static Hosting  | | - Native WebView Container    |
|  - Service Worker v1.0.0 Offline| | - Debug/Release APK & Play AAB|
+---------------------------------+ +-------------------------------+
```

---

## 🚀 Sprint Delivery Milestones

| Sprint | Objective | Target Version | Status | Key Deliverables |
| :--- | :--- | :--- | :--- | :--- |
| **Sprint 01** | **Minimalist Water Tracker MVP (Dual-Target)** | `v1.0.0` | 🟡 **GATE 5 READY (Awaiting Customer Merge Approval)** | Minimalist Hydration Logger start screen (progress ring, 1-tap vessels, custom entry, undo), seamless navigation link to full Water Intake Data Table & 7-day trend chart, 100% local IndexedDB persistence, JSON backup/restore, PWA offline Service Worker (`v1.0.0`), Native Android APK + Google Play `.aab` bundle configuration. |
| **Sprint 02** | **Google Drive Direct Cloud Sync & Reminders** | `v1.1.0` | ⚪ Planned | Client-side OAuth 2.0 Google Drive (`drive.file`) automatic backup/sync across Web & Android, customizable hydration reminder intervals. |
| **Sprint 03** | **Google Play Store Production Submission** | `v1.2.0` | ⚪ Planned | Signed production `.aab` upload to Google Play Console Internal/Closed Testing track, Digital Asset Links verification, and store listing assets. |
