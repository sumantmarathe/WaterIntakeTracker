# 00 - Golden Engineering Rules & Non-Negotiable Constraints

These rules apply to **all projects and all personas** at all times. They take absolute precedence over implementation speed.

---

## Rule 1: Deployment & Merge Permission Gate
- **NEVER deploy to production or merge into the `main` branch before obtaining explicit, unambiguous permission from the user.**
- Development occurs exclusively on side branches (`feat/*` for features, `fix/*` for bugs).
- Before requesting deployment approval, the team must present complete empirical verification proof (unit tests, integration tests, browser QA, and mobile device QA).

---

## Rule 2: Dual-Target Release Parity (Web & Native Mobile)
- Every user-facing feature must target both:
  1. **Production Web Application** (e.g. GitHub Pages / static hosting).
  2. **Native Android Application** (`.apk` package running in native WebView container).
- Zero functional discrepancy: data persistence, cloud sync, layout responsiveness, and modal dialogs must work identically on both platforms.

---

## Rule 3: Four-Eyes Principle & Gate Clearance
- No developer self-approves their own code.
- Advancement across the 6 V-Cycle gates requires independent review:
  - **L1 Technical Reviewer**: Audits requirements coverage and test completeness.
  - **L2 Principal Auditor**: Validates security, architecture compliance, and issues release clearance.

---

## Rule 4: Zero-Knowledge & Local-First Privacy Architecture
- User data must never touch third-party analytical or intermediary backend servers.
- Primary persistence is 100% client-side (IndexedDB / DOM Storage).
- Cloud synchronization (e.g., Google Drive) must use direct client-to-cloud OAuth 2.0 API calls with zero intermediary server hops.

---

## Rule 5: UI/UX Aesthetic & Mobile Responsiveness Standards
- **Rich Aesthetics**: Custom typography (Inter/Roboto/Outfit), tailored HSL palettes, dark mode, glassmorphism, micro-animations. Avoid generic plain colors.
- **Vanilla CSS Default**: Use Vanilla CSS for complete control. Do not introduce Tailwind unless explicitly instructed.
- **Mobile-First Layout**:
  - Prevent horizontal overflow clipping (no centered pill bars that exceed mobile viewports).
  - Prevent multi-line button wrapping: use responsive segmented controls with short labels on mobile.
  - Test on real 360px–412px viewports.

---

## Rule 6: Service Worker Cache Invalidation (PWA)
- Any modification to client assets (HTML/CSS/JS) requires bumping the Service Worker `CACHE_NAME` (e.g., `v1.x.0`).
- Service worker must implement `self.skipWaiting()` and client claiming to immediately bust stale cache on mobile reloads.

---

## Rule 7: Accidental Data Loss Prevention
- **STOP AND VERIFY**: Never execute destructive commands (dropping databases, mass file deletions, purging user records) without explicit, double-confirmed user authorization.
