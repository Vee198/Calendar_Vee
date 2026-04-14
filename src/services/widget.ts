/**
 * Home Widget Service
 *
 * ⚠️ Home Widget ต้อง Build แบบ Custom Dev Client (ไม่ใช่ Expo Go)
 *
 * Dependencies ที่ต้องติดตั้ง:
 * npx expo install react-native-android-widget
 *
 * ขั้นตอน:
 * 1. npx expo install react-native-android-widget
 * 2. เพิ่ม plugin ใน app.json:
 *    "plugins": ["expo-updates", "react-native-android-widget"]
 * 3. สร้าง widget component (ด้านล่าง)
 * 4. Build ด้วย: eas build --platform android --profile preview
 *
 * Widget จะแสดง:
 * - วันที่วันนี้
 * - งาน 3 รายการถัดไป
 * - ปุ่มเปิดแอป
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_DATA_KEY = 'widget_data';

interface WidgetData {
  today: string;
  events: Array<{
    title: string;
    time: string;
    category: string;
  }>;
  updatedAt: string;
}

// Update widget data (called when events change)
export async function updateWidgetData(events: Array<{
  title: string;
  start_time: string;
  category: string;
}>): Promise<void> {
  const today = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const todayEvents = events
    .filter(e => {
      const eventDate = new Date(e.start_time).toDateString();
      return eventDate === new Date().toDateString();
    })
    .slice(0, 3)
    .map(e => ({
      title: e.title,
      time: new Date(e.start_time).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      category: e.category,
    }));

  const data: WidgetData = {
    today,
    events: todayEvents,
    updatedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(data));

  // If react-native-android-widget is installed, trigger widget update:
  // SharedGroupPreferences.setItem(WIDGET_DATA_KEY, JSON.stringify(data));
  // WidgetTaskHandler.reloadAllTimelines();
}

// Get widget data
export async function getWidgetData(): Promise<WidgetData | null> {
  const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Widget Component (สำหรับใช้กับ react-native-android-widget)
 *
 * ตัวอย่าง:
 *
 * import { FlexWidget, TextWidget } from 'react-native-android-widget';
 *
 * function CalendarWidget({ data }: { data: WidgetData }) {
 *   return (
 *     <FlexWidget style={{ padding: 16, backgroundColor: '#fff', borderRadius: 16 }}>
 *       <TextWidget text={data.today} style={{ fontSize: 14, fontWeight: 'bold' }} />
 *       {data.events.map((event, i) => (
 *         <FlexWidget key={i} style={{ flexDirection: 'row', marginTop: 8 }}>
 *           <TextWidget text={event.time} style={{ width: 60, color: '#6C63FF' }} />
 *           <TextWidget text={event.title} style={{ flex: 1 }} />
 *         </FlexWidget>
 *       ))}
 *       {data.events.length === 0 && (
 *         <TextWidget text="ไม่มีนัดวันนี้ 🎉" style={{ marginTop: 8 }} />
 *       )}
 *     </FlexWidget>
 *   );
 * }
 */
