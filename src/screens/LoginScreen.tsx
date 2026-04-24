import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Svg, { Rect, Line, Path, Circle as SvgCircle } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';
import { biometricService } from '../services/biometric';
import { COLORS, BORDER_RADIUS, SHADOWS } from '../constants/theme';

const { width, height } = Dimensions.get('window');

type LoginStep = 'username' | 'pin';

// SVG Calendar Icon component
const CalendarIcon = () => (
  <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.8}>
    <Rect x={3} y={4} width={18} height={18} rx={2} />
    <Line x1={16} y1={2} x2={16} y2={6} />
    <Line x1={8} y1={2} x2={8} y2={6} />
    <Line x1={3} y1={10} x2={21} y2={10} />
  </Svg>
);

// SVG Fingerprint/Lock Icon
const BiometricIcon = ({ isFace }: { isFace: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={COLORS.secondary} strokeWidth={2}>
    {isFace ? (
      <>
        <SvgCircle cx={12} cy={12} r={10} />
        <Path d="M8 14s1.5 2 4 2 4-2 4-2" />
        <Line x1={9} y1={9} x2={9.01} y2={9} strokeWidth={3} strokeLinecap="round" />
        <Line x1={15} y1={9} x2={15.01} y2={9} strokeWidth={3} strokeLinecap="round" />
      </>
    ) : (
      <>
        <Rect x={3} y={11} width={18} height={11} rx={2} />
        <Path d="M7 11V7a5 5 0 0110 0v4" />
      </>
    )}
  </Svg>
);

// Backspace Icon
const BackspaceIcon = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth={1.8}>
    <Path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" />
    <Line x1={18} y1={9} x2={12} y2={15} />
    <Line x1={12} y1={9} x2={18} y2={15} />
  </Svg>
);

const LoginScreen: React.FC = () => {
  const { loginPin, loginBiometric } = useAuth();
  const [step, setStep] = useState<LoginStep>('username');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('');
  const usernameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);
      if (available) {
        const label = await biometricService.getBiometricLabel();
        setBiometricLabel(label);
        handleBiometricLogin();
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const success = await loginBiometric();
      if (!success) setLoading(false);
    } catch (err) {
      setError('Biometric ล้มเหลว กรุณาใช้ PIN แทน');
      setLoading(false);
    }
  };

  const handleUsernameSubmit = () => {
    const trimmed = username.trim();
    if (trimmed.length === 0) {
      setError('กรุณาใส่ชื่อผู้ใช้');
      return;
    }
    setError('');
    setStep('pin');
  };

  const handleBackToUsername = () => {
    setStep('username');
    setPin('');
    setError('');
  };

  const submitPin = async (pinCode: string) => {
    setError('');
    setLoading(true);
    try {
      await loginPin(username.trim(), pinCode);
      const canEnable = await biometricService.canEnable();
      const isEnabled = await biometricService.isEnabled();
      if (canEnable && !isEnabled) {
        const label = await biometricService.getBiometricLabel();
        Alert.alert(
          'เปิดใช้ ' + label,
          'ต้องการใช้ ' + label + ' เข้าสู่ระบบครั้งถัดไปไหม?',
          [
            { text: 'ไม่ใช่ตอนนี้', style: 'cancel' },
            {
              text: 'เปิดใช้งาน',
              onPress: async () => {
                await biometricService.enable(username.trim(), pinCode);
              },
            },
          ]
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ชื่อผู้ใช้หรือ PIN ไม่ถูกต้อง');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 6) {
        setTimeout(() => submitPin(newPin), 200);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const isFaceBiometric = biometricLabel.includes('ใบหน้า') || biometricLabel.includes('Face');

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo + Brand */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <CalendarIcon />
            </View>
            <Text style={styles.title}>Calendar Vee</Text>
            <Text style={styles.subtitle}>Smart calendar assistant</Text>
          </View>

          {/* === STEP 1: Username === */}
          {step === 'username' && (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>กรุณาใส่ชื่อผู้ใช้</Text>

              <TextInput
                ref={usernameInputRef}
                style={styles.usernameInput}
                placeholder="Username"
                placeholderTextColor={COLORS.textMuted}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setError('');
                }}
                onSubmitEditing={handleUsernameSubmit}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                autoFocus={!biometricAvailable}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  username.trim().length === 0 && styles.primaryButtonDisabled,
                ]}
                onPress={handleUsernameSubmit}
                disabled={username.trim().length === 0}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>ถัดไป</Text>
              </TouchableOpacity>

              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <BiometricIcon isFace={isFaceBiometric} />
                  <Text style={styles.biometricButtonText}>
                    เข้าสู่ระบบด้วย {biometricLabel}
                  </Text>
                </TouchableOpacity>
              )}

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>กำลังเข้าสู่ระบบ...</Text>
                </View>
              )}
            </View>
          )}

          {/* === STEP 2: PIN Entry === */}
          {step === 'pin' && (
            <View style={styles.formCard}>
              <TouchableOpacity style={styles.backButton} onPress={handleBackToUsername}>
                <Text style={styles.backButtonText}>← เปลี่ยนชื่อผู้ใช้</Text>
              </TouchableOpacity>

              <View style={styles.usernameDisplay}>
                <Text style={styles.usernameDisplayLabel}>เข้าสู่ระบบในชื่อ</Text>
                <Text style={styles.usernameDisplayName}>{username.trim()}</Text>
              </View>

              <Text style={styles.formLabel}>กรุณาใส่ PIN 6 หลัก</Text>

              {/* PIN Dots */}
              <View style={styles.pinDots}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.pinDot,
                      index < pin.length && styles.pinDotFilled,
                    ]}
                  />
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Number Pad */}
              <View style={styles.numPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.numKey}
                    onPress={() => handlePinDigit(num.toString())}
                    disabled={loading}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.numKeyText}>{num}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.numKey, styles.actionKey]}
                  onPress={handleClear}
                  disabled={loading}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.numKeyText, styles.actionKeyText]}>C</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.numKey}
                  onPress={() => handlePinDigit('0')}
                  disabled={loading}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numKeyText}>0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.numKey, styles.actionKey]}
                  onPress={handlePinBackspace}
                  disabled={loading}
                  activeOpacity={0.6}
                >
                  <BackspaceIcon />
                </TouchableOpacity>
              </View>

              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricMini}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <BiometricIcon isFace={isFaceBiometric} />
                  <Text style={styles.biometricMiniText}>
                    ใช้ {biometricLabel} แทน
                  </Text>
                </TouchableOpacity>
              )}

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.loadingText}>กำลังเข้าสู่ระบบ...</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...SHADOWS.glow,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.primaryLight,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS['2xl'],
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Username Input
  usernameInput: {
    backgroundColor: COLORS.glass,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    marginBottom: 16,
    textAlign: 'center',
  },

  // Primary Button
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOWS.glow,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },

  // Biometric
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.glass,
    borderRadius: BORDER_RADIUS.pill,
    paddingVertical: 12,
    marginTop: 16,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    gap: 8,
  },
  biometricButtonText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  biometricMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
    gap: 6,
  },
  biometricMiniText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '500',
  },

  // Back Button
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '500',
  },

  // Username Display
  usernameDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  usernameDisplayLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  usernameDisplayName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },

  // PIN Dots
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: COLORS.primaryLight,
  },

  // Error
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },

  // Number Pad
  numPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  numKey: {
    width: '30%',
    aspectRatio: 1.5,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  numKeyText: {
    fontSize: 22,
    fontWeight: '500',
    color: COLORS.text,
  },
  actionKey: {
    backgroundColor: 'transparent',
    borderColor: COLORS.borderLight,
  },
  actionKeyText: {
    color: COLORS.textSecondary,
    fontSize: 18,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});

export default LoginScreen;
