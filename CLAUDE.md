# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build to /dist
npm run preview   # Preview production build locally
```

No linting or testing framework is configured.

## Environment Variables

Secrets are stored in `.env.local` (gitignored). **Never commit `.env` or `.env.local`.**
Use `.env.example` as a template. Required vars:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (safe to expose client-side)
- `VITE_GROQ_API_KEY` — Groq API key for the AI Coach (shared key for all users; users can override with their own in the app UI)

In Netlify production, set these in **Site Settings → Environment Variables**.

## Architecture

**React 18 + Vite PWA** — a local-first fitness tracker with Supabase sync and Groq AI coaching.

### Provider tree (`src/main.jsx`)
```
ErrorBoundary → BrowserRouter → ToastProvider → AuthProvider → AppDataProvider → App
```

### Storage layer (`src/utils/storageHelper.js`)
Utility functions that use a `window.storage` abstraction (falls back to `localStorage`). The polyfill is installed in `main.jsx`. **Actual data persistence is now handled via AppDataContext + Supabase** — storageHelper is used for export/import and some legacy reads.

### Data flow
1. **AppDataContext** (`src/contexts/AppDataContext.jsx`) is the single source of truth for all user data in memory.
2. On mount it calls `loadAllUserData(userId)` from `database.js` which fires 11 parallel Supabase queries (Promise.allSettled — tolerates individual failures).
3. All mutations (saveWorkout, saveFeeling, etc.) update React state immediately (optimistic) then sync to Supabase in background.
4. **On sync failure**: items are added to an offline queue in localStorage (24h TTL, max 5 retries). A toast warning is shown to the user. On reconnect (`window online` event), the queue is drained automatically.
5. **Toast notifications**: sync failures and successful queue drains surface via `useToast()` from `ToastContext`.

### Auth (`src/contexts/AuthContext.jsx`)
- Supabase Auth: email/password + Google OAuth
- `isOnboardingComplete` = `profile.onboarding_complete` (DB) OR `localStorage onboarding_complete_${userId}` (offline fallback). DB takes priority.
- Route guards in `App.jsx`: `RequireAuth`, `AuthGate`, `OnboardingGate`
- 8-second timeout: if data loading exceeds 8s, a `SlowLoadBanner` is shown with a Retry button instead of blocking the UI.

### AI Coach (`src/components/AICoach.jsx`)
- Uses **Groq API** (meta-llama/llama-4-scout-17b-16e-instruct model), NOT Claude API
- API key priority: `localStorage groq_api_key` → `userSettings.groq_api_key` → `VITE_GROQ_API_KEY` env var
- Sends a large system prompt with full context (memory, plan, workouts, PRs, feelings, nutrition)
- Supports **tool calling**: `replace_weekly_plan`, `modify_day_workout`, `create_training_cycle`, `update_exercise_targets`, `web_search`
- **Markdown rendering**: assistant messages use `react-markdown` + `remark-gfm` with custom dark-theme Tailwind components. User messages are plain text.
- **Web search** (`web_search` tool): calls Serper.dev API. type="places" → Google Maps-style business cards (name, rating, address, phone, website, thumbnail, Maps/Call/Web buttons). type="search" → organic result cards. Requires `VITE_SERPER_API_KEY` or user's own key stored in `localStorage serper_api_key`.
- **Rate limiting**: minimum 3 seconds between message sends (client-side)
- Memory extraction runs every 4 messages (async, calls Groq to extract new facts)

### Supabase schema (`src/utils/database.js`)
Tables: `profiles`, `user_settings`, `ai_memory`, `training_plans`, `training_cycles`, `workouts` (exercises as JSONB), `feelings`, `nutrition`, `personal_records`, `body_metrics`, `progress_photos`.
All tables have `user_id` + Row Level Security. Workout/feelings/nutrition queries fetch last 180/60/60 records.

### Progress Photos (`src/components/ProgressPhotos.jsx`)
Photos are compressed client-side (canvas → JPEG, max 900px, quality 0.75) before storage. This reduces base64 size by ~70%. Stored as `image_data` (text) in the `progress_photos` table. File upload accepts up to 15MB before compression.

### AI Memory (`src/utils/aiMemory.js`)
Structured memory object persisted in `ai_memory` table:
- `profile_facts` — age, weight, goals, experience, medication notes
- `training_preferences` — split type, intensity, time per session
- `performance_notes` — exercise-specific notes with date
- `observations` — general observations from conversations
- `goals` — primary/secondary goals with targets

### Onboarding (`src/pages/OnboardingPage.jsx`)
12-step form. Triple inputs (age/weight/height) have numeric bounds validation:
- Age: 10–100, Weight: 30–300 kg, Height: 100–250 cm
Out-of-bounds shows red border + allowed range hint. Plan templates: fullbody 3x, upper/lower 4x, PPL 6x, torso/pierna 4x, or AI-generated custom plan.

### Weekly training plan
User-defined, stored in `training_plans` table. Default plan (PPL-style) is in `src/utils/storageHelper.js → getDefaultTrainingPlan()`. The AI Coach can modify it via tool calls.

### ToastContext (`src/contexts/ToastContext.jsx`)
Usage: `const toast = useToast(); toast.success('msg'); toast.error('msg'); toast.warning('msg'); toast.info('msg');`
Max 3 toasts visible. Auto-dismiss: 4s (errors: 6s). Uses `useMemo` for the toast object (not `useCallback`).

### Deployment
Hosted on Netlify. `netlify.toml`: Node 18, build `npm run build`, output `dist/`, SPA redirect `/*` → `/index.html`. PWA: service worker + manifest via `vite-plugin-pwa`. Workbox: NetworkOnly for API calls (Groq, Supabase), CacheFirst for images (30d).

## Key Patterns

- **Optimistic updates**: state updates immediately, Supabase sync is fire-and-forget with offline queue fallback
- **Offline-first**: all writes succeed locally even without internet; sync happens when online
- **No input sanitization needed** for workout data (all numeric, validated at component level)
- **Date keys** are always `YYYY-MM-DD` strings in local timezone (see `src/utils/dateUtils.js` for timezone-safe helpers)
- **Exercise data shape**: `{ [exerciseName]: { [setNumber]: { weight, reps, timestamp, done } } }`

## Files Removed
- `src/utils/chartData.js` — was empty, dead code
- `src/hooks/useWorkoutData.js` — was empty, dead code

## Known Limitations / TODOs
- Photos are stored as base64 in Supabase (text column), not in Supabase Storage. Large photo libraries may cause slow initial load.
- No server-side rate limiting on Groq calls (only client-side 3s cooldown).
- No E2E or unit tests.
- `src/utils/aiTools.js`: tool parameters kept flat (nested `additionalProperties` causes Groq `failed_generation` error on llama models).
