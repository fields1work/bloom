# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build (outputs to dist/)
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test framework is configured.

## Architecture

Bloom is a mobile-first React + Vite daily habit tracker deployed on Vercel.

**Single-component architecture:** Nearly all logic lives in `src/App.jsx` (~740 lines). The app has three screens rendered conditionally: onboarding → focus selection → main dashboard.

**Persistence:** `localStorage` only, under the key `bloom-data-v1`. No backend, no auth. The data shape:
```js
{
  entries: {},                    // { "YYYY-MM-DD": { ...checkIn } }
  streak, bestStreak,
  plantWiltLevel,                 // 0–3, penalties for missed days
  lastCheckInDate,
  hasOnboarded, hasCompletedFocusOnboarding,
  focusArea,                      // "gym" | "school" | "life" | null
  theme                           // "dark" | "light"
}
```

**Plant visualization:** `PlantSvg` is an inline SVG component in `App.jsx` that renders one of six growth stages (`day0` → `day1` → `day2` → `sprout` → `small` → `bloom`) based on streak count via `buildPlantStage()`.

**Styling:** Tailwind CSS 4 (configured via `@tailwindcss/vite` plugin) is the primary approach. Custom animations (plantSway, petalPulse, checkPopIn, etc.) are defined in `src/index.css`. Component-specific overrides live in `src/App.css`.

**Key utilities in App.jsx:**
- `isoDiffDays()` — UTC date math for streak/wilt calculation
- `getMotivationMessage()` / `getCelebrationMessage()` — streak-based messaging
- `isTaskHighlightedForFocus()` — filters the 10 predefined tasks by focus area
