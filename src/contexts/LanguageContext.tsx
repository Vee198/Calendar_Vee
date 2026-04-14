import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'th' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  th: {
    // Calendar
    'calendar.title': 'ปฏิทิน',
    'calendar.month_view': 'มุมมองเดือน',
    'calendar.week_view': 'มุมมองสัปดาห์',
    'calendar.list_view': 'มุมมองรายการ',
    'calendar.search': 'ค้นหากิจกรรม',
    'calendar.filter_by_category': 'กรองตามหมวดหมู่',
    'calendar.no_events': 'ไม่มีกิจกรรม',

    // Dashboard
    'dashboard.title': 'แดชบอร์ด',
    'dashboard.smart_insights': 'Smart Insights',
    'dashboard.all_tasks': 'งานทั้งหมด',
    'dashboard.today': 'งานวันนี้',
    'dashboard.upcoming': 'รอดำเนินการ',
    'dashboard.completed': 'เสร็จแล้ว',
    'dashboard.by_month': 'งานรายเดือน',
    'dashboard.by_category': 'งานตามหมวดหมู่',
    'dashboard.by_priority': 'งานตามลำดับความสำคัญ',

    // Events
    'event.title': 'ชื่อกิจกรรม',
    'event.description': 'รายละเอียด',
    'event.location': 'สถานที่',
    'event.category': 'หมวดหมู่',
    'event.priority': 'ลำดับความสำคัญ',
    'event.status': 'สถานะ',
    'event.reminder': 'เตือนล่วงหน้า',
    'event.save': 'บันทึก',
    'event.cancel': 'ยกเลิก',

    // Settings
    'settings.title': 'การตั้งค่า',
    'settings.profile': 'โปรไฟล์',
    'settings.theme': 'ธีม',
    'settings.language': 'ภาษา',
    'settings.ai_premium': 'AI Premium',
    'settings.telegram': 'Telegram',
    'settings.logout': 'ออกจากระบบ',
    'settings.language_thai': 'ไทย',
    'settings.language_english': 'English',

    // AI Secretary
    'ai.title': 'เลขา AI',
    'ai.placeholder': 'พูดอะไรกับเลขา...',
  },
  en: {
    // Calendar
    'calendar.title': 'Calendar',
    'calendar.month_view': 'Month View',
    'calendar.week_view': 'Week View',
    'calendar.list_view': 'List View',
    'calendar.search': 'Search Events',
    'calendar.filter_by_category': 'Filter by Category',
    'calendar.no_events': 'No Events',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.smart_insights': 'Smart Insights',
    'dashboard.all_tasks': 'All Tasks',
    'dashboard.today': 'Today',
    'dashboard.upcoming': 'Upcoming',
    'dashboard.completed': 'Completed',
    'dashboard.by_month': 'By Month',
    'dashboard.by_category': 'By Category',
    'dashboard.by_priority': 'By Priority',

    // Events
    'event.title': 'Title',
    'event.description': 'Description',
    'event.location': 'Location',
    'event.category': 'Category',
    'event.priority': 'Priority',
    'event.status': 'Status',
    'event.reminder': 'Reminder',
    'event.save': 'Save',
    'event.cancel': 'Cancel',

    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.ai_premium': 'AI Premium',
    'settings.telegram': 'Telegram',
    'settings.logout': 'Logout',
    'settings.language_thai': 'ไทย',
    'settings.language_english': 'English',

    // AI Secretary
    'ai.title': 'AI Secretary',
    'ai.placeholder': 'Say something to the secretary...',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('th');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const saved = await AsyncStorage.getItem('app_language');
      if (saved === 'en' || saved === 'th') {
        setLanguageState(saved);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem('app_language', lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      value = value?.[k];
    }
    return value ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
