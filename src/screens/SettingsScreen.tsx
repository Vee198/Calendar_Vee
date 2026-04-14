import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { COLORS } from '../constants/theme';
import { useTheme, THEME_COLORS } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  requestNotificationPermission,
  scheduleMorningBrief,
  cancelMorningBrief,
  isMorningBriefEnabled,
  getMorningBriefTime,
} from '../services/notifications';
import { biometricService } from '../services/biometric';

interface Settings {
  aiEnabled: boolean;
  apiKeyDisplay: string;
}

const SettingsScreen: React.FC = () => {
  const { userName, isAdmin, role, logout: authLogout } = useAuth();
  const { profileImage, setProfileImage, themeColor, setThemeColor } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyDisplay, setApiKeyDisplay] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingAI, setSavingAI] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiKeyDisplay, setOpenaiKeyDisplay] = useState('');
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [morningBrief, setMorningBrief] = useState(false);
  const [briefHour, setBriefHour] = useState(7);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricCanEnable, setBiometricCanEnable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const resp = await api.getSettings();
        const s = resp?.settings || resp || {};
        // ai_premium_enabled may be true even if no API key yet
        setAiEnabled(s.ai_premium_enabled === 'true' || s.ai_premium_enabled === true);
        if (s.claude_api_key_masked) {
          setApiKeyDisplay(s.claude_api_key_masked);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();

    // Load morning brief settings
    (async () => {
      const enabled = await isMorningBriefEnabled();
      setMorningBrief(enabled);
      const time = await getMorningBriefTime();
      const h = parseInt(time.split(':')[0], 10);
      if (!isNaN(h)) setBriefHour(h);
    })();

    // Load OpenAI key
    (async () => {
      const storedKey = await AsyncStorage.getItem('openai_api_key');
      if (storedKey) {
        setOpenaiKeyDisplay(storedKey.slice(-4).padStart(storedKey.length, '*'));
      }
    })();

    // Load biometric settings
    (async () => {
      const canEnable = await biometricService.canEnable();
      setBiometricCanEnable(canEnable);
      if (canEnable) {
        const isEnabled = await biometricService.isEnabled();
        setBiometricEnabled(isEnabled);
        const label = await biometricService.getBiometricLabel();
        setBiometricLabel(label);
      }
    })();
  }, []);

  const handleAIToggle = useCallback(async (value: boolean) => {
    setAiEnabled(value);
    try {
      setSavingAI(true);
      await api.updateSettings({ ai_premium_enabled: value ? 'true' : 'false' });
    } catch (error) {
      console.error('Error toggling AI:', error);
      setAiEnabled(!value); // revert
    } finally {
      setSavingAI(false);
    }
  }, []);

  const handleSaveAPIKey = useCallback(async () => {
    if (!apiKey.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอก API Key');
      return;
    }

    try {
      setSavingAI(true);
      await api.updateSettings({
        ai_premium_enabled: 'true',
        claude_api_key: apiKey,
      });
      // Update display
      const masked = apiKey.slice(-4).padStart(apiKey.length, '*');
      setApiKeyDisplay(masked);
      setApiKey('');
      setAiEnabled(true);
      Alert.alert('สำเร็จ', 'API Key ได้รับการบันทึกแล้ว');
    } catch (error) {
      console.error('Error saving API key:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึก API Key ได้');
    } finally {
      setSavingAI(false);
    }
  }, [apiKey]);

  const handleSaveOpenAIKey = useCallback(async () => {
    if (!openaiKey.trim()) {
      Alert.alert('ข้อผิดพลาด', 'กรุณากรอก OpenAI API Key');
      return;
    }
    if (!openaiKey.startsWith('sk-')) {
      Alert.alert('ข้อผิดพลาด', 'OpenAI API Key ต้องขึ้นต้นด้วย sk-');
      return;
    }
    try {
      setSavingOpenAI(true);
      await AsyncStorage.setItem('openai_api_key', openaiKey.trim());
      setOpenaiKeyDisplay(openaiKey.slice(-4).padStart(openaiKey.length, '*'));
      setOpenaiKey('');
      Alert.alert('สำเร็จ', 'บันทึก OpenAI API Key แล้ว ใช้อัดเสียงได้ทันที');
    } catch {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึก Key ได้');
    } finally {
      setSavingOpenAI(false);
    }
  }, [openaiKey]);

  const handleLogout = useCallback(async () => {
    Alert.alert('ออกจากระบบ', 'คุณแน่ใจหรือว่าต้องการออกจากระบบ?', [
      { text: 'ยกเลิก', style: 'cancel' },
      {
        text: 'ออกจากระบบ',
        style: 'destructive',
        onPress: async () => {
          try {
            // Use AuthContext logout → clears React state → AppNavigator goes to Login
            await authLogout();
          } catch (error) {
            console.error('Error logging out:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้');
          }
        },
      },
    ]);
  }, []);

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking profile image:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถเลือกรูปได้');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>บัญชีผู้ใช้</Text>
        <View style={styles.card}>
          {/* Profile Picture */}
          <View style={styles.profileContainer}>
            <TouchableOpacity onPress={pickProfileImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profilePlaceholder}>
                  <Text style={styles.profilePlaceholderText}>👤</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.profileActions}>
              <Text style={styles.profileName}>{userName || 'User'}</Text>
              <Text style={styles.profileRole}>
                {role === 'admin' ? 'ผู้ดูแลระบบ' : role === 'member' ? 'สมาชิก' : 'ผู้ชม'}
              </Text>
              <TouchableOpacity style={styles.changePhotoBtn} onPress={pickProfileImage}>
                <Text style={styles.changePhotoBtnText}>เปลี่ยนรูปโปรไฟล์</Text>
              </TouchableOpacity>
              {profileImage && (
                <TouchableOpacity
                  style={[styles.changePhotoBtn, styles.deletePhotoBtn]}
                  onPress={() => setProfileImage(null)}
                >
                  <Text style={styles.deletePhotoBtnText}>ลบรูป</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        {/* Biometric Toggle */}
        {biometricCanEnable && (
          <View style={styles.card}>
            <View style={styles.rowItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>
                  {biometricLabel.includes('ใบหน้า') || biometricLabel.includes('Face') ? '😊' : '👆'}{' '}
                  {biometricLabel}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                  เข้าสู่ระบบด้วย Biometric แทน PIN
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={async (val) => {
                  if (val) {
                    // Verify biometric first before enabling
                    const authenticated = await biometricService.authenticate(
                      'ยืนยันตัวตนเพื่อเปิดใช้งาน ' + biometricLabel
                    );
                    if (!authenticated) return;

                    // We need credentials to store — prompt user
                    Alert.alert(
                      'ต้องใส่ PIN เพื่อเปิดใช้งาน',
                      'กรุณาออกจากระบบแล้วล็อกอินใหม่เพื่อเปิดใช้งาน ' + biometricLabel,
                      [{ text: 'ตกลง' }]
                    );
                    return;
                  } else {
                    await biometricService.disable();
                    setBiometricEnabled(false);
                  }
                }}
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                thumbColor={biometricEnabled ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>

      {/* Notification Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การแจ้งเตือน</Text>
        <View style={styles.card}>
          <View style={[styles.rowItem, styles.rowItemBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>📋 Brief งานเช้า</Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                แจ้งเตือนสรุปงานทุกเช้า
              </Text>
            </View>
            <Switch
              value={morningBrief}
              onValueChange={async (val) => {
                if (val) {
                  const granted = await requestNotificationPermission();
                  if (!granted) {
                    Alert.alert('ไม่สามารถเปิดแจ้งเตือน', 'กรุณาอนุญาตการแจ้งเตือนในตั้งค่าเครื่อง');
                    return;
                  }
                  await scheduleMorningBrief(briefHour, 0);
                } else {
                  await cancelMorningBrief();
                }
                setMorningBrief(val);
              }}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
              thumbColor={morningBrief ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
          {morningBrief && (
            <View style={styles.rowItem}>
              <Text style={styles.rowLabel}>เวลาแจ้งเตือน</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[6, 7, 8, 9].map(h => (
                  <TouchableOpacity
                    key={h}
                    style={[
                      styles.hourBtn,
                      briefHour === h && styles.hourBtnActive,
                    ]}
                    onPress={async () => {
                      setBriefHour(h);
                      await scheduleMorningBrief(h, 0);
                    }}
                  >
                    <Text style={[
                      styles.hourBtnText,
                      briefHour === h && styles.hourBtnTextActive,
                    ]}>{`${h}:00`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ธีมและการแสดงผล</Text>
        <View style={styles.card}>
          {/* Color Selection */}
          <View style={styles.colorSection}>
            <Text style={styles.colorSectionTitle}>เลือกสี</Text>
            <View style={styles.colorGrid}>
              {THEME_COLORS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.colorOption}
                  onPress={() => setThemeColor(item.color)}
                >
                  <View
                    style={[
                      styles.colorCircle,
                      { backgroundColor: item.color },
                      themeColor === item.color && styles.colorCircleSelected,
                    ]}
                  >
                    {themeColor === item.color && (
                      <Text style={styles.colorCheckmark}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language Selection */}
          <View style={styles.colorSection}>
            <Text style={styles.colorSectionTitle}>ภาษา</Text>
            <View style={styles.languageGroup}>
              <TouchableOpacity
                style={[styles.languageBtn, language === 'th' && styles.languageBtnActive]}
                onPress={() => setLanguage('th')}
              >
                <Text style={[styles.languageBtnText, language === 'th' && styles.languageBtnTextActive]}>
                  🇹🇭 ไทย
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.languageBtn, language === 'en' && styles.languageBtnActive]}
                onPress={() => setLanguage('en')}
              >
                <Text style={[styles.languageBtnText, language === 'en' && styles.languageBtnTextActive]}>
                  🇺🇸 English
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* OpenAI Voice Section - Admin Only */}
      {isAdmin && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎙️ Voice (Speech-to-Text)</Text>
          <View style={styles.card}>
            <View style={styles.aiKeySection}>
              <Text style={styles.aiKeyLabel}>
                OpenAI API Key — ใช้สำหรับอัดเสียงพูดภาษาไทยใน AI เลขา{'\n'}
                รับ Key ได้ที่ platform.openai.com/api-keys
              </Text>
              {openaiKeyDisplay && !openaiKey ? (
                <View style={styles.maskKeyContainer}>
                  <Text style={styles.maskKeyText}>{openaiKeyDisplay}</Text>
                  <TouchableOpacity onPress={() => { setOpenaiKey(''); setOpenaiKeyDisplay(''); }}>
                    <Text style={styles.changeLinkText}>เปลี่ยน</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <TextInput
                    style={styles.keyInput}
                    placeholder="sk-..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={openaiKey}
                    onChangeText={setOpenaiKey}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!savingOpenAI}
                  />
                  <TouchableOpacity
                    style={[styles.saveKeyButton, savingOpenAI && styles.saveKeyButtonDisabled]}
                    onPress={handleSaveOpenAIKey}
                    disabled={savingOpenAI}
                  >
                    {savingOpenAI ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.saveKeyButtonText}>บันทึก</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      )}

      {/* AI Premium Section - Owner (PIN 1234) Only */}
      {userName === 'คุณวีระชัย' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Premium</Text>
          <View style={styles.card}>
            <View style={[styles.rowItem, styles.rowItemBorder]}>
              <Text style={styles.rowLabel}>เปิดใช้งาน AI</Text>
              <Switch
                value={aiEnabled}
                onValueChange={handleAIToggle}
                disabled={savingAI}
                trackColor={{ false: COLORS.border, true: `${COLORS.primary}80` }}
                thumbColor={aiEnabled ? COLORS.primary : COLORS.textSecondary}
              />
            </View>

            <View style={styles.aiKeySection}>
                <Text style={styles.aiKeyLabel}>Claude API Key (รับได้ที่ console.anthropic.com)</Text>
                {apiKeyDisplay && !apiKey ? (
                  <View style={styles.maskKeyContainer}>
                    <Text style={styles.maskKeyText}>{apiKeyDisplay}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setApiKey('');
                        setApiKeyDisplay('');
                      }}
                    >
                      <Text style={styles.changeLinkText}>เปลี่ยน</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={styles.keyInput}
                      placeholder="ค้นหา API Key ที่ https://console.anthropic.com"
                      placeholderTextColor={COLORS.textSecondary}
                      value={apiKey}
                      onChangeText={setApiKey}
                      secureTextEntry
                      editable={!savingAI}
                    />
                    <TouchableOpacity
                      style={[styles.saveKeyButton, savingAI && styles.saveKeyButtonDisabled]}
                      onPress={handleSaveAPIKey}
                      disabled={savingAI}
                    >
                      {savingAI ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <Text style={styles.saveKeyButtonText}>บันทึก</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
          </View>
        </View>
      )}

      {/* Sync Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>การเชื่อมต่อ</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.rowItem}
            onPress={() => Alert.alert(
              'Google Calendar Sync',
              'ฟีเจอร์นี้ต้อง Setup Google Cloud Console ก่อน\n\n1. ไปที่ console.cloud.google.com\n2. สร้าง Project\n3. เปิด Google Calendar API\n4. สร้าง OAuth Credentials\n\nต้องการดูคู่มือเพิ่มเติมไหม?',
              [{ text: 'ตกลง' }]
            )}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>📅</Text>
              <View>
                <Text style={styles.rowLabel}>Google Calendar</Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>ยังไม่ได้เชื่อมต่อ</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: COLORS.primary, fontWeight: '600' }}>เชื่อมต่อ</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rowItem, styles.rowItemBorder]}
            onPress={() => Alert.alert(
              'LINE Notify',
              'ฟีเจอร์นี้อยู่ระหว่างพัฒนา\nจะเพิ่มการแจ้งเตือนผ่าน LINE ในเวอร์ชันถัดไปค่ะ',
              [{ text: 'ตกลง' }]
            )}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>💬</Text>
              <View>
                <Text style={styles.rowLabel}>LINE Notify</Text>
                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>ส่ง Brief งานผ่าน LINE</Text>
              </View>
            </View>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>เร็วๆ นี้</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>เกี่ยวกับ</Text>
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <Text style={styles.rowLabel}>ชื่อแอป</Text>
            <Text style={styles.rowValue}>Ide_calendar</Text>
          </View>
          <View style={[styles.rowItem, styles.rowItemBorder]}>
            <Text style={styles.rowLabel}>เวอร์ชัน</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.rowItem}>
            <Text style={styles.creditText}>
              Powered by Cloudflare Workers + Claude AI
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12,
  },
  profileContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'flex-start',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profilePlaceholderText: {
    fontSize: 40,
  },
  profileActions: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  changePhotoBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  changePhotoBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  deletePhotoBtn: {
    backgroundColor: COLORS.danger,
  },
  deletePhotoBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  colorSection: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  colorSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: '23%',
    aspectRatio: 1,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: COLORS.text,
  },
  colorCheckmark: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  languageGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  languageBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
  },
  languageBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  languageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  languageBtnTextActive: {
    color: COLORS.white,
  },
  hourBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1,
    borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  hourBtnActive: {
    backgroundColor: COLORS.primary, borderColor: COLORS.primary,
  },
  hourBtnText: {
    fontSize: 12, fontWeight: '600', color: COLORS.text,
  },
  hourBtnTextActive: {
    color: COLORS.white,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadgeAdmin: {
    color: COLORS.success,
  },
  roleBadgeViewer: {
    color: COLORS.warning,
  },
  logoutButton: {
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  aiKeySection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  aiKeyLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  maskKeyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  maskKeyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
    flex: 1,
  },
  changeLinkText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  keyInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  saveKeyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveKeyButtonDisabled: {
    backgroundColor: COLORS.textSecondary,
    opacity: 0.6,
  },
  saveKeyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  creditText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SettingsScreen;
