import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MORNING_BRIEF_KEY = 'morning_brief_enabled';
const MORNING_BRIEF_HOUR_KEY = 'morning_brief_hour';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permission
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return false;
    }

    // Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('morning-brief', {
        name: 'Brief งานเช้า',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('event-reminder', {
        name: 'แจ้งเตือนนัด',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    return true;
  } catch {
    return false;
  }
}

// Schedule morning brief notification
export async function scheduleMorningBrief(hour: number = 7, minute: number = 0): Promise<void> {
  // Cancel existing morning brief
  await cancelMorningBrief();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📋 Brief งานวันนี้',
      body: 'น้องดีดี๊เตรียมสรุปงานวันนี้ให้แล้วค่ะ แตะเพื่อดู',
      data: { type: 'morning-brief' },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'morning-brief' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  await AsyncStorage.setItem(MORNING_BRIEF_KEY, 'true');
  await AsyncStorage.setItem(MORNING_BRIEF_HOUR_KEY, `${hour}:${minute}`);
}

// Cancel morning brief
export async function cancelMorningBrief(): Promise<void> {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of all) {
    if (n.content.data?.type === 'morning-brief') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  await AsyncStorage.setItem(MORNING_BRIEF_KEY, 'false');
}

// Check if morning brief is enabled
export async function isMorningBriefEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(MORNING_BRIEF_KEY);
  return val === 'true';
}

// Get morning brief time
export async function getMorningBriefTime(): Promise<string> {
  const val = await AsyncStorage.getItem(MORNING_BRIEF_HOUR_KEY);
  return val || '7:0';
}

// Schedule event reminder
export async function scheduleEventReminder(
  eventId: string,
  title: string,
  startTime: Date,
  minutesBefore: number = 30
): Promise<void> {
  const triggerDate = new Date(startTime.getTime() - minutesBefore * 60 * 1000);

  if (triggerDate.getTime() <= Date.now()) return; // Don't schedule past reminders

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 ${title}`,
      body: `อีก ${minutesBefore} นาทีจะถึงเวลานัดค่ะ`,
      data: { type: 'event-reminder', eventId },
      sound: 'default',
      ...(Platform.OS === 'android' && { channelId: 'event-reminder' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

// Get push token for remote notifications
export async function getPushToken(): Promise<string | null> {
  try {
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}
