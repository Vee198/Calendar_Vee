import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  profileImage: string | null;
  themeColor: string;
  setProfileImage: (uri: string | null) => void;
  setThemeColor: (color: string) => void;
}

const THEME_COLORS = [
  { name: 'น้ำเงิน', color: '#1976D2' },
  { name: 'แดง', color: '#D32F2F' },
  { name: 'เขียว', color: '#388E3C' },
  { name: 'ส้ม', color: '#F57C00' },
  { name: 'ม่วง', color: '#7B1FA2' },
  { name: 'ชมพู', color: '#C2185B' },
  { name: 'น้ำตาล', color: '#5D4037' },
  { name: 'เทา', color: '#455A64' },
];

export { THEME_COLORS };

export const ThemeContext = createContext<ThemeContextType>({
  profileImage: null,
  themeColor: '#1976D2',
  setProfileImage: () => {},
  setThemeColor: () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userName } = useAuth();
  const [profileImage, setProfileImageState] = useState<string | null>(null);
  const [themeColor, setThemeColorState] = useState('#1976D2');

  // Key prefix per user — each PIN gets their own settings
  const userKey = (key: string) => userName ? `${userName}_${key}` : key;

  useEffect(() => {
    loadSettings();
  }, [userName]);

  const loadSettings = async () => {
    try {
      const [profile, color] = await Promise.all([
        AsyncStorage.getItem(userKey('profileImage')),
        AsyncStorage.getItem(userKey('themeColor')),
      ]);
      setProfileImageState(profile);
      if (color) setThemeColorState(color);
      else setThemeColorState('#1976D2');
    } catch (e) {
      console.error('Error loading theme settings:', e);
    }
  };

  const setProfileImage = useCallback(async (uri: string | null) => {
    setProfileImageState(uri);
    try {
      const k = userKey('profileImage');
      if (uri) await AsyncStorage.setItem(k, uri);
      else await AsyncStorage.removeItem(k);
    } catch (e) {}
  }, [userName]);

  const setThemeColor = useCallback(async (color: string) => {
    setThemeColorState(color);
    try { await AsyncStorage.setItem(userKey('themeColor'), color); } catch (e) {}
  }, [userName]);

  return (
    <ThemeContext.Provider value={{
      profileImage, themeColor,
      setProfileImage, setThemeColor,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => React.useContext(ThemeContext);
