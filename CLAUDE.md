# Calendar Vee — CLAUDE.md

## Project Overview

Calendar Vee is a **team calendar & task management mobile app** built for a small office team (4 users).
It features event scheduling, AI secretary chat (powered by Claude API), Kanban task board with gamification (XP/Levels/Badges/Streaks), Thai holiday management, and Telegram notifications.

**Language:** Primarily Thai UI with English code. All user-facing strings are in Thai.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native + Expo SDK 54, TypeScript |
| Navigation | React Navigation 7 (bottom tabs + native stack) |
| Backend | Cloudflare Workers (single worker.js) |
| Database | Cloudflare D1 (SQLite) |
| Auth | JWT + PIN-based login (6-digit PIN per user) |
| AI | Claude API (claude-sonnet-4-6) with tool_use for event creation |
| Notifications | Telegram Bot API (per-user routing via chatId) |
| OTA Updates | Expo Updates (EAS) |
| Build | EAS Build (cloud) — no local android/ folder |

## Architecture

```
Calendar_Vee/
├── CalendarVee/                    # Expo mobile app
│   ├── App.tsx                     # Entry point (providers + navigation)
│   ├── app.json                    # Expo config (bundle: com.vee.calendar)
│   ├── eas.json                    # EAS Build profiles
│   ├── src/
│   │   ├── constants/
│   │   │   ├── config.ts           # API_BASE_URL, categories, secretaries
│   │   │   └── theme.ts            # Dark premium design system (COLORS, SPACING, etc.)
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx      # JWT token + user role management
│   │   │   ├── LanguageContext.tsx  # TH/EN language switcher
│   │   │   └── ThemeContext.tsx     # Theme provider
│   │   ├── navigation/
│   │   │   └── AppNavigator.tsx     # Tab navigator (5 tabs) + stack navigators
│   │   ├── screens/                 # 12 screens (see below)
│   │   └── services/
│   │       ├── api.ts              # HTTP client with auto-auth headers
│   │       ├── gamification.ts     # XP/Level/Badge types, configs, API wrappers
│   │       ├── biometric.ts        # Fingerprint/Face ID
│   │       ├── feedback.ts         # Feedback submission
│   │       ├── notifications.ts    # Push notification setup
│   │       ├── location.ts         # GPS services
│   │       ├── googleCalendar.ts   # Google Calendar sync (optional)
│   │       └── widget.ts           # Home screen widget
│   └── assets/                     # App icons, splash screen
│
└── summit-calendar-worker/         # Cloudflare Worker backend
    ├── src/
    │   ├── worker.js               # All API endpoints (single file, ~1150 lines)
    │   └── pins.js                 # User PIN database (hardcoded)
    └── wrangler.toml               # Worker config + D1 binding
```

## Screens

| Screen | File | Description |
|--------|------|-------------|
| Login | LoginScreen.tsx | Username + 6-digit PIN pad with biometric option |
| Calendar | CalendarScreen.tsx | Monthly calendar with event dots, event list |
| Event Detail | EventDetailScreen.tsx | Full event view |
| Event Form | EventFormScreen.tsx | Create/edit event with datetime, category, priority |
| Dashboard | DashboardScreen.tsx | Stats cards, charts (by category/month) |
| Tasks | TaskScreen.tsx | **Kanban board** (New/In Progress/Done) + gamification profile |
| AI Secretary | AISecretaryScreen.tsx | Chat with AI (3 personality choices), tool_use for event creation |
| Settings | SettingsScreen.tsx | API keys, Telegram config, admin settings |
| Holidays | HolidaysScreen.tsx | Thai bank holidays 2025-2027 |
| Audit Log | AuditLogScreen.tsx | Event change history (admin only) |
| Shared Calendar | SharedCalendarScreen.tsx | Multi-user calendar view |
| Feedback | FeedbackScreen.tsx | Bug reports / feature requests |

## Navigation Structure

```
RootStack
├── Login (unauthenticated)
└── MainApp (authenticated) — BottomTabNavigator
    ├── CalendarStack → CalendarScreen, EventDetail, EventForm
    ├── Dashboard
    ├── Tasks (Kanban + Gamification)
    ├── AISecretary
    └── MoreStack → MoreMenu, Feedback, SharedCalendar, Holidays, AuditLog, Settings
```

## Design System

Dark premium theme ("Temporal Precision" philosophy). All colors defined in `src/constants/theme.ts`:

- Background: `#0F172A` (dark navy)
- Cards: `rgba(30, 41, 59, 0.85)` (glassmorphism)
- Primary: `#6C63FF` (purple)
- Secondary: `#38BDF8` (blue)
- Accent: `#FBBF24` (gold)
- Text: `#F1F5F9` / `#94A3B8` / `#64748B`

**Always use** `COLORS.xxx` from theme.ts — never hardcode colors.

## Backend API Endpoints

### Auth
- `POST /api/auth/pin` — Login with username + PIN → returns JWT
- `GET /api/auth/verify` — Verify token validity

### Events
- `GET /api/events` — List user's events (filtered by created_by)
- `POST /api/events` — Create event
- `PUT /api/events/:id` — Update event
- `DELETE /api/events/:id` — Delete event
- `POST /api/events/check-overlap` — Check time conflicts

### Gamification (NEW)
- `POST /api/gamification/init` — Create gamification tables (run once)
- `GET /api/gamification/profile` — Get user XP, level, badges, recent XP log
- `POST /api/gamification/check-streak` — Daily check-in, update streak, award XP

### Kanban Tasks (NEW)
- `GET /api/tasks` — List user's kanban tasks (optional `?status=` filter)
- `POST /api/tasks` — Create task (title, description, priority, deadline)
- `PATCH /api/tasks/:id/status` — Move task between columns (new/in_progress/done), auto-awards XP on 'done'
- `PUT /api/tasks/:id` — Edit task details
- `DELETE /api/tasks/:id` — Delete task

### Other
- `GET /api/stats` — Dashboard statistics
- `GET/PUT /api/settings` — App settings (admin)
- `GET/POST /api/holidays` — Thai holidays CRUD
- `GET /api/audit-log` — Change history (admin, supports CSV/TXT export)
- `POST /api/ai/chat` — AI Secretary chat (proxies to Claude API)
- `POST /api/reminders/check` — Check & send Telegram reminders

## D1 Database Tables

- `events` — Calendar events
- `holidays` — Thai bank holidays
- `audit_log` — Event change history
- `notifications_log` — Telegram send log
- `settings` — Key-value app settings
- `kanban_tasks` — Kanban task board (NEW)
- `user_xp` — XP, level, streak per user (NEW)
- `user_badges` — Earned badges per user (NEW)
- `xp_log` — XP transaction history (NEW)

## Gamification System

### XP Formula
```
task_xp = base_xp × priority_multiplier × streak_multiplier

base_xp:      before_deadline=15, on_deadline=10, after_deadline=5, no_deadline=10
priority:     high=1.5, normal=1.0, low=0.8
streak:       1-6 days=1.0, 7-29 days=1.5, 30+ days=2.0
daily_checkin: 5 XP (8 at 7d streak, 10 at 30d streak)
```

### Levels
Rookie (0 XP) → Planner (100) → Organizer (300) → Strategist (600) → Master (1000)

### Badges
first_task, task_10, task_50, task_master, streak_7, streak_30, early_bird, speed_demon

## Users (Hardcoded in pins.js)

| Username | Name | Role | PIN |
|----------|------|------|-----|
| veerachai_su | คุณวีระชัย | admin | 160234 |
| anand | คุณ Anand | member | 111111 |
| waweeporn | คุณ Waweeporn | member | 222222 |
| soukvina | คุณ Soukvina | member | 333333 |

## Key Commands

```bash
# Dev — run in Expo Go
cd CalendarVee && npx expo start

# Build APK
cd CalendarVee && eas build --platform android --profile preview

# OTA Update (no rebuild needed)
cd CalendarVee && eas update --branch preview --message "description"

# Deploy backend
cd summit-calendar-worker && npx wrangler deploy
```

## Conventions

- All screens use `StyleSheet.create()` — no inline style objects
- SVG icons via `react-native-svg` (no icon libraries)
- AsyncStorage for local persistence (token, settings)
- API calls go through `services/api.ts` or `services/gamification.ts`
- Thai language by default, English labels for navigation tabs
- Never commit `node_modules/`, `dist/`, `.expo/`, `android/`, `.env`
- Worker is a single bundled file (no build step — edit src/worker.js directly)
