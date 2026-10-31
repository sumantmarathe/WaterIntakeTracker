# Software Requirements Specification (SRS): AquaPulse Water Intake Tracker MVP

**Document ID**: `REQ-SPEC-001`  
**Parent Epic**: `EPIC-01: Minimalist Dual-Target Water Intake Tracker`  
**Sprint**: Sprint 01  
**Target Platforms**: Web (PWA / GitHub Pages) & Native Android App (`.apk` / Google Play `.aab`)  
**Author**: Requirements Analyst  
**Approved By**: Tech Lead (Gate 0 Clearance)  
**Status**: 🟢 APPROVED  

---

## 1. Executive Summary & Business Objective

The Customer requested a **simple, minimalist, premium-looking, easy-to-use water intake tracker app** targeted first for web deployment (GitHub Pages) and simultaneously engineered as a deployable native Android app for the Google Play Console.

Crucially, the Customer specified:
> *"Know that its not necessary to just show entire water intake table per time/day at the start. There could be a simple logger at the start, then followed by some way to link to the data table."*

Accordingly, the application starts on a distraction-free **Hydration Logger** view (animated liquid ring, daily target progress, 1-tap vessel buttons, custom intake entry, and compact "Today's Recent" preview) with a prominent, ergonomic **link and segmented tab to open the complete Water Intake Data Table & History view**.

---

## 2. Traceable Functional & Non-Functional Requirements

### `REQ-001`: Focused Hydration Logger Start View & Segmented Navigation to Data Table
- **Description**: Upon launch, the application must display the minimalist **Hydration Logger** view by default without cluttering the initial screen with the full historical data table. It must provide both a prominent interactive call-to-action link (`View Full Hydration Data Table →`) and a top responsive segmented navigation bar (`Hydration Logger` / `Data Table & History`, with concise mobile labels `Logger` / `History`) to switch seamlessly between the Logger and the Data Table.
- **Platform Scope**: Web & Android (including hardware back-button navigation from Data Table back to Logger on Android).
- **Gherkin**:
  ```gherkin
  Scenario: Launching the app into the focused Hydration Logger view
    Given the user opens the AquaPulse application
    Then the "Hydration Logger" view is active and visible by default
    And the full historical water intake data table is hidden from the initial screen
    And a link button "View Full Hydration Data Table" is visible to navigate to the Data Table view

  Scenario: Navigating between Hydration Logger and Data Table
    Given the user is on the "Hydration Logger" view
    When the user clicks "View Full Hydration Data Table" or the "Data Table & History" navigation tab
    Then the "Data Table & History" view becomes active and displays the full tabular intake log
    When the user clicks "Back to Logger" or presses the Android hardware back button
    Then the application returns cleanly to the "Hydration Logger" view
  ```

### `REQ-002`: Real-Time Daily Hydration Progress Ring & Goal Customization
- **Description**: The Logger view must display an animated SVG progress ring and metric badges showing Today's Total Intake (`ml`), Daily Target Goal (`ml`, default `2500 ml`), Completion Percentage (`0%`–`100%+`), Remaining Volume (`ml`), and Current Hydration Streak (consecutive days meeting goal). The user can customize their daily hydration target (`500 ml` to `10000 ml`).
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: Calculating daily progress towards hydration goal
    Given the user's daily hydration goal is set to 2500 ml
    And today's logged intake is 1000 ml
    When the user logs an additional 250 ml of water
    Then today's total intake updates to "1,250 ml"
    And the completion percentage updates to "50%"
    And the remaining volume displays "1,250 ml left"

  Scenario: Updating daily hydration goal
    Given the user opens the Daily Goal settings modal
    When the user sets a new daily goal of 3000 ml and saves
    Then the daily goal persists as 3000 ml and recalculates today's completion percentage immediately
  ```

### `REQ-003`: One-Tap Quick-Add Vessel Presets & Custom Hydration Entry
- **Description**: The Logger view must offer one-tap preset vessel buttons (`+150 ml Small Cup`, `+250 ml Glass`, `+500 ml Bottle`, `+750 ml Sports Flask`) for instant logging, as well as a custom entry form supporting custom volume (`1 ml` to `5000 ml`), beverage type (`Water`, `Sparkling Water`, `Electrolyte`, `Herbal Tea`, `Coconut Water`), date/time (defaulting to current local date & time), and optional note.
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: One-tap logging via preset vessel button
    Given the user is on the Hydration Logger view
    When the user taps the "+250 ml Glass" quick-add button
    Then a 250 ml "Water" entry timestamped with the current local date and time is recorded
    And the progress ring and today's recent feed update immediately

  Scenario: Rejecting invalid custom volume input
    Given the user is using the custom hydration entry form
    When the user attempts to submit a volume of "0" or "-100" or non-numeric text
    Then the entry is rejected with a clear validation message and state remains uncorrupted
  ```

### `REQ-004`: Instant "Undo Last Entry" & Individual Record Deletion
- **Description**: Users can immediately undo the most recently logged entry from the Logger screen via a single "Undo Last" button, or delete any specific record from the Water Intake Data Table.
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: Undoing the most recent water intake log
    Given the user just tapped "+500 ml Bottle" by mistake
    When the user clicks the "Undo Last" button on the Logger screen
    Then that 500 ml entry is removed from storage
    And the daily total decrements by 500 ml immediately
  ```

### `REQ-005`: Comprehensive Water Intake Data Table per Time/Day with Filtering & Search
- **Description**: The dedicated Data Table view must display a structured tabular log of hydration entries with Date, Time, Beverage Type badge, Volume (`ml`), Share of Daily Goal (`%`), Note, and Delete action, alongside a Daily Summary rollup and 7-Day Hydration Trend chart. Users can filter records by Date Range (`Today`, `Last 7 Days`, `This Month`, `All Time`, or specific date), Beverage Type, and free-text search.
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: Viewing and filtering the Water Intake Data Table
    Given the user has logged entries across multiple days and beverage types
    When the user navigates to the "Data Table & History" view and selects "Today"
    Then only today's water intake entries are shown in the data table sorted newest-first
    And the filtered volume total and entry count update accurately
  ```

### `REQ-006`: 100% Local-First Persistence (IndexedDB with LocalStorage Fallback)
- **Description**: All hydration entries and user settings must be persisted 100% client-side in IndexedDB (`WaterIntakeTrackerDB`) with automatic fallback to `localStorage`. Zero user data may be transmitted to any external analytics or intermediary server.
- **Platform Scope**: Web & Android WebView.
- **Gherkin**:
  ```gherkin
  Scenario: Data persistence across app restarts and reloads
    Given the user has logged 1,500 ml of water today
    When the user reloads the browser page or restarts the Android app
    Then the 1,500 ml intake and all individual timestamps are restored accurately from local storage
  ```

### `REQ-007`: Zero-Knowledge Cross-Device JSON Backup Export, Restore & Safe Purge
- **Description**: Users can export their entire hydration database (entries + settings) as a validated JSON backup file (`aquapulse-water-backup-[date].json`), import a JSON backup file to restore records, or safely purge all records via a confirmation modal.
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: Exporting and importing hydration backup JSON
    Given the user exports their hydration log to a JSON backup file
    When the user clears local storage and imports the exported JSON file
    Then 100% of hydration entries and daily goal settings are restored without data loss
  ```

### `REQ-008`: Minimalist Premium UI/UX & Mobile Viewport Optimization (360px–412px)
- **Description**: Built with Vanilla CSS featuring deep oceanic dark mode, cyan/aqua glassmorphism, `Outfit` + `Inter` typography, zero horizontal overflow clipping on 360px–412px mobile screens, single-line segmented navigation (`white-space: nowrap`), and responsive dual labels (`Logger` / `History` on mobile).
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: Rendering on a 390px mobile screen
    Given the viewport width is 390px
    Then the header and segmented navigation fit within 390px with zero horizontal scroll
    And navigation button labels render on a single line without wrapping
  ```

### `REQ-009`: Progressive Web App (PWA) Offline Service Worker (`v1.0.0`)
- **Description**: Includes a valid W3C `manifest.json`, custom app icons (`192x192`, `512x512`), and Service Worker (`sw.js` with `CACHE_NAME = 'water-tracker-cache-v1.0.0'`, `self.skipWaiting()`, and `clients.claim()`) for full offline execution and installability.
- **Platform Scope**: Web & Android.
- **Gherkin**:
  ```gherkin
  Scenario: Offline caching and service worker activation
    Given the user has loaded the application once
    When the network connection is offline
    Then the Service Worker serves all app shell assets from cache and logging works uninterrupted
  ```

### `REQ-010`: Dual-Target Native Android Wrapper & Google Play Console Readiness
- **Description**: Includes a standalone native Android project (`android/`) with `WebView` DOM storage & IndexedDB enabled, hardware back-button support, automated asset sync script (`scripts/build-android.mjs`), clean Gradle compilation for Debug/Release `.apk` and Google Play Console `.aab` App Bundle, and an in-app Privacy Policy (`privacy.html`).
- **Platform Scope**: Android Native (`.apk` & `.aab`).
- **Gherkin**:
  ```gherkin
  Scenario: Building Dual-Target Android Package
    Given web assets are updated in the root repository
    When the developer runs "npm run build:android"
    Then all web assets are synchronized to "android/app/src/main/assets/www"
    And Gradle compiles a working Android APK with 100% functional parity
  ```

---

## 3. Gate 0 Definition of Ready (DoR) Sign-Off
- [x] User Story and business value defined with Customer's exact UX flow (Simple Logger first -> Link to Data Table).
- [x] Granular requirements (`REQ-001` to `REQ-010`) with normal and boundary Gherkin scenarios documented.
- [x] Dual-target requirements specified for both Web (GitHub Pages PWA) and Native Android (`.apk` / Play Store `.aab`).
- [x] **Gate 0 Status**: **PASSED** (Approved by Tech Lead & Requirements Analyst).
