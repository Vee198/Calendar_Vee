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
import { useAuth } from '../contexts/AuthContext';
import { biometricService } from '../services/biometric';

const { width, height } = Dimensions.get('window');

type LoginStep = 'username' | 'pin';

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

  // Check biometric availability and auto-prompt on mount
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await biometricService.isAvailable();
      setBiometricAvailable(available);

      if (available) {
        const label = await biometricService.getBiometricLabel();
        setBiometricLabel(label);

        // Auto-prompt biometric on app open
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
      if (!success) {
        // Biometric failed or cancelled — show normal login
        setLoading(false);
      }
      // If success, AuthContext handles navigation automatically
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

      // After successful login, ask to enable biometric if available and not already enabled
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
        setTimeout(() => {
          submitPin(newPin);
        }, 200);
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

  return (
    <View style={styles.container}>
      {/* Background layers */}
      <View style={[styles.bgLayer, { backgroundColor: '#E3F2FD', top: 0 }]} />
      <View style={[styles.bgLayer, { backgroundColor: '#BBDEFB', top: height * 0.3 }]} />
      <View style={[styles.bgLayer, { backgroundColor: '#90CAF9', top: height * 0.6 }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appIcon}>📅</Text>
            <Text style={styles.title}>Calendar Vee</Text>
            <Text style={styles.subtitle}>ปฏิทินส่วนตัว</Text>
          </View>

          {/* === STEP 1: Username === */}
          {step === 'username' && (
            <View style={styles.pinSection}>
              <Text style={styles.pinLabel}>กรุณาใส่ชื่อผู้ใช้</Text>

              <TextInput
                ref={usernameInputRef}
                style={styles.usernameInput}
                placeholder="ชื่อผู้ใช้ (Username)"
                placeholderTextColor="#90A4AE"
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

              {/* Error Message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[
                  styles.nextButton,
                  username.trim().length === 0 && styles.nextButtonDisabled,
                ]}
                onPress={handleUsernameSubmit}
                disabled={username.trim().length === 0}
                activeOpacity={0.7}
              >
                <Text style={styles.nextButtonText}>ถัดไป →</Text>
              </TouchableOpacity>

              {/* Biometric Login Button */}
              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.biometricIcon}>
                    {biometricLabel.includes('ใบหน้า') || biometricLabel.includes('Face') ? '😊' : '👆'}
                  </Text>
                  <Text style={styles.biometricButtonText}>
                    เข้าสู่ระบบด้วย{biometricLabel}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Loading indicator */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1976D2" />
                  <Text style={styles.loadingText}>กำลังเข้าสู่ระบบ...</Text>
                </View>
              )}
            </View>
          )}

          {/* === STEP 2: PIN Entry === */}
          {step === 'pin' && (
            <View style={styles.pinSection}>
              {/* Back button + Username display */}
              <TouchableOpacity style={styles.backButton} onPress={handleBackToUsername}>
                <Text style={styles.backButtonText}>← เปลี่ยนชื่อผู้ใช้</Text>
              </TouchableOpacity>

              <View style={styles.usernameDisplay}>
                <Text style={styles.usernameDisplayLabel}>เข้าสู่ระบบในชื่อ</Text>
                <Text style={styles.usernameDisplayName}>{username.trim()}</Text>
              </View>

              <Text style={styles.pinLabel}>กรุณาใส่ PIN 6 หลัก</Text>

              {/* PIN Display Circles — 6 digits */}
              <View style={styles.pinDisplay}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.pinCircle,
                      index < pin.length && styles.pinCircleFilled,
                    ]}
                  />
                ))}
              </View>

              {/* Error Message */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Number Pad */}
              <View style={styles.numberPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.numButton}
                    onPress={() => handlePinDigit(num.toString())}
                    disabled={loading}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.numButtonText}>{num}</Text>
                  </TouchableOpacity>
                ))}

                {/* Bottom row: Clear, 0, Backspace */}
                <TouchableOpacity
                  style={[styles.numButton, styles.actionButton]}
                  onPress={handleClear}
                  disabled={loading}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.numButtonText, styles.actionButtonText]}>C</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.numButton}
                  onPress={() => handlePinDigit('0')}
                  disabled={loading}
                  activeOpacity={0.6}
                >
                  <Text style={styles.numButtonText}>0</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.numButton, styles.actionButton]}
                  onPress={handlePinBackspace}
                  disabled={loading}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.numButtonText, styles.actionButtonText]}>⌫</Text>
                </TouchableOpacity>
              </View>

              {/* Biometric shortcut on PIN step too */}
              {biometricAvailable && (
                <TouchableOpacity
                  style={styles.biometricMini}
                  onPress={handleBiometricLogin}
                  disabled={loading}
                >
                  <Text style={styles.biometricMiniText}>
                    {biometricLabel.includes('ใบหน้า') || biometricLabel.includes('Face') ? '😊' : '👆'}{' '}
                    ใช้{biometricLabel}แทน
                  </Text>
                </TouchableOpacity>
              )}

              {/* Loading indicator */}
              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1976D2" />
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
    backgroundColor: '#F5F5F5',
  },
  bgLayer: {
    position: 'absolute',
    width: width,
    height: height * 0.4,
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appIcon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1565C0',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16,
    color: '#546E7A',
    fontWeight: '500',
  },
  pinSection: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#37474F',
    textAlign: 'center',
    marginBottom: 20,
  },

  // === Username Step ===
  usernameInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#1565C0',
    borderWidth: 2,
    borderColor: '#BBDEFB',
    marginBottom: 16,
    textAlign: 'center',
  },
  nextButton: {
    backgroundColor: '#1565C0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // === Biometric Button ===
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    gap: 8,
  },
  biometricIcon: {
    fontSize: 24,
  },
  biometricButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  biometricMini: {
    alignItems: 'center',
    paddingTop: 16,
  },
  biometricMiniText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },

  // === Back button ===
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '500',
  },

  // === Username display on PIN step ===
  usernameDisplay: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  usernameDisplayLabel: {
    fontSize: 13,
    color: '#90A4AE',
    marginBottom: 4,
  },
  usernameDisplayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1565C0',
  },

  // === PIN Display ===
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  pinCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#90CAF9',
    backgroundColor: 'white',
  },
  pinCircleFilled: {
    backgroundColor: '#1565C0',
    borderColor: '#1565C0',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  numButton: {
    width: '30%',
    aspectRatio: 1.4,
    borderRadius: 14,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  numButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1565C0',
  },
  actionButton: {
    backgroundColor: '#ECEFF1',
    borderColor: '#CFD8DC',
  },
  actionButtonText: {
    color: '#546E7A',
    fontSize: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#546E7A',
  },
});

export default LoginScreen;
