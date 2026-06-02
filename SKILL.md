# Calendar Vee — Development Skill Guide

## Quick Reference

This file helps Claude (or any developer) work effectively on the Calendar Vee project.
Read CLAUDE.md first for full architecture details.

## Before Making Changes

1. **Read `CLAUDE.md`** for architecture, file locations, and conventions
2. **Read `src/constants/theme.ts`** before touching any UI — all colors come from `COLORS.xxx`
3. **Read `src/services/gamification.ts`** before touching TaskScreen or XP logic
4. **Read `summit-calendar-worker/src/worker.js`** before adding/changing API endpoints

## Common Tasks

### Add a New Screen

1. Create `src/screens/NewScreen.tsx`
2. Import `COLORS` from `../constants/theme`
3. Use `StyleSheet.create()` for all styles
4. Add to `AppNavigator.tsx`:
   - Import the screen
   - Add to appropriate stack (CalendarStack or MoreStack)
   - Add type to ParamList
5. If it's a "More" menu item, add entry to `menuItems` array in `MoreMenuScreen`

### Add a New API Endpoint

1. Edit `summit-calendar-worker/src/worker.js`
2. Add route handler before the `return json({ error: "Not Found" }, 404)` line
3. Use `requireAuth(["admin", "viewer", "member"])` for auth
4. Use `auth.name` for user-scoped data (each user sees only their own data)
5. Deploy: `cd summit-calendar-worker && npx wrangler deploy`

### Add a New D1 Table

1. Add `CREATE TABLE IF NOT EXISTS` in the `/api/gamification/init` endpoint (or create a new init endpoint)
2. Deploy worker
3. Call the init endpoint once to create tables
4. D1 dashboard: https://dash.cloudflare.com → Workers → calendar-vee → D1

### Modify Gamification

- **XP formula**: `calcLevel()` function in worker.js + `LEVEL_CONFIG` in gamification.ts
- **New badge**: Add to `BADGE_CONFIG` in gamification.ts + badge check logic in worker.js `/api/tasks/:id/status` endpoint
- **New level**: Add to `LEVEL_CONFIG` in gamification.ts + `calcLevel()` in worker.js

### UI Styling Rules

- Dark theme only — background `#0F172A`, cards with glassmorphism
- Use `COLORS`, `BORDER_RADIUS`, `SHADOWS`, `SPACING` from theme.ts
- SVG icons via `react-native-svg` — no emoji in tab bars or navigation
- Cards: `backgroundColor: COLORS.card`, `borderRadius: BORDER_RADIUS.xl`, `borderWidth: 0.5`, `borderColor: COLORS.border`
- Text hierarchy: `COLORS.text` (primary), `COLORS.textSecondary` (secondary), `COLORS.textMuted` (hint)

## Testing

```bash
# Run in Expo Go (development)
cd CalendarVee
npx expo start

# TypeScript check (some pre-existing errors in AuditLogScreen, CalendarScreen, HolidaysScreen — safe to ignore)
npx tsc --noEmit

# Test API manually
curl https://calendar-vee.veerachai-mitmorn.workers.dev/api/events  # Should return 401

# Check worker syntax
node -c summit-calendar-worker/src/worker.js
```

## Deployment

```bash
# OTA update (JS-only changes, no native module changes)
cd CalendarVee
eas update --branch preview --message "description"

# Full APK rebuild (when adding native modules or SDK upgrade)
cd CalendarVee
eas build --platform android --profile preview

# Deploy backend
cd summit-calendar-worker
npx wrangler deploy
```

## Known Issues / Tech Debt

- `pins.js` stores PINs in plain text — should move to D1 with bcrypt/sha256
- Old 4-digit PIN system still supported for backward compatibility
- `EXPO_UPDATES_GUIDE.docx` is a placeholder (23 bytes, no real content)
- AuditLogScreen has TypeScript errors with expo-file-system (pre-existing)
- Worker is a single bundled file (~1150 lines) — consider splitting into modules
- No automated tests yet

## Environment & Secrets

| Key | Where | Purpose |
|-----|-------|---------|
| JWT_SECRET | Worker env | JWT signing |
| TELEGRAM_BOT_TOKEN | D1 settings table | Telegram notifications |
| claude_api_key | D1 settings table | AI Secretary |
| ai_premium_enabled | D1 settings table | Toggle AI feature |

Manage at: https://dash.cloudflare.com → Workers → calendar-vee → Settings → Variables
