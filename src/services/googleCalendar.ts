/**
 * Google Calendar Sync Service
 *
 * ขั้นตอนการ Setup:
 * 1. ไปที่ https://console.cloud.google.com
 * 2. สร้าง Project ใหม่
 * 3. เปิด Google Calendar API
 * 4. สร้าง OAuth 2.0 Credentials
 * 5. ใส่ Client ID ใน config ด้านล่าง
 *
 * Dependencies ที่ต้องติดตั้ง:
 * npx expo install expo-auth-session expo-crypto expo-web-browser
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GOOGLE_TOKENS_KEY = 'google_calendar_tokens';
const SYNC_ENABLED_KEY = 'google_sync_enabled';

// ======= CONFIG (ใส่ค่าจริงหลัง setup Google Cloud) =======
const GOOGLE_CONFIG = {
  clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
  ],
};

interface GoogleTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
}

// Check if sync is enabled
export async function isGoogleSyncEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
  return val === 'true';
}

// Save tokens
async function saveTokens(tokens: GoogleTokens): Promise<void> {
  await AsyncStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(tokens));
}

// Get saved tokens
async function getTokens(): Promise<GoogleTokens | null> {
  const raw = await AsyncStorage.getItem(GOOGLE_TOKENS_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// Sign in with Google (OAuth)
export async function signInWithGoogle(): Promise<boolean> {
  try {
    // Use expo-auth-session for OAuth flow
    const { makeRedirectUri } = require('expo-auth-session');
    const { startAsync } = require('expo-auth-session');

    const redirectUri = makeRedirectUri({ scheme: 'calendar-vee' });

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${GOOGLE_CONFIG.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(GOOGLE_CONFIG.scopes.join(' '))}&` +
      `access_type=offline&` +
      `prompt=consent`;

    const result = await startAsync({ authUrl });

    if (result.type === 'success' && result.params?.code) {
      // Exchange code for tokens via your backend
      const tokenResponse = await fetch(
        'https://calendar-vee.veerachai-mitmorn.workers.dev/api/google/token',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: result.params.code, redirectUri }),
        }
      );

      const tokens = await tokenResponse.json();
      await saveTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      });

      await AsyncStorage.setItem(SYNC_ENABLED_KEY, 'true');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return false;
  }
}

// Sign out from Google
export async function signOutGoogle(): Promise<void> {
  await AsyncStorage.removeItem(GOOGLE_TOKENS_KEY);
  await AsyncStorage.setItem(SYNC_ENABLED_KEY, 'false');
}

// Fetch Google Calendar events
export async function fetchGoogleEvents(
  startDate: string,
  endDate: string
): Promise<GoogleEvent[]> {
  const tokens = await getTokens();
  if (!tokens) return [];

  try {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startDate}&` +
      `timeMax=${endDate}&` +
      `singleEvents=true&` +
      `orderBy=startTime`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });

    if (response.status === 401) {
      // Token expired - need to refresh or re-auth
      await signOutGoogle();
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Fetch Google events error:', error);
    return [];
  }
}

// Sync event to Google Calendar
export async function syncEventToGoogle(event: {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
}): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) return false;

  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          location: event.location,
          start: { dateTime: event.start_time, timeZone: 'Asia/Bangkok' },
          end: { dateTime: event.end_time, timeZone: 'Asia/Bangkok' },
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Sync to Google error:', error);
    return false;
  }
}
