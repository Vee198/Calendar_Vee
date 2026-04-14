import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = '@calendar_vee_biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = '@calendar_vee_biometric_credentials';

export type BiometricType = 'fingerprint' | 'facial' | 'iris' | 'none';

interface StoredCredentials {
  username: string;
  pin: string;
}

class BiometricService {
  /**
   * Check if device has biometric hardware (Face ID / Fingerprint sensor)
   */
  async isHardwareAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      return compatible;
    } catch {
      return false;
    }
  }

  /**
   * Check if user has registered biometrics on device
   */
  async isEnrolled(): Promise<boolean> {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch {
      return false;
    }
  }

  /**
   * Check if biometric login is fully available
   * (hardware exists + user enrolled + feature enabled in app)
   */
  async isAvailable(): Promise<boolean> {
    const hasHardware = await this.isHardwareAvailable();
    const isEnrolled = await this.isEnrolled();
    const isEnabled = await this.isEnabled();
    return hasHardware && isEnrolled && isEnabled;
  }

  /**
   * Check if device supports biometric but user hasn't enabled in app yet
   */
  async canEnable(): Promise<boolean> {
    const hasHardware = await this.isHardwareAvailable();
    const isEnrolled = await this.isEnrolled();
    return hasHardware && isEnrolled;
  }

  /**
   * Get available biometric types on device
   */
  async getBiometricTypes(): Promise<BiometricType[]> {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const result: BiometricType[] = [];

      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        result.push('fingerprint');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        result.push('facial');
      }
      if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        result.push('iris');
      }

      return result.length > 0 ? result : ['none'];
    } catch {
      return ['none'];
    }
  }

  /**
   * Get display name for biometric type (Thai)
   */
  async getBiometricLabel(): Promise<string> {
    const types = await this.getBiometricTypes();
    if (types.includes('facial')) return 'สแกนใบหน้า (Face ID)';
    if (types.includes('fingerprint')) return 'สแกนลายนิ้วมือ';
    if (types.includes('iris')) return 'สแกนม่านตา';
    return 'Biometric';
  }

  /**
   * Prompt user to authenticate with biometric
   */
  async authenticate(promptMessage?: string): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'สแกนเพื่อเข้าใช้งาน Calendar Vee',
        cancelLabel: 'ใช้ PIN แทน',
        disableDeviceFallback: true, // Don't fall back to device passcode
      });

      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Check if user has enabled biometric login in app settings
   */
  async isEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Enable biometric login and store credentials securely
   */
  async enable(username: string, pin: string): Promise<void> {
    try {
      const credentials: StoredCredentials = { username, pin };
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(
        BIOMETRIC_CREDENTIALS_KEY,
        JSON.stringify(credentials)
      );
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      throw new Error('ไม่สามารถเปิดใช้งาน Biometric ได้');
    }
  }

  /**
   * Disable biometric login and remove stored credentials
   */
  async disable(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
    } catch (error) {
      console.error('Failed to disable biometric:', error);
    }
  }

  /**
   * Get stored credentials (after successful biometric authentication)
   */
  async getStoredCredentials(): Promise<StoredCredentials | null> {
    try {
      const data = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!data) return null;
      return JSON.parse(data) as StoredCredentials;
    } catch {
      return null;
    }
  }

  /**
   * Check if stored credentials exist
   */
  async hasStoredCredentials(): Promise<boolean> {
    const credentials = await this.getStoredCredentials();
    return credentials !== null;
  }
}

export const biometricService = new BiometricService();
export default biometricService;
