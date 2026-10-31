# 04 - Modern UI/UX Design & Responsiveness Standards

Application interfaces must deliver state-of-the-art aesthetics and flawless mobile responsiveness:

1. **Visual Excellence & Rich Aesthetics**:
   - Harmonious, curated color palettes (deep dark themes, vibrant accents, subtle glassmorphism).
   - Modern typography: import clean fonts (Inter, Roboto, or Outfit) via Google Fonts.
   - Elevation and depth: multi-layered box-shadows, frosted glass backdrops (`backdrop-filter: blur(12px)`).
   - Micro-interactions: smooth transitions (150ms–250ms cubic-bezier), active push-down effects, subtle hover glows.

2. **Mobile Viewport Optimization**:
   - **No Horizontal Overflow**: Header and navigation elements must NEVER overflow the screen on narrow viewports (360px–412px).
   - **Responsive Navigation Strategy**:
     - Hide redundant desktop header bars on mobile screens (`@media (max-width: 640px)`).
     - Main navigation must be a unified segmented control with equal flex distribution (`flex: 1`).
     - Use dual-labeling: full labels on desktop (`Ledger & Entry`, `Analytics & Stats`) and concise labels on mobile (`Ledger`, `Stats`).
     - Set `white-space: nowrap` on button labels to completely eliminate awkward multi-line text wrapping.

3. **No Placeholders**:
   - Never ship placeholder boxes, missing images, or "Lorem Ipsum" copy.
   - Use dynamic SVG icons, realistic seeded mock data, and functional components.
